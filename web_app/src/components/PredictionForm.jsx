import React, { useState } from 'react';

function PredictionForm({ onPredict, loading, error }) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResult(null);

    try {
      // Parse comma-separated input
      const data = input
        .split(',')
        .map(v => parseFloat(v.trim()))
        .filter(v => !isNaN(v));

      if (data.length === 0) {
        alert('Please enter valid numeric values separated by commas');
        return;
      }

      const prediction = await onPredict(data);
      setResult(prediction);
    } catch (err) {
      console.error('Prediction error:', err);
    }
  };

  return (
    <div className="card">
      <h2>Make Prediction</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="input-data" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Input Data (comma-separated values):
          </label>
          <textarea
            id="input-data"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g., 1.2, 3.4, 5.6, 7.8"
            rows={4}
            disabled={loading}
          />
        </div>
        
        <button type="submit" disabled={loading || !input.trim()}>
          {loading ? 'Predicting...' : 'Predict'}
        </button>
      </form>

      {error && (
        <div className="error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className="result">
          <h3>Prediction Result</h3>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>Prediction:</strong> {JSON.stringify(result.prediction)}
          </div>
          {result.confidence && (
            <div>
              <strong>Confidence:</strong> {(result.confidence * 100).toFixed(2)}%
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PredictionForm;
