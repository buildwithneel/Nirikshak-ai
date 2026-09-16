import os
import io
import uuid
import logging
from abc import ABC, abstractmethod
from typing import Tuple, Optional
import cv2
import numpy as np

logger = logging.getLogger("nirikshak-storage")

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB


class BaseStorageProvider(ABC):
    """Abstract storage provider interface."""

    @abstractmethod
    def save(self, file_bytes: bytes, filename: str, mime_type: str) -> str:
        """Saves file bytes and returns storage key / reference path."""
        pass

    @abstractmethod
    def get(self, file_reference: str) -> Optional[bytes]:
        """Retrieves raw file bytes by reference path."""
        pass

    @abstractmethod
    def delete(self, file_reference: str) -> bool:
        """Deletes file by reference path."""
        pass


class LocalFileSystemStorageProvider(BaseStorageProvider):
    """Local filesystem storage implementation for secure inspection evidence."""

    def __init__(self, base_directory: Optional[str] = None):
        if base_directory is None:
            base_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
        else:
            base_dir = base_directory
        self.base_dir = os.path.abspath(base_dir)
        os.makedirs(self.base_dir, exist_ok=True)
        logger.info(f"Local storage initialized at: {self.base_dir}")

    def save(self, file_bytes: bytes, filename: str, mime_type: str) -> str:
        ext = os.path.splitext(filename)[1].lower() or ".jpg"
        unique_name = f"img_{uuid.uuid4().hex}{ext}"
        target_path = os.path.join(self.base_dir, unique_name)
        with open(target_path, "wb") as f:
            f.write(file_bytes)
        return unique_name

    def get(self, file_reference: str) -> Optional[bytes]:
        # file_reference is filename within uploads directory
        # Prevent directory traversal attacks
        safe_name = os.path.basename(file_reference)
        target_path = os.path.join(self.base_dir, safe_name)
        if not os.path.exists(target_path):
            return None
        with open(target_path, "rb") as f:
            return f.read()

    def delete(self, file_reference: str) -> bool:
        safe_name = os.path.basename(file_reference)
        target_path = os.path.join(self.base_dir, safe_name)
        if os.path.exists(target_path):
            try:
                os.remove(target_path)
                return True
            except Exception as e:
                logger.error(f"Failed to delete stored file {target_path}: {e}")
                return False
        return False

    def get_absolute_path(self, file_reference: str) -> str:
        safe_name = os.path.basename(file_reference)
        return os.path.join(self.base_dir, safe_name)


class StorageService:
    """
    High-level evidence storage manager with strict validation,
    magic byte checking, OpenCV decode verification, and dimension extraction.
    """

    def __init__(self, provider: Optional[BaseStorageProvider] = None):
        self.provider = provider or LocalFileSystemStorageProvider()

    def validate_and_inspect_image(
        self, file_bytes: bytes, filename: str, mime_type: str
    ) -> Tuple[np.ndarray, int, int]:
        """
        Validates file size, extension, MIME type, and decodes with OpenCV.
        Returns: (cv_image_array, width, height)
        Raises: ValueError with user-facing message on invalid image.
        """
        if not file_bytes or len(file_bytes) == 0:
            raise ValueError("Empty image file received. Please provide a valid package photo.")

        if len(file_bytes) > MAX_FILE_SIZE_BYTES:
            max_mb = MAX_FILE_SIZE_BYTES // (1024 * 1024)
            raise ValueError(f"Image is too large. Maximum supported size is {max_mb}MB.")

        # Path traversal sanitization
        safe_filename = os.path.basename(filename).replace("..", "").replace("/", "").replace("\\", "").strip()
        if not safe_filename:
            safe_filename = "package.jpg"

        # Check extension
        ext = os.path.splitext(safe_filename)[1].lower()
        if ext and ext not in ALLOWED_EXTENSIONS:
            raise ValueError(
                f"Unsupported file type '{ext}'. Please upload JPG, JPEG, PNG, or WEBP."
            )

        # Magic binary bytes validation
        is_jpeg = file_bytes[:3] == b"\xff\xd8\xff"
        is_png = file_bytes[:8] == b"\x89PNG\r\n\x1a\n"
        is_webp = len(file_bytes) >= 12 and file_bytes[:4] == b"RIFF" and file_bytes[8:12] == b"WEBP"

        if not (is_jpeg or is_png or is_webp):
            raise ValueError("Invalid image binary format. Uploaded file does not match genuine JPEG, PNG, or WEBP signatures.")

        # Check MIME type
        if mime_type and mime_type.lower() not in ALLOWED_MIME_TYPES:
            if ext not in ALLOWED_EXTENSIONS:
                raise ValueError(
                    f"Unsupported content type '{mime_type}'. Please upload JPG, PNG, or WEBP."
                )

        # OpenCV actual byte decode validation (avoids corrupted files or extension spoofing)
        try:
            nparr = np.frombuffer(file_bytes, np.uint8)
            cv_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if cv_img is None:
                raise ValueError("Corrupted or unreadable image file. Unable to decode visual evidence.")
            h, w = cv_img.shape[:2]
            if w <= 0 or h <= 0:
                raise ValueError("Invalid image dimensions detected.")
            return cv_img, w, h
        except Exception as e:
            if isinstance(e, ValueError):
                raise
            raise ValueError(f"Image validation failed: {str(e)}")

    def store_image(
        self, file_bytes: bytes, filename: str, mime_type: str
    ) -> Tuple[str, int, int]:
        """
        Validates and stores package evidence.
        Returns: (file_reference, width, height)
        """
        cv_img, w, h = self.validate_and_inspect_image(file_bytes, filename, mime_type)
        file_ref = self.provider.save(file_bytes, filename, mime_type)
        return file_ref, w, h

    def retrieve_image_bytes(self, file_reference: str) -> Optional[bytes]:
        return self.provider.get(file_reference)

    def delete_image(self, file_reference: str) -> bool:
        return self.provider.delete(file_reference)

    def get_absolute_path(self, file_reference: str) -> str:
        if hasattr(self.provider, "get_absolute_path"):
            return self.provider.get_absolute_path(file_reference)
        return file_reference


def create_storage_provider() -> BaseStorageProvider:
    """Factory creating SupabaseStorageProvider if configured, otherwise LocalFileSystemStorageProvider."""
    supabase_url = os.environ.get("SUPABASE_URL")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if supabase_url and service_role_key:
        try:
            from .supabase_provider import SupabaseStorageProvider
            return SupabaseStorageProvider(supabase_url=supabase_url, service_role_key=service_role_key)
        except Exception as e:
            logger.warning(f"Could not initialize SupabaseStorageProvider: {e}. Using local storage.")
    return LocalFileSystemStorageProvider()


# Global singleton storage service
storage_service = StorageService(provider=create_storage_provider())
