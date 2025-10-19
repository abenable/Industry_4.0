"""
Model inference using ONNX Runtime
"""

import os
import logging
from typing import Dict, Any, Tuple, Optional
import numpy as np
import onnxruntime as ort

logger = logging.getLogger(__name__)


class ModelInference:
    """
    Handles model loading and inference using ONNX Runtime
    """

    def __init__(self):
        """Initialize inference engine and load models"""
        self.models: Dict[str, ort.InferenceSession] = {}
        self.model_metadata: Dict[str, Dict[str, Any]] = {}

        # Configure ONNX Runtime
        self.session_options = ort.SessionOptions()
        self.session_options.graph_optimization_level = (
            ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        )
        self.session_options.intra_op_num_threads = os.cpu_count() or 4

        # Load models
        self._load_models()

    def _load_models(self):
        """Load all available ONNX models"""
        model_configs = {
            "bean": {
                "path": "models/bean_model.onnx",
                "input_size": (224, 224),
                "classes": ["angular_leaf_spot", "bean_rust", "healthy"],
            },
            "maize": {
                "path": "models/maize_model.onnx",
                "input_size": (224, 224),
                "classes": ["Healthy", "MLB", "MSV"],
            },
        }

        for model_name, config in model_configs.items():
            try:
                model_path = config["path"]

                # Check if model file exists
                if not os.path.exists(model_path):
                    logger.warning(f"Model file not found: {model_path}")
                    logger.info(f"Skipping {model_name} model - file not found")
                    continue

                # Load ONNX model
                session = ort.InferenceSession(
                    model_path,
                    sess_options=self.session_options,
                    providers=["CPUExecutionProvider"],
                )

                self.models[model_name] = session

                # Store metadata
                input_name = session.get_inputs()[0].name
                input_shape = session.get_inputs()[0].shape
                output_name = session.get_outputs()[0].name
                output_shape = session.get_outputs()[0].shape
                channels_first = self._infer_channels_first(input_shape)

                self.model_metadata[model_name] = {
                    "input_name": input_name,
                    "input_shape": input_shape,
                    "output_name": output_name,
                    "output_shape": output_shape,
                    "input_size": config["input_size"],
                    "classes": config["classes"],
                    "num_classes": len(config["classes"]),
                    "channels_first": channels_first,
                }

                logger.info(f"✅ Loaded {model_name} model from {model_path}")
                logger.info(f"   Input: {input_name} {input_shape}")
                logger.info(f"   Output: {output_name} {output_shape}")

            except Exception as e:
                logger.error(f"❌ Failed to load {model_name} model: {e}")
                raise

        if not self.models:
            raise RuntimeError("No models were loaded successfully")

        logger.info(f"Loaded {len(self.models)} model(s): {list(self.models.keys())}")

    def predict(self, image: np.ndarray, model_name: str = "bean") -> Dict[str, Any]:
        """
        Run inference on preprocessed image

        Args:
            image: Preprocessed image array (1, H, W, C)
            model_name: Name of model to use

        Returns:
            Dictionary with prediction results
        """
        if model_name not in self.models:
            raise ValueError(
                f"Model '{model_name}' not found. "
                f"Available models: {list(self.models.keys())}"
            )

        try:
            session = self.models[model_name]
            metadata = self.model_metadata[model_name]

            # Get input/output names
            input_name = metadata["input_name"]
            output_name = metadata["output_name"]

            # Prepare input - align layout with model expectations
            channels_first = metadata.get("channels_first")

            if channels_first is None:
                channels_first = self._infer_channels_first(metadata.get("input_shape"))

            if len(image.shape) == 4:
                height = image.shape[1]
                channels = image.shape[-1]

                if channels_first:
                    # Convert from NHWC to NCHW if necessary
                    if channels in (1, 3) and height != channels:
                        image = np.transpose(image, (0, 3, 1, 2))
                else:
                    # Convert from NCHW to NHWC if necessary
                    if image.shape[1] in (1, 3) and channels not in (1, 3):
                        image = np.transpose(image, (0, 2, 3, 1))

            # Ensure float32
            image = image.astype(np.float32)

            # Run inference
            outputs = session.run([output_name], {input_name: image})

            # Get predictions
            predictions = outputs[0][0]  # Remove batch dimension

            # Get class probabilities
            if len(predictions.shape) == 1:
                # Raw logits or probabilities
                probabilities = self._softmax(predictions)
            else:
                probabilities = predictions

            # Get top prediction
            predicted_idx = int(np.argmax(probabilities))
            confidence = float(probabilities[predicted_idx])
            predicted_class = metadata["classes"][predicted_idx]

            # Get all class probabilities
            class_probabilities = {
                metadata["classes"][i]: float(probabilities[i])
                for i in range(len(metadata["classes"]))
            }

            result = {
                "predicted_class": predicted_class,
                "confidence": confidence,
                "class_probabilities": class_probabilities,
                "disease": predicted_class,  # Alias for backend compatibility
                "crop_type": model_name,
            }

            logger.debug(f"Prediction: {predicted_class} ({confidence:.2%})")

            return result

        except Exception as e:
            logger.error(f"Inference error: {e}", exc_info=True)
            raise RuntimeError(f"Inference failed: {str(e)}")

    def predict_batch(
        self, images: np.ndarray, model_name: str = "bean"
    ) -> list[Dict[str, Any]]:
        """
        Run batch inference

        Args:
            images: Batch of preprocessed images (N, H, W, C)
            model_name: Name of model to use

        Returns:
            List of prediction dictionaries
        """
        results = []
        for i in range(images.shape[0]):
            image = np.expand_dims(images[i], axis=0)
            result = self.predict(image, model_name)
            results.append(result)
        return results

    def get_model_info(self) -> Dict[str, Dict[str, Any]]:
        """Get information about loaded models"""
        return {
            name: {
                "input_shape": meta["input_shape"],
                "output_shape": meta["output_shape"],
                "input_size": meta["input_size"],
                "classes": meta["classes"],
                "num_classes": meta["num_classes"],
                "channels_first": meta.get("channels_first"),
            }
            for name, meta in self.model_metadata.items()
        }

    def get_input_size(self, model_name: str) -> Tuple[int, int]:
        """Get expected input size for a model"""
        if model_name not in self.model_metadata:
            raise ValueError(f"Model '{model_name}' not found")
        return self.model_metadata[model_name]["input_size"]

    @staticmethod
    def _softmax(x: np.ndarray) -> np.ndarray:
        """Apply softmax to convert logits to probabilities"""
        exp_x = np.exp(x - np.max(x))
        return exp_x / exp_x.sum()

    @staticmethod
    def _dim_to_int(dim: Any) -> Optional[int]:
        """Extract integer value from ONNX dimension descriptor"""
        if isinstance(dim, int):
            return dim
        if hasattr(dim, "dim_value") and isinstance(dim.dim_value, int):
            return int(dim.dim_value)
        return None

    @classmethod
    def _infer_channels_first(cls, shape: Optional[Tuple[Any, ...]]) -> Optional[bool]:
        """Infer whether the model expects channels-first tensors"""
        if not isinstance(shape, (list, tuple)) or len(shape) != 4:
            return None

        second_dim = cls._dim_to_int(shape[1])
        last_dim = cls._dim_to_int(shape[-1])

        if second_dim in (1, 3) and last_dim not in (1, 3):
            return True
        if last_dim in (1, 3) and second_dim not in (1, 3):
            return False

        # Ambiguous layout; return None so caller can decide based on runtime input
        return None

    def cleanup(self):
        """Cleanup resources"""
        logger.info("Cleaning up model resources...")
        self.models.clear()
        self.model_metadata.clear()
