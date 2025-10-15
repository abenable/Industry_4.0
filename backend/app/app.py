from fastapi import FastAPI, UploadFile, File
from maize_model import load_model, predict_image
import tempfile
import os

app = FastAPI(title="Maize Model API")

# Load model once at startup
model = load_model("maize_model.pth")

@app.get("/")
def home():
    return {"message": "Welcome to the Maize Prediction API!"}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    
    try:
        prediction = predict_image(model, tmp_path)
        return {"prediction": int(prediction)}
    finally:
        # Clean up temporary file
        os.unlink(tmp_path)
