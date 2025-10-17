"""
Image preprocessing utilities for inference
"""

import io
import logging
from typing import Tuple, Optional
import numpy as np
from PIL import Image
import cv2

logger = logging.getLogger(__name__)


def preprocess_image(
    image_bytes: bytes,
    target_size: Tuple[int, int] = (224, 224),
    normalize: bool = True,
) -> np.ndarray:
    """
    Preprocess image for model inference

    Args:
        image_bytes: Raw image bytes
        target_size: Target size (height, width)
        normalize: Whether to normalize pixel values to [0, 1]

    Returns:
        Preprocessed image as numpy array with shape (1, height, width, channels)
    """
    try:
        # Open image
        image = Image.open(io.BytesIO(image_bytes))

        # Convert to RGB if needed
        if image.mode != "RGB":
            image = image.convert("RGB")

        # Resize image
        image = image.resize(target_size, Image.Resampling.LANCZOS)

        # Convert to numpy array
        img_array = np.array(image, dtype=np.float32)

        # Normalize if requested
        if normalize:
            img_array = img_array / 255.0

        # Add batch dimension (1, height, width, channels)
        img_array = np.expand_dims(img_array, axis=0)

        logger.debug(f"Preprocessed image shape: {img_array.shape}")

        return img_array

    except Exception as e:
        logger.error(f"Error preprocessing image: {e}")
        raise ValueError(f"Failed to preprocess image: {str(e)}")


def preprocess_image_cv2(
    image_bytes: bytes,
    target_size: Tuple[int, int] = (224, 224),
    normalize: bool = True,
) -> np.ndarray:
    """
    Preprocess image using OpenCV (alternative method)

    Args:
        image_bytes: Raw image bytes
        target_size: Target size (height, width)
        normalize: Whether to normalize pixel values

    Returns:
        Preprocessed image as numpy array
    """
    try:
        # Decode image
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise ValueError("Failed to decode image")

        # Convert BGR to RGB
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        # Resize
        image = cv2.resize(image, target_size, interpolation=cv2.INTER_LANCZOS4)

        # Convert to float32
        img_array = image.astype(np.float32)

        # Normalize
        if normalize:
            img_array = img_array / 255.0

        # Add batch dimension
        img_array = np.expand_dims(img_array, axis=0)

        return img_array

    except Exception as e:
        logger.error(f"Error preprocessing image with CV2: {e}")
        raise ValueError(f"Failed to preprocess image: {str(e)}")


def validate_image(
    image_bytes: bytes,
    max_size: int = 10 * 1024 * 1024,
    allowed_formats: Optional[list] = None,
) -> bool:
    """
    Validate image file

    Args:
        image_bytes: Raw image bytes
        max_size: Maximum file size in bytes
        allowed_formats: List of allowed image formats

    Returns:
        True if valid, raises ValueError otherwise
    """
    if allowed_formats is None:
        allowed_formats = ["JPEG", "PNG", "JPG"]

    # Check file size
    if len(image_bytes) > max_size:
        raise ValueError(
            f"Image too large. Maximum size is {max_size / 1024 / 1024:.1f}MB"
        )

    try:
        # Try to open image
        image = Image.open(io.BytesIO(image_bytes))

        # Check format
        if image.format.upper() not in [fmt.upper() for fmt in allowed_formats]:
            raise ValueError(
                f"Unsupported image format: {image.format}. Allowed: {allowed_formats}"
            )

        # Check if image is corrupted
        image.verify()

        return True

    except Exception as e:
        raise ValueError(f"Invalid image file: {str(e)}")


def augment_image(img_array: np.ndarray, augmentation_type: str = "none") -> np.ndarray:
    """
    Apply augmentation to image (for testing or ensemble predictions)

    Args:
        img_array: Image array
        augmentation_type: Type of augmentation ('none', 'flip', 'rotate', 'brighten')

    Returns:
        Augmented image array
    """
    if augmentation_type == "none":
        return img_array

    # Remove batch dimension for processing
    img = img_array[0]

    if augmentation_type == "flip":
        img = np.fliplr(img)
    elif augmentation_type == "rotate":
        img = np.rot90(img)
    elif augmentation_type == "brighten":
        img = np.clip(img * 1.2, 0, 1)

    # Add batch dimension back
    return np.expand_dims(img, axis=0)
