import os
import uuid
import logging
from typing import Optional
import requests
from .service import BaseStorageProvider, LocalFileSystemStorageProvider

logger = logging.getLogger("nirikshak-firebase-storage")


class FirebaseStorageProvider(BaseStorageProvider):
    """
    Production storage provider integrating with Firebase Cloud Storage (Google Cloud Storage).
    Supports buckets for:
      - inspection-images (internal officer evidence)
      - complaint-images (consumer submissions)
      - reports (statutory PDF reports with SHA-256 provenance)
    Features resilient local caching for zero-latency lookups and offline capability.
    """

    def __init__(
        self,
        bucket_name: Optional[str] = None,
        project_id: Optional[str] = None,
    ):
        self.bucket_name = (
            bucket_name
            or os.environ.get("FIREBASE_STORAGE_BUCKET")
            or os.environ.get("VITE_FIREBASE_STORAGE_BUCKET", "")
        ).strip()
        self.project_id = (
            project_id
            or os.environ.get("FIREBASE_PROJECT_ID")
            or os.environ.get("VITE_FIREBASE_PROJECT_ID", "")
        ).strip()

        # Local fallback cache directory for zero-latency retrieval and offline resilience
        self.local_cache = LocalFileSystemStorageProvider()

        # Attempt initializing firebase_admin storage bucket if available
        self._bucket = None
        self._init_firebase_admin()

        if self.is_configured():
            logger.info(
                f"Firebase Storage Provider initialized: Bucket [{self.bucket_name}], Project [{self.project_id}]"
            )
        else:
            logger.info(
                "Firebase Storage bucket not configured; storage provider operating in local cache fallback mode."
            )

    def _init_firebase_admin(self) -> None:
        """Attempts to bind Google Cloud / Firebase Admin storage bucket."""
        try:
            import firebase_admin
            from firebase_admin import storage

            # Check if an app is already initialized
            app = None
            try:
                app = firebase_admin.get_app()
            except ValueError:
                # App not initialized yet; check for credentials
                service_account_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
                service_account_file = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
                options = {}
                if self.bucket_name:
                    options["storageBucket"] = self.bucket_name

                if service_account_json:
                    import json
                    from firebase_admin import credentials
                    cred = credentials.Certificate(json.loads(service_account_json))
                    app = firebase_admin.initialize_app(cred, options)
                elif service_account_file and os.path.exists(service_account_file):
                    from firebase_admin import credentials
                    cred = credentials.Certificate(service_account_file)
                    app = firebase_admin.initialize_app(cred, options)
                elif self.project_id:
                    options["projectId"] = self.project_id
                    app = firebase_admin.initialize_app(options=options)

            if app and self.bucket_name:
                self._bucket = storage.bucket(self.bucket_name)
                logger.info(f"Connected to Firebase Cloud Storage bucket via Admin SDK: {self.bucket_name}")
        except Exception as e:
            logger.debug(f"Firebase Admin SDK bucket binding skipped: {e}")

    def is_configured(self) -> bool:
        """Checks if a valid Firebase Storage bucket name is available."""
        return bool(self.bucket_name)

    def save(self, file_bytes: bytes, filename: str, mime_type: str) -> str:
        """
        Saves file bytes to Firebase Cloud Storage and local fallback cache.
        Returns a persistent reference string: 'firebase://{bucket}/{path}' or local file key.
        """
        # Always write to local storage first for resilience and immediate access
        local_key = self.local_cache.save(file_bytes, filename, mime_type)

        if not self.is_configured():
            return local_key

        ext = os.path.splitext(filename)[1].lower() or ".jpg"
        unique_path = f"evidence/{uuid.uuid4().hex}{ext}"

        # 1. If Admin SDK bucket is connected, upload directly
        if self._bucket:
            try:
                blob = self._bucket.blob(unique_path)
                blob.upload_from_string(file_bytes, content_type=mime_type or "image/jpeg")
                ref = f"firebase://{self.bucket_name}/{unique_path}"
                logger.info(f"File stored in Firebase Storage (Admin): {ref}")
                return ref
            except Exception as e:
                logger.warning(f"Failed Admin SDK upload to Firebase Storage: {e}. Falling back to local.")
                return local_key

        # 2. Upload via Firebase Storage REST API if direct access configured
        try:
            url = f"https://firebasestorage.googleapis.com/v0/b/{self.bucket_name}/o?uploadType=media&name={unique_path}"
            headers = {"Content-Type": mime_type or "application/octet-stream"}
            res = requests.post(url, headers=headers, data=file_bytes, timeout=10)
            if res.status_code in (200, 201):
                ref = f"firebase://{self.bucket_name}/{unique_path}"
                logger.info(f"File stored in Firebase Storage (REST): {ref}")
                return ref
            else:
                logger.warning(
                    f"Firebase Storage REST upload status {res.status_code}: {res.text[:120]}. Using local cache."
                )
                return local_key
        except Exception as e:
            logger.error(f"Error uploading to Firebase Storage: {e}. Using local cache.", exc_info=False)
            return local_key

    def get(self, file_reference: str) -> Optional[bytes]:
        """
        Retrieves raw file bytes from local cache or Firebase Cloud Storage.
        """
        if not file_reference:
            return None

        # Check local cache first (zero latency)
        local_bytes = self.local_cache.get(file_reference)
        if local_bytes:
            return local_bytes

        if file_reference.startswith("firebase://") and self.is_configured():
            try:
                # Format: firebase://{bucket}/{path}
                parts = file_reference.replace("firebase://", "").split("/", 1)
                if len(parts) == 2:
                    bucket_name, blob_path = parts
                    # Try Admin SDK
                    if self._bucket and bucket_name == self.bucket_name:
                        blob = self._bucket.blob(blob_path)
                        return blob.download_as_bytes()

                    # Fallback to Firebase Storage media download URL
                    encoded_path = blob_path.replace("/", "%2F")
                    url = f"https://firebasestorage.googleapis.com/v0/b/{bucket_name}/o/{encoded_path}?alt=media"
                    res = requests.get(url, timeout=10)
                    if res.status_code == 200:
                        return res.content
            except Exception as e:
                logger.error(f"Failed to fetch object from Firebase Storage: {e}")

        return None

    def delete(self, file_reference: str) -> bool:
        """Deletes file from Firebase Storage and local cache."""
        deleted_local = self.local_cache.delete(file_reference)

        if file_reference.startswith("firebase://") and self.is_configured():
            try:
                parts = file_reference.replace("firebase://", "").split("/", 1)
                if len(parts) == 2:
                    bucket_name, blob_path = parts
                    if self._bucket and bucket_name == self.bucket_name:
                        blob = self._bucket.blob(blob_path)
                        blob.delete()
                        return True
                    
                    encoded_path = blob_path.replace("/", "%2F")
                    url = f"https://firebasestorage.googleapis.com/v0/b/{bucket_name}/o/{encoded_path}"
                    res = requests.delete(url, timeout=10)
                    return res.status_code == 200
            except Exception as e:
                logger.error(f"Failed to delete object from Firebase Storage: {e}")

        return deleted_local

    def get_absolute_path(self, file_reference: str) -> str:
        return self.local_cache.get_absolute_path(file_reference)
