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
# In development/demo, default to 'officer.demo,officer.com,gov.com,gov.in,legalmetrology.gov.in'
DEFAULT_OFFICER_DOMAINS = "officer.demo,officer.com,gov.com,gov.in,legalmetrology.gov.in"
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


# Firebase Authentication configuration for ID token verification
FIREBASE_PROJECT_ID = (
    os.environ.get("FIREBASE_PROJECT_ID")
    or os.environ.get("VITE_FIREBASE_PROJECT_ID", "")
).strip()

# In-memory caches for Google x509 certs and verified Firebase tokens
_GOOGLE_CERTS_CACHE: Dict[str, str] = {}
_GOOGLE_CERTS_LAST_FETCH: float = 0.0
_FIREBASE_TOKEN_CACHE: Dict[str, Dict[str, Any]] = {}
GOOGLE_CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"


def _get_google_public_certs() -> Dict[str, str]:
    """Fetches and caches Google's public x509 certificates for Firebase ID token verification."""
    global _GOOGLE_CERTS_CACHE, _GOOGLE_CERTS_LAST_FETCH
    import time
    import requests

    now = time.time()
    # Cache certificates for up to 1 hour (3600 seconds)
    if _GOOGLE_CERTS_CACHE and (now - _GOOGLE_CERTS_LAST_FETCH < 3600):
        return _GOOGLE_CERTS_CACHE

    try:
        res = requests.get(GOOGLE_CERTS_URL, timeout=5)
        if res.status_code == 200:
            _GOOGLE_CERTS_CACHE = res.json()
            _GOOGLE_CERTS_LAST_FETCH = now
            return _GOOGLE_CERTS_CACHE
    except Exception:
        pass
    return _GOOGLE_CERTS_CACHE


def verify_firebase_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verifies a Firebase ID token.
    Supports:
    1. Firebase Admin SDK if initialized.
    2. Direct RS256 cryptographic verification using Google's public x509 certificates.
    Returns normalized payload with 'sub', 'email', 'user_metadata', and 'is_firebase': True.
    """
    if not token or len(token) < 20:
        return None

    import time
    if token in _FIREBASE_TOKEN_CACHE:
        cached = _FIREBASE_TOKEN_CACHE[token]
        exp = cached.get("exp", 0)
        if exp > time.time():
            return cached
        else:
            del _FIREBASE_TOKEN_CACHE[token]

    # 1. Attempt Admin SDK if available
    try:
        import firebase_admin
        from firebase_admin import auth as fb_auth

        firebase_admin.get_app()
        decoded = fb_auth.verify_id_token(token)
        payload = {
            "sub": decoded.get("uid") or decoded.get("sub"),
            "email": decoded.get("email"),
            "user_metadata": {
                "full_name": decoded.get("name"),
                "avatar_url": decoded.get("picture"),
            },
            "exp": decoded.get("exp"),
            "is_firebase": True,
        }
        if len(_FIREBASE_TOKEN_CACHE) > 500:
            _FIREBASE_TOKEN_CACHE.clear()
        _FIREBASE_TOKEN_CACHE[token] = payload
        return payload
    except Exception:
        pass

    # 2. Standalone verification using Google's public certificates & PyJWT
    try:
        unverified_header = jwt.get_unverified_header(token)
        if unverified_header.get("alg") != "RS256":
            return None

        kid = unverified_header.get("kid")
        if not kid:
            return None

        certs = _get_google_public_certs()
        if kid not in certs:
            global _GOOGLE_CERTS_LAST_FETCH
            _GOOGLE_CERTS_LAST_FETCH = 0.0
            certs = _get_google_public_certs()

        cert_pem = certs.get(kid)
        if not cert_pem:
            return None

        options = {"verify_signature": True}
        decode_kwargs: Dict[str, Any] = {
            "algorithms": ["RS256"],
            "options": options,
        }

        if FIREBASE_PROJECT_ID:
            decode_kwargs["audience"] = FIREBASE_PROJECT_ID
            decode_kwargs["issuer"] = f"https://securetoken.google.com/{FIREBASE_PROJECT_ID}"
        else:
            options["verify_aud"] = False
            options["verify_iss"] = False

        decoded = jwt.decode(token, cert_pem, **decode_kwargs)

        iss = decoded.get("iss", "")
        if not iss.startswith("https://securetoken.google.com/"):
            return None

        payload = {
            "sub": decoded.get("user_id") or decoded.get("sub"),
            "email": decoded.get("email"),
            "user_metadata": {
                "full_name": decoded.get("name"),
                "avatar_url": decoded.get("picture"),
            },
            "exp": decoded.get("exp"),
            "is_firebase": True,
        }

        if len(_FIREBASE_TOKEN_CACHE) > 500:
            _FIREBASE_TOKEN_CACHE.clear()
        _FIREBASE_TOKEN_CACHE[token] = payload
        return payload
    except Exception:
        return None


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decodes and validates an access token.
    Supports:
    1. Internal/Local JWT tokens (signed with SECRET_KEY)
    2. Firebase Auth ID tokens (verified against Google's public certificates / Firebase Admin)
    """
    # 1. Try local SECRET_KEY first (standard internal auth & demo sessions)
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

    # 2. Try Firebase ID token verification
    firebase_payload = verify_firebase_token(token)
    if firebase_payload:
        return firebase_payload

    return None
