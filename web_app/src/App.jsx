import React, { useState, useEffect } from 'react';
import { getModelInfo, makePrediction } from './services/api';
import PredictionForm from './components/PredictionForm';
import ModelInfo from './components/ModelInfo';
import './App.css';

function App() {
  const [modelInfo, setModelInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadModelInfo();
  }, []);

  const loadModelInfo = async () => {
    try {
      const info = await getModelInfo();
      setModelInfo(info);
    } catch (err) {
      console.error('Error loading model info:', err);
    }
  };

  const handlePrediction = async (inputData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await makePrediction(inputData);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Industry 4.0 ML Platform</h1>
        <p>Machine Learning Predictions for Industry 4.0</p>
      </header>
      
      <main className="App-main">
        <div className="container">
          <ModelInfo info={modelInfo} onRefresh={loadModelInfo} />
          <PredictionForm 
            onPredict={handlePrediction}
            loading={loading}
            error={error}
          />
        </div>
      </main>
      
      <footer className="App-footer">
        <p>&copy; 2024 Industry 4.0 Hackathon Project</p>
      </footer>
    </div>
  );
}

export default App;
