# Industry 4.0 - ML Hackathon Project

A full-stack machine learning application for Industry 4.0, featuring a FastAPI backend with ML capabilities, a Flutter mobile app, and a React web application.

## 🚀 Project Structure

```
Industry_4.0/
├── backend/                 # FastAPI ML Backend
│   ├── app/
│   │   └── main.py         # FastAPI application
│   ├── models/
│   │   ├── ml_model.py     # ML model implementation
│   │   └── trained/        # Trained model storage
│   ├── requirements.txt    # Python dependencies
│   └── Dockerfile
├── flutter_app/            # Flutter Mobile App
│   ├── lib/
│   │   ├── main.dart
│   │   ├── services/       # API services
│   │   └── screens/        # UI screens
│   └── pubspec.yaml
├── web_app/                # React Web App
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API services
│   │   └── App.jsx
│   ├── package.json
│   └── Dockerfile
└── docker-compose.yml      # Docker orchestration
```

## 🎯 Features

### Backend (FastAPI)
- **RESTful API** with automatic documentation (Swagger UI)
- **Machine Learning Model** integration using scikit-learn
- **Model Training** endpoint for updating models with new data
- **Prediction API** for real-time inference
- **CORS enabled** for cross-origin requests
- **Health check** endpoint for monitoring

### Flutter Mobile App
- **Cross-platform** (iOS & Android)
- **Real-time predictions** from ML model
- **Model information** display
- **Clean Material Design** UI
- **API integration** with backend

### Web Application (React)
- **Modern React** with Vite build tool
- **Responsive design** for all screen sizes
- **Real-time predictions** interface
- **Model status monitoring**
- **Professional gradient UI**

## 📋 Prerequisites

### For Backend
- Python 3.11+
- pip

### For Flutter App
- Flutter SDK 3.0+
- Dart SDK
- Android Studio / Xcode (for mobile development)

### For Web App
- Node.js 18+
- npm or yarn

### For Docker Deployment
- Docker
- Docker Compose

## 🛠️ Installation & Setup

### Option 1: Using Docker (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/abenable/Industry_4.0.git
cd Industry_4.0
```

2. Build and run with Docker Compose:
```bash
docker-compose up --build
```

The services will be available at:
- Backend API: http://localhost:8000
- Web App: http://localhost:3000
- API Documentation: http://localhost:8000/docs

### Option 2: Manual Setup

#### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the server:
```bash
cd app
python main.py
```

The API will be available at http://localhost:8000

#### Flutter App Setup

1. Navigate to Flutter app directory:
```bash
cd flutter_app
```

2. Install dependencies:
```bash
flutter pub get
```

3. Run the app:
```bash
flutter run
```

For specific platforms:
```bash
flutter run -d chrome        # For web
flutter run -d android       # For Android
flutter run -d ios           # For iOS
```

#### Web App Setup

1. Navigate to web app directory:
```bash
cd web_app
```

2. Install dependencies:
```bash
npm install
```

3. Run development server:
```bash
npm run dev
```

The web app will be available at http://localhost:3000

## 📖 API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Key Endpoints

- `GET /` - Root endpoint with API info
- `GET /health` - Health check
- `GET /model/info` - Get current model information
- `POST /predict` - Make predictions
  ```json
  {
    "data": [1.2, 3.4, 5.6, 7.8]
  }
  ```
- `POST /train` - Train/update model with CSV file

## 🧪 Testing

### Backend Testing
```bash
cd backend
pytest  # If tests are added
```

### Web App Testing
```bash
cd web_app
npm test
```

### Flutter App Testing
```bash
cd flutter_app
flutter test
```

## 📱 Usage Examples

### Making Predictions via API

Using curl:
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"data": [1.2, 3.4, 5.6, 7.8]}'
```

Using Python:
```python
import requests

response = requests.post(
    'http://localhost:8000/predict',
    json={'data': [1.2, 3.4, 5.6, 7.8]}
)
print(response.json())
```

### Training the Model

```bash
curl -X POST http://localhost:8000/train \
  -F "file=@training_data.csv"
```

## 🔧 Configuration

### Backend Configuration
Edit `backend/app/main.py` to configure:
- CORS origins
- Model parameters
- API settings

### Web App Configuration
Create `.env` file in `web_app/`:
```
VITE_API_URL=http://localhost:8000
```

### Flutter App Configuration
Edit `flutter_app/lib/services/api_service.dart` to change API URL:
```dart
ApiService(baseUrl: 'http://your-api-url:8000')
```

## 🚢 Deployment

### Backend Deployment (Heroku/Railway/Render)

1. Add `Procfile`:
```
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

2. Deploy using platform CLI or GitHub integration

### Web App Deployment (Vercel/Netlify)

1. Build the app:
```bash
npm run build
```

2. Deploy the `dist` folder or connect GitHub repository

### Flutter App Deployment

#### Android
```bash
flutter build apk --release
```

#### iOS
```bash
flutter build ios --release
```

#### Web
```bash
flutter build web
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is created for hackathon purposes. Please add appropriate license as needed.

## 👥 Team

- Your Team Name
- Team Members

## 📧 Contact

For questions or support, please contact: [Your Email]

## 🙏 Acknowledgments

- FastAPI for the excellent web framework
- Flutter for cross-platform mobile development
- React for the web interface
- scikit-learn for ML capabilities

## 🔮 Future Enhancements

- [ ] Add user authentication
- [ ] Implement real-time predictions with WebSockets
- [ ] Add more ML models (deep learning, NLP, etc.)
- [ ] Implement model versioning
- [ ] Add data visualization dashboards
- [ ] Implement A/B testing for models
- [ ] Add monitoring and logging
- [ ] Implement CI/CD pipeline
- [ ] Add comprehensive test coverage
- [ ] Implement model explainability features

---

**Built with ❤️ for Industry 4.0 Hackathon**