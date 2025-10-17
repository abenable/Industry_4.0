"""
Script to convert TensorFlow/Keras and PyTorch models to ONNX format

Usage:
    python convert_models.py --keras models/Bean_Classifier_Best_Model.keras --output models/bean_model.onnx
    python convert_models.py --pytorch models/maize_model.pth --output models/maize_model.onnx
"""

import argparse
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def convert_keras_to_onnx(
    keras_model_path: str, output_path: str, input_shape: tuple = (1, 224, 224, 3)
):
    """
    Convert Keras/TensorFlow model to ONNX

    Args:
        keras_model_path: Path to Keras model file (.keras or .h5)
        output_path: Path to save ONNX model
        input_shape: Expected input shape (batch, height, width, channels)
    """
    try:
        import tensorflow as tf
        import tf2onnx

        logger.info(f"Loading Keras model from: {keras_model_path}")
        # Keras optimizers saved with jit/is_legacy flags fail to deserialize on newer TF versions.
        model = tf.keras.models.load_model(keras_model_path, compile=False)

        # Older tf2onnx expects Sequential models to expose output_names.
        if not hasattr(model, "output_names"):
            try:
                model.output_names = [tensor.name.split(":")[0] for tensor in model.outputs]
            except Exception:
                model.output_names = ["output"]

        logger.info("Model architecture:")
        model.summary()

        # Get input shape from model if possible
        if hasattr(model, "input_shape"):
            input_shape = model.input_shape
            logger.info(f"Using model input shape: {input_shape}")

        # Convert to ONNX
        logger.info("Converting to ONNX format...")

        # Create spec for input
        input_signature = [tf.TensorSpec(input_shape, tf.float32, name="input")]

        # Convert
        onnx_model, _ = tf2onnx.convert.from_keras(
            model, input_signature=input_signature, opset=13, output_path=output_path
        )

        logger.info(f"✅ Successfully converted to ONNX: {output_path}")
        logger.info(f"   Input shape: {input_shape}")
        logger.info(
            f"   Model size: {os.path.getsize(output_path) / 1024 / 1024:.2f} MB"
        )

        return True

    except ImportError as e:
        logger.error(f"Missing dependencies: {e}")
        logger.error("Install with: pip install tensorflow tf2onnx")
        return False
    except Exception as e:
        logger.error(f"Conversion failed: {e}", exc_info=True)
        return False


def convert_pytorch_to_onnx(
    pytorch_model_path: str,
    output_path: str,
    input_shape: tuple = (1, 3, 224, 224),
    model_class=None,
):
    """
    Convert PyTorch model to ONNX

    Args:
        pytorch_model_path: Path to PyTorch model file (.pth or .pt)
        output_path: Path to save ONNX model
        input_shape: Expected input shape (batch, channels, height, width)
        model_class: PyTorch model class (if None, will try to load state dict)
    """
    try:
        import torch
        import torchvision.models as models

        logger.info(f"Loading PyTorch model from: {pytorch_model_path}")

        # Create dummy input
        dummy_input = torch.randn(*input_shape)

        # Load model
        if model_class is not None:
            model = model_class()
            model.load_state_dict(torch.load(pytorch_model_path, map_location="cpu"))
        else:
            # Try to load as entire model
            try:
                model = torch.load(pytorch_model_path, map_location="cpu")
            except Exception:
                # If that fails, create a resnet18 and load state dict
                logger.info("Trying with ResNet18 architecture...")
                model = models.resnet18(pretrained=False)
                # Modify final layer based on state dict
                state_dict = torch.load(pytorch_model_path, map_location="cpu")

                # Get number of classes from state dict
                if "fc.weight" in state_dict:
                    num_classes = state_dict["fc.weight"].shape[0]
                    model.fc = torch.nn.Linear(model.fc.in_features, num_classes)

                model.load_state_dict(state_dict)

        model.eval()

        # Export to ONNX
        logger.info("Converting to ONNX format...")
        torch.onnx.export(
            model,
            dummy_input,
            output_path,
            export_params=True,
            opset_version=13,
            do_constant_folding=True,
            input_names=["input"],
            output_names=["output"],
            dynamic_axes={"input": {0: "batch_size"}, "output": {0: "batch_size"}},
        )

        logger.info(f"✅ Successfully converted to ONNX: {output_path}")
        logger.info(f"   Input shape: {input_shape}")
        logger.info(
            f"   Model size: {os.path.getsize(output_path) / 1024 / 1024:.2f} MB"
        )

        return True

    except ImportError as e:
        logger.error(f"Missing dependencies: {e}")
        logger.error("Install with: pip install torch torchvision")
        return False
    except Exception as e:
        logger.error(f"Conversion failed: {e}", exc_info=True)
        return False


def verify_onnx_model(model_path: str):
    """Verify ONNX model is valid"""
    try:
        import onnx
        import onnxruntime as ort

        logger.info(f"Verifying ONNX model: {model_path}")

        # Load and check model
        model = onnx.load(model_path)
        onnx.checker.check_model(model)
        logger.info("✅ ONNX model is valid")

        # Test with ONNX Runtime
        session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])

        # Print input/output info
        logger.info("Input info:")
        for input_info in session.get_inputs():
            logger.info(
                f"  - {input_info.name}: {input_info.shape} ({input_info.type})"
            )

        logger.info("Output info:")
        for output_info in session.get_outputs():
            logger.info(
                f"  - {output_info.name}: {output_info.shape} ({output_info.type})"
            )

        return True

    except ImportError as e:
        logger.error(f"Missing dependencies: {e}")
        logger.error("Install with: pip install onnx onnxruntime")
        return False
    except Exception as e:
        logger.error(f"Verification failed: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Convert ML models to ONNX format")
    parser.add_argument("--keras", type=str, help="Path to Keras model (.keras or .h5)")
    parser.add_argument(
        "--pytorch", type=str, help="Path to PyTorch model (.pth or .pt)"
    )
    parser.add_argument(
        "--output", type=str, required=True, help="Output ONNX model path"
    )
    parser.add_argument("--input-height", type=int, default=224, help="Input height")
    parser.add_argument("--input-width", type=int, default=224, help="Input width")
    parser.add_argument(
        "--verify", action="store_true", help="Verify ONNX model after conversion"
    )

    args = parser.parse_args()

    if args.keras:
        input_shape = (1, args.input_height, args.input_width, 3)  # NHWC
        success = convert_keras_to_onnx(args.keras, args.output, input_shape)
    elif args.pytorch:
        input_shape = (1, 3, args.input_height, args.input_width)  # NCHW
        success = convert_pytorch_to_onnx(args.pytorch, args.output, input_shape)
    else:
        parser.error("Either --keras or --pytorch must be specified")
        return

    if success and args.verify:
        verify_onnx_model(args.output)


if __name__ == "__main__":
    main()
