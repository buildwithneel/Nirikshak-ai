import os
import uuid
import logging
from typing import Optional
import requests
from .service import BaseStorageProvider, LocalFileSystemStorageProvider

logger = logging.getLogger("nirikshak-supabase-storage")


class SupabaseStorageProvider(BaseStorageProvider):
    """
    Production storage provider integrating with Supabase Storage REST API.
    Manages private buckets:
      - inspection-images (internal officer evidence)
      - complaint-images (consumer submissions)
      - reports (statutory PDF reports with SHA-256 provenance)
    """

    def __init__(
        self,
        supabase_url: Optional[str] = None,
        service_role_key: Optional[str] = None,
        default_bucket: Optional[str] = None,
    ):
        self.supabase_url = (supabase_url or os.environ.get("SUPABASE_URL", "")).rstrip("/")
        self.service_role_key = service_role_key or os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
        self.default_bucket = default_bucket or os.environ.get("SUPABASE_BUCKET_INSPECTIONS", "inspection-images")
        self.reports_bucket = os.environ.get("SUPABASE_BUCKET_REPORTS", "reports")
        self.complaints_bucket = os.environ.get("SUPABASE_BUCKET_COMPLAINTS", "complaint-images")

        # Local fallback cache directory for zero-latency retrieval and offline resilience
        self.local_cache = LocalFileSystemStorageProvider()

        if self.is_configured():
            logger.info(f"Supabase Storage Provider initialized: {self.supabase_url} [Bucket: {self.default_bucket}]")
        else:
            logger.info("Supabase credentials not set; storage provider operating in local fallback mode.")

    def is_configured(self) -> bool:
        """Checks if valid Supabase URL and service role key are available."""
        return bool(self.supabase_url and self.service_role_key)

    def _get_headers(self, content_type: Optional[str] = None) -> dict:
        headers = {
            "Authorization": f"Bearer {self.service_role_key}",
            "apikey": self.service_role_key,
        }
        if content_type:
            headers["Content-Type"] = content_type
        return headers

    def save(self, file_bytes: bytes, filename: str, mime_type: str) -> str:
        """
        Saves file bytes to Supabase Storage (and local fallback cache).
        Returns a persistent reference string: 'supabase://{bucket}/{path}' or local file key.
        """
        # Always write to local storage first for resilience and offline support
        local_key = self.local_cache.save(file_bytes, filename, mime_type)

        if not self.is_configured():
            return local_key

        # Determine target bucket based on file extension or filename
        ext = os.path.splitext(filename)[1].lower() or ".jpg"
        if ext == ".pdf":
            bucket = self.reports_bucket
        elif "complaint" in filename.lower():
            bucket = self.complaints_bucket
        else:
            bucket = self.default_bucket

        unique_path = f"{uuid.uuid4().hex}{ext}"

        try:
            upload_url = f"{self.supabase_url}/storage/v1/object/{bucket}/{unique_path}"
            headers = self._get_headers(content_type=mime_type or "application/octet-stream")

            res = requests.post(upload_url, headers=headers, data=file_bytes, timeout=10)
            if res.status_code in (200, 201):
                ref = f"supabase://{bucket}/{unique_path}"
                logger.info(f"File stored in Supabase Storage: {ref}")
                return ref
            else:
                logger.warning(f"Supabase storage upload returned status {res.status_code}: {res.text}. Falling back to local.")
                return local_key
        except Exception as e:
            logger.error(f"Error uploading to Supabase Storage: {e}. Falling back to local storage.", exc_info=False)
            return local_key

    def get(self, file_reference: str) -> Optional[bytes]:
        """
        Retrieves raw file bytes from Supabase Storage or local cache.
        """
        if not file_reference:
            return None

        # Check local cache first
        local_bytes = self.local_cache.get(file_reference)
        if local_bytes:
            return local_bytes

        if file_reference.startswith("supabase://") and self.is_configured():
            try:
                # Parse bucket and path
                parts = file_reference.replace("supabase://", "").split("/", 1)
                if len(parts) == 2:
                    bucket, path = parts
                    download_url = f"{self.supabase_url}/storage/v1/object/authenticated/{bucket}/{path}"
                    headers = self._get_headers()
                    res = requests.get(download_url, headers=headers, timeout=10)
                    if res.status_code == 200:
                        return res.content
            except Exception as e:
                logger.error(f"Failed to fetch object from Supabase Storage: {e}")

        return None

    def delete(self, file_reference: str) -> bool:
        """Deletes file from Supabase Storage and local cache."""
        deleted_local = self.local_cache.delete(file_reference)

        if file_reference.startswith("supabase://") and self.is_configured():
            try:
                parts = file_reference.replace("supabase://", "").split("/", 1)
                if len(parts) == 2:
                    bucket, path = parts
                    delete_url = f"{self.supabase_url}/storage/v1/object/{bucket}"
                    headers = self._get_headers(content_type="application/json")
                    res = requests.delete(delete_url, headers=headers, json={"prefixes": [path]}, timeout=10)
                    return res.status_code == 200
            except Exception as e:
                logger.error(f"Failed to delete object from Supabase Storage: {e}")

        return deleted_local

    def get_absolute_path(self, file_reference: str) -> str:
        return self.local_cache.get_absolute_path(file_reference)
