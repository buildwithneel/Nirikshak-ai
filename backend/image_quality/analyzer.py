"""
Deterministic Image Quality Analysis for Packaged Commodity Evidence.
Performs quantitative OpenCV checks for blur, brightness, contrast, and resolution
to assist officers in capturing legible statutory evidence.
"""

from typing import Dict, Any, Tuple
import cv2
import numpy as np


class ImageQualityAnalyzer:
    """Evaluates packaging evidence clarity before OCR processing."""

    BLUR_THRESHOLD = 75.0          # Laplacian variance below this is considered blurred
    LOW_CONTRAST_THRESHOLD = 32.0  # Grayscale standard deviation
    MIN_BRIGHTNESS = 40.0          # Mean pixel value below this is underexposed
    MAX_BRIGHTNESS = 225.0         # Mean pixel value above this has severe glare
    MIN_RECOMMENDED_DIM = 400      # Minimum width or height in pixels

    @classmethod
    def analyze_bytes(cls, file_bytes: bytes) -> Dict[str, Any]:
        """Analyzes raw image bytes and returns structured clarity metrics."""
        try:
            nparr = np.frombuffer(file_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                return {
                    "quality": "POOR",
                    "blur_detected": True,
                    "low_contrast": True,
                    "lighting_issue": True,
                    "blur_score": 0.0,
                    "contrast_score": 0.0,
                    "brightness_score": 0.0,
                    "resolution": "0x0",
                    "recommendation": "Unable to decode image. Please capture a valid JPEG or PNG photograph.",
                    "is_acceptable": False,
                }
            return cls.analyze_cv2(img)
        except Exception as e:
            return {
                "quality": "UNKNOWN",
                "blur_detected": False,
                "low_contrast": False,
                "lighting_issue": False,
                "blur_score": 0.0,
                "contrast_score": 0.0,
                "brightness_score": 0.0,
                "resolution": "0x0",
                "recommendation": f"Quality evaluation error: {str(e)}",
                "is_acceptable": True,
            }

    @classmethod
    def analyze_cv2(cls, img: np.ndarray) -> Dict[str, Any]:
        """Performs deterministic OpenCV calculations on decoded image."""
        h, w = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # 1. Blur Detection using Laplacian Variance
        laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        blur_detected = laplacian_var < cls.BLUR_THRESHOLD

        # 2. Brightness Analysis
        mean_brightness = float(np.mean(gray))
        too_dark = mean_brightness < cls.MIN_BRIGHTNESS
        too_bright = mean_brightness > cls.MAX_BRIGHTNESS
        lighting_issue = too_dark or too_bright

        # 3. Contrast Analysis
        std_contrast = float(np.std(gray))
        low_contrast = std_contrast < cls.LOW_CONTRAST_THRESHOLD

        # 4. Dimension Check
        low_res = (w < cls.MIN_RECOMMENDED_DIM) or (h < cls.MIN_RECOMMENDED_DIM)

        # Determine overall grade
        defects = sum([1 if blur_detected else 0, 1 if lighting_issue else 0, 1 if low_contrast else 0, 1 if low_res else 0])

        if defects == 0:
            quality = "GOOD"
            recommendation = "Image clarity and illumination are optimal for statutory text extraction."
        elif defects == 1:
            quality = "MODERATE"
            if blur_detected:
                recommendation = "Minor motion blur detected: stabilize device camera for sharper text lines."
            elif too_dark:
                recommendation = "Underexposed image: increase ambient lighting or enable device flash."
            elif too_bright:
                recommendation = "Surface glare detected: angle camera slightly away from direct reflections."
            elif low_contrast:
                recommendation = "Low packaging contrast: ensure background doesn't blend with packaging face."
            else:
                recommendation = "Resolution is low: hold camera closer to fill frame with package panel."
        else:
            quality = "NEEDS_IMPROVEMENT"
            recs = []
            if blur_detected:
                recs.append("reduce motion blur")
            if lighting_issue:
                recs.append("improve lighting")
            if low_contrast:
                recs.append("increase contrast")
            recommendation = f"Suboptimal image quality ({', '.join(recs)}). Recommended to retake photograph for reliable verification."

        return {
            "quality": quality,
            "blur_detected": blur_detected,
            "low_contrast": low_contrast,
            "lighting_issue": lighting_issue,
            "low_resolution": low_res,
            "blur_score": round(laplacian_var, 1),
            "contrast_score": round(std_contrast, 1),
            "brightness_score": round(mean_brightness, 1),
            "resolution": f"{w}x{h}",
            "recommendation": recommendation,
            "is_acceptable": quality != "POOR",
        }

    # Backward-compatible class alias
    analyze = analyze_bytes
