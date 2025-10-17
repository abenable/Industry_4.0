"""
FastAPI Inference API for Crop Disease Classification
Uses ONNX Runtime for efficient inference
"""

import os
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from models.inference import ModelInference
from utils.image_processing import preprocess_image
from config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Global model inference instance
model_inference = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifecycle manager for FastAPI application
    Loads models on startup and cleans up on shutdown
    """
    global model_inference

    logger.info("Starting up inference API...")

    try:
        # Initialize model inference
        model_inference = ModelInference()
        logger.info("✅ Models loaded successfully")
    except Exception as e:
        logger.error(f"❌ Failed to load models: {e}")
        raise

    yield

    # Cleanup on shutdown
    logger.info("Shutting down inference API...")
    if model_inference:
        model_inference.cleanup()


# Create FastAPI application
app = FastAPI(
    title="AgriV AI Inference API",
    description="AI-powered crop disease detection and classification using ONNX Runtime",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "message": "AgriV AI Inference API",
        "version": "1.0.0",
        "models_loaded": model_inference is not None,
        "available_models": list(model_inference.models.keys())
        if model_inference
        else [],
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    if model_inference is None:
        raise HTTPException(status_code=503, detail="Models not loaded")

    return {
        "status": "healthy",
        "models": {
            name: {
                "loaded": True,
                "input_shape": info.get("input_shape"),
                "output_shape": info.get("output_shape"),
            }
            for name, info in model_inference.get_model_info().items()
        },
    }


@app.post("/predict")
async def predict(
    file: UploadFile = File(...), model_name: str = "bean"
) -> Dict[str, Any]:
    """
    Predict crop disease from uploaded image

    Args:
        file: Image file (JPG, PNG)
        model_name: Model to use ('bean' or 'maize')

    Returns:
        Dictionary with prediction results
    """
    if model_inference is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {file.content_type}. Please upload an image file.",
        )

    try:
        logger.info(f"Processing image: {file.filename} with model: {model_name}")

        # Read image file
        image_bytes = await file.read()

        # Preprocess image
        processed_image = preprocess_image(
            image_bytes, target_size=model_inference.get_input_size(model_name)
        )

        # Run inference
        result = model_inference.predict(processed_image, model_name)

        # Add metadata
        result["model"] = model_name
        result["filename"] = file.filename

        logger.info(
            f"✅ Prediction successful: {result['predicted_class']} ({result['confidence']:.2%})"
        )

        return result

    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Prediction error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.post("/predict/batch")
async def predict_batch(
    files: list[UploadFile] = File(...), model_name: str = "bean"
) -> Dict[str, Any]:
    """
    Batch prediction for multiple images

    Args:
        files: List of image files
        model_name: Model to use ('bean' or 'maize')

    Returns:
        Dictionary with batch prediction results
    """
    if model_inference is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 images per batch")

    results = []
    errors = []

    for file in files:
        try:
            # Validate file type
            if not file.content_type.startswith("image/"):
                errors.append(
                    {
                        "filename": file.filename,
                        "error": f"Invalid file type: {file.content_type}",
                    }
                )
                continue

            # Read and process image
            image_bytes = await file.read()
            processed_image = preprocess_image(
                image_bytes, target_size=model_inference.get_input_size(model_name)
            )

            # Run inference
            result = model_inference.predict(processed_image, model_name)
            result["filename"] = file.filename
            results.append(result)

        except Exception as e:
            logger.error(f"Error processing {file.filename}: {e}")
            errors.append({"filename": file.filename, "error": str(e)})

    return {
        "model": model_name,
        "total_files": len(files),
        "successful": len(results),
        "failed": len(errors),
        "results": results,
        "errors": errors if errors else None,
    }


@app.get("/models")
async def list_models():
    """List available models and their information"""
    if model_inference is None:
        raise HTTPException(status_code=503, detail="Models not loaded")

    return {"models": model_inference.get_model_info()}


@app.get("/models/{model_name}")
async def get_model_info(model_name: str):
    """Get detailed information about a specific model"""
    if model_inference is None:
        raise HTTPException(status_code=503, detail="Models not loaded")

    info = model_inference.get_model_info().get(model_name)
    if not info:
        raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found")

    return info


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info",
    )
