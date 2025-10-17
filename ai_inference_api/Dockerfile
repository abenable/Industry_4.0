FROM python:3.11-slim-bullseye

WORKDIR /app

# Runtime environment tweaks for production
ENV PYTHONDONTWRITEBYTECODE=1 \
  PYTHONUNBUFFERED=1 \
  UVICORN_HOST=0.0.0.0 \
  UVICORN_PORT=8000 \
  UVICORN_WORKERS=1

# Install system dependencies
RUN set -eux; \
  # Configure APT to retry fetching indexes/files on transient network/mirror errors
  echo 'Acquire::Retries "3";' > /etc/apt/apt.conf.d/80-retries; \
  apt-get update -o Acquire::Retries=3; \
  apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    libgomp1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgl1-mesa-glx \
  || ( \
    echo "apt install failed, trying apt-get update && apt-get install --fix-missing"; \
    apt-get update -o Acquire::Retries=3; \
    apt-get install -y --no-install-recommends --fix-missing \
      build-essential gcc g++ libgomp1 libglib2.0-0 libsm6 libxext6 libxrender1 libgl1-mesa-glx; \
  ); \
  rm -rf /var/lib/apt/lists/* /etc/apt/apt.conf.d/80-retries

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create models directory if it doesn't exist
RUN mkdir -p models

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

# Run the application
CMD ["sh", "-c", "uvicorn main:app --host ${UVICORN_HOST} --port ${UVICORN_PORT} --workers ${UVICORN_WORKERS}"]
