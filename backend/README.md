# Backend Quick Start

## Installation

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Linux/Mac:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Running the Server

```bash
# From the app directory
cd app
python main.py
```

Or using uvicorn directly:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Testing the API

Test health endpoint:
```bash
curl http://localhost:8000/health
```

Test prediction endpoint:
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"data": [1, 2, 3, 4]}'
```

## Model Training

To train a new model, prepare a CSV file with your data (last column should be the target variable) and run:

```bash
curl -X POST http://localhost:8000/train \
  -F "file=@your_data.csv"
```

## Customizing the Model

Edit `models/ml_model.py` to:
- Change the ML algorithm
- Adjust model parameters
- Add preprocessing steps
- Implement custom prediction logic
