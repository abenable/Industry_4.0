import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import joblib
import os
from typing import Tuple, Dict, Any, Optional

class MLModel:
    """
    Machine Learning Model wrapper for Industry 4.0 predictions
    
    This is a sample implementation using Random Forest.
    Replace with your specific model architecture as needed.
    """
    
    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize the ML model
        
        Args:
            model_path: Path to a pre-trained model file
        """
        self.model = None
        self.model_path = model_path or os.path.join(
            os.path.dirname(__file__), 
            "trained", 
            "model.joblib"
        )
        
        # Try to load existing model
        if os.path.exists(self.model_path):
            self.load_model()
        else:
            # Initialize a new model
            self.model = RandomForestClassifier(
                n_estimators=100,
                random_state=42,
                max_depth=10
            )
    
    def train(self, data_path: str) -> Dict[str, Any]:
        """
        Train the model on new data
        
        Args:
            data_path: Path to CSV file with training data
            
        Returns:
            Dictionary with training metrics
        """
        # Load data
        df = pd.read_csv(data_path)
        
        # Assuming last column is target, rest are features
        # Modify this based on your actual data structure
        X = df.iloc[:, :-1].values
        y = df.iloc[:, -1].values
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Train model
        self.model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = self.model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        # Save model
        self.save_model()
        
        return {
            "accuracy": float(accuracy),
            "n_samples": len(df),
            "n_features": X.shape[1]
        }
    
    def predict(self, data: list) -> Tuple[np.ndarray, Optional[float]]:
        """
        Make predictions on new data
        
        Args:
            data: List or array of features
            
        Returns:
            Tuple of (predictions, confidence score)
        """
        if self.model is None:
            raise ValueError("Model not initialized. Please train or load a model first.")
        
        # Convert to numpy array and reshape if needed
        X = np.array(data)
        if X.ndim == 1:
            X = X.reshape(1, -1)
        
        # Make prediction
        predictions = self.model.predict(X)
        
        # Get confidence (probability of predicted class)
        try:
            probabilities = self.model.predict_proba(X)
            confidence = np.max(probabilities, axis=1).mean()
        except AttributeError:
            confidence = None
        
        return predictions, confidence
    
    def save_model(self):
        """Save the trained model to disk"""
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        joblib.dump(self.model, self.model_path)
    
    def load_model(self):
        """Load a pre-trained model from disk"""
        self.model = joblib.load(self.model_path)
    
    def get_info(self) -> Dict[str, Any]:
        """
        Get information about the current model
        
        Returns:
            Dictionary with model information
        """
        if self.model is None:
            return {
                "status": "not_initialized",
                "message": "Model needs to be trained or loaded"
            }
        
        info = {
            "status": "ready",
            "model_type": type(self.model).__name__,
            "model_path": self.model_path,
            "model_exists": os.path.exists(self.model_path)
        }
        
        # Add model-specific info if available
        if hasattr(self.model, 'n_estimators'):
            info['n_estimators'] = self.model.n_estimators
        if hasattr(self.model, 'feature_importances_'):
            info['n_features'] = len(self.model.feature_importances_)
        
        return info
