from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from typing import Optional
import sys
import os

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.ml_model import MLModel

app = FastAPI(
    title="Industry 4.0 ML API",
    description="Machine Learning API for Industry 4.0 Hackathon Project",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize ML model
ml_model = MLModel()

class PredictionRequest(BaseModel):
    """Request model for predictions"""
    data: list
    
class PredictionResponse(BaseModel):
    """Response model for predictions"""
    prediction: list
    confidence: Optional[float] = None

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to Industry 4.0 ML API",
        "status": "active",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """
    Make predictions using the ML model
    
    Args:
        request: PredictionRequest with data to predict
        
    Returns:
        PredictionResponse with prediction results
    """
    try:
        prediction, confidence = ml_model.predict(request.data)
        return PredictionResponse(
            prediction=prediction.tolist() if hasattr(prediction, 'tolist') else prediction,
            confidence=float(confidence) if confidence is not None else None
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.post("/train")
async def train_model(file: UploadFile = File(...)):
    """
    Train/update the ML model with new data
    
    Args:
        file: CSV file with training data
        
    Returns:
        Training status and metrics
    """
    try:
        contents = await file.read()
        # Save temporary file
        temp_path = f"/tmp/{file.filename}"
        with open(temp_path, "wb") as f:
            f.write(contents)
        
        # Train model
        metrics = ml_model.train(temp_path)
        
        # Clean up
        os.remove(temp_path)
        
        return {
            "status": "success",
            "message": "Model trained successfully",
            "metrics": metrics
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training error: {str(e)}")

@app.get("/model/info")
async def model_info():
    """Get information about the current model"""
    return ml_model.get_info()

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
