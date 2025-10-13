import React from 'react';

function ModelInfo({ info, onRefresh }) {
  if (!info) {
    return (
      <div className="card">
        <h2>Model Information</h2>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Model Information</h2>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ marginBottom: '0.5rem' }}>
          <strong>Status:</strong>{' '}
          <span style={{ 
            color: info.status === 'ready' ? '#2e7d32' : '#d32f2f',
            fontWeight: 'bold'
          }}>
            {info.status}
          </span>
        </div>
        {info.model_type && (
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>Model Type:</strong> {info.model_type}
          </div>
        )}
        {info.n_features && (
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>Features:</strong> {info.n_features}
          </div>
        )}
        {info.n_estimators && (
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>Estimators:</strong> {info.n_estimators}
          </div>
        )}
        {info.message && (
          <div style={{ 
            marginTop: '0.5rem',
            padding: '0.5rem',
            backgroundColor: '#fff3e0',
            borderRadius: '4px'
          }}>
            {info.message}
          </div>
        )}
      </div>
      <button onClick={onRefresh}>
        Refresh
      </button>
    </div>
  );
}

export default ModelInfo;
