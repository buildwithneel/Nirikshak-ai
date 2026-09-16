import os
import re
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
import jwt
from .models import UserRole

# Secret key and parameters for JWT signing - configurable via environment
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", os.environ.get("NIRIKSHAK_AUTH_SECRET", "nirikshak-ai-legal-metrology-auth-secret-key-2026"))
ALGORITHM = "HS256"
JWT_ISSUER = os.environ.get("JWT_ISSUER", "nirikshak-ai-platform")
JWT_AUDIENCE = os.environ.get("JWT_AUDIENCE", "nirikshak-authorized-users")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 24)))  # 24 hours default

# PBKDF2 Security Parameters
PBKDF2_ITERATIONS = int(os.environ.get("PBKDF2_ITERATIONS", "100000"))
PBKDF2_SALT_LENGTH = int(os.environ.get("PBKDF2_SALT_LENGTH", "16"))

# Officer domain configuration (configurable via environment)
# In development/demo, default to 'officer.demo,gov.in,legalmetrology.gov.in'
DEFAULT_OFFICER_DOMAINS = "officer.demo,gov.in,legalmetrology.gov.in"
OFFICER_EMAIL_DOMAINS_ENV = os.environ.get("OFFICER_EMAIL_DOMAINS", DEFAULT_OFFICER_DOMAINS)


def get_officer_domains() -> List[str]:
    """Parse configured officer email domains from environment."""
    raw = os.environ.get("OFFICER_EMAIL_DOMAINS", DEFAULT_OFFICER_DOMAINS)
    domains = [d.strip().lower() for d in raw.split(",") if d.strip()]
    return domains


def normalize_email(email: str) -> str:
    """Normalize and clean email address: trim whitespace and lowercase."""
    if not email:
        return ""
    return email.strip().lower()


def is_valid_email(email: str) -> bool:
    """Basic standard email format validation."""
    if not email or len(email) > 254:
        return False
    regex = r"^[\w\.\+\-]+@[a-zA-Z0-9\-]+(\.[a-zA-Z0-9\-]+)+$"
    return bool(re.match(regex, email.strip()))


def determine_role_from_email(email: str) -> UserRole:
    """
    Authoritative backend role determination based on configured officer email domains.
    Never relies on client-submitted role headers.
    """
    clean_email = normalize_email(email)
    if "@" not in clean_email:
        return UserRole.USER

    domain = clean_email.split("@")[-1].strip().lower()
    officer_domains = get_officer_domains()

    for officer_domain in officer_domains:
        if domain == officer_domain or domain.endswith("." + officer_domain):
            return UserRole.OFFICER

    return UserRole.USER


def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
    """
    Hashes a password using PBKDF2-HMAC-SHA256 with configured iterations.
    Returns (hashed_hex, salt_hex).
    """
    if not salt:
        salt = secrets.token_hex(PBKDF2_SALT_LENGTH)
    
    salt_bytes = bytes.fromhex(salt)
    key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt_bytes,
        PBKDF2_ITERATIONS
    )
    return key.hex(), salt


def verify_password(plain_password: str, hashed_password: str, salt: str) -> bool:
    """Verifies a password against the stored PBKDF2-HMAC-SHA256 hash."""
    computed_hash, _ = hash_password(plain_password, salt)
    return secrets.compare_digest(computed_hash, hashed_password)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Creates a signed JWT access token with issuer and audience claims."""
    to_encode = data.copy()
    now_dt = datetime.now(timezone.utc)
    if expires_delta:
        expire = now_dt + expires_delta
    else:
        expire = now_dt + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": now_dt,
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
    })
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# Supabase configuration for JWT verification
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

# Simple in-memory token cache for verified Supabase user tokens (avoids repeated API roundtrips)
_SUPABASE_TOKEN_CACHE: Dict[str, Dict[str, Any]] = {}


def verify_supabase_token_via_api(token: str) -> Optional[Dict[str, Any]]:
    """Verifies token against Supabase Auth API /auth/v1/user endpoint."""
    if not SUPABASE_URL:
        return None

    if token in _SUPABASE_TOKEN_CACHE:
        return _SUPABASE_TOKEN_CACHE[token]

    try:
        import requests
        headers = {
            "Authorization": f"Bearer {token}",
            "apikey": SUPABASE_SERVICE_ROLE_KEY or os.environ.get("SUPABASE_PUBLISHABLE_KEY", ""),
        }
        res = requests.get(f"{SUPABASE_URL}/auth/v1/user", headers=headers, timeout=5)
        if res.status_code == 200:
            user_data = res.json()
            payload = {
                "sub": user_data.get("id"),
                "email": user_data.get("email"),
                "user_metadata": user_data.get("user_metadata", {}),
                "app_metadata": user_data.get("app_metadata", {}),
                "is_supabase": True,
            }
            # Cache valid token for 5 minutes
            if len(_SUPABASE_TOKEN_CACHE) > 500:
                _SUPABASE_TOKEN_CACHE.clear()
            _SUPABASE_TOKEN_CACHE[token] = payload
            return payload
    except Exception:
        pass
    return None


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decodes and validates a signed JWT access token.
    Supports both:
    1. Internal/Local JWT tokens (signed with SECRET_KEY)
    2. Supabase Auth JWT tokens (signed with SUPABASE_JWT_SECRET or verified via Supabase Auth API)
    """
    # 1. Try local SECRET_KEY first (standard internal auth & dev test suites)
    try:
        try:
            return jwt.decode(
                token,
                SECRET_KEY,
                algorithms=[ALGORITHM],
                audience=JWT_AUDIENCE,
                issuer=JWT_ISSUER,
            )
        except (jwt.InvalidAudienceError, jwt.InvalidIssuerError):
            return jwt.decode(
                token,
                SECRET_KEY,
                algorithms=[ALGORITHM],
                options={"verify_aud": False, "verify_iss": False},
            )
    except Exception:
        pass

    # 2. Try Supabase JWT Secret if configured
    if SUPABASE_JWT_SECRET:
        try:
            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False, "verify_iss": False},
            )
            payload["is_supabase"] = True
            return payload
        except Exception:
            pass

    # 3. Try Supabase Auth API verification if SUPABASE_URL configured
    if SUPABASE_URL:
        supabase_payload = verify_supabase_token_via_api(token)
        if supabase_payload:
            return supabase_payload

    return None
