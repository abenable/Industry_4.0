# Quick Start Guide for Industry 4.0 Hackathon Project

This guide will help you get started with the Industry 4.0 ML project quickly.

## 🎯 Choose Your Setup Method

### Option 1: Docker (Easiest - Recommended)

**Prerequisites:** Docker and Docker Compose installed

```bash
# Clone and navigate to the repository
git clone https://github.com/abenable/Industry_4.0.git
cd Industry_4.0

# Start all services
docker-compose up --build

# Access the applications
# - Backend API: http://localhost:8000
# - API Docs: http://localhost:8000/docs
# - Web App: http://localhost:3000
```

### Option 2: Manual Setup (For Development)

#### 1. Backend Setup (5 minutes)

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
cd app
python main.py
```

✅ Backend running at: http://localhost:8000

#### 2. Web App Setup (3 minutes)

```bash
cd web_app

# Install dependencies
npm install

# Run development server
npm run dev
```

✅ Web app running at: http://localhost:3000

#### 3. Flutter App Setup (10 minutes)

```bash
cd flutter_app

# Install dependencies
flutter pub get

# Run on your preferred device
flutter run -d chrome        # For web
flutter run -d android       # For Android
flutter run -d ios          # For iOS
```

## 🧪 Testing the API

### 1. Check API Health
```bash
curl http://localhost:8000/health
```

### 2. Train the Model

First, create a sample CSV file (last column should be the target):
```csv
feature1,feature2,feature3,feature4,target
5.1,3.5,1.4,0.2,0
4.9,3.0,1.4,0.2,0
7.0,3.2,4.7,1.4,1
6.4,3.2,4.5,1.5,1
```

Then train:
```bash
curl -X POST http://localhost:8000/train -F "file=@your_data.csv"
```

### 3. Make Predictions
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"data": [5.1, 3.5, 1.4, 0.2]}'
```

## 📱 What You Get

### Backend Features
- ✅ FastAPI server with automatic API documentation
- ✅ Machine Learning model (RandomForest - customizable)
- ✅ Training endpoint for updating models
- ✅ Prediction endpoint for inference
- ✅ Model information endpoint
- ✅ Health check endpoint

### Web App Features
- ✅ React-based modern UI
- ✅ Model information dashboard
- ✅ Prediction form with real-time results
- ✅ Beautiful gradient design
- ✅ Responsive layout

### Flutter App Features
- ✅ Cross-platform mobile app
- ✅ Material Design UI
- ✅ API integration
- ✅ Prediction interface
- ✅ Model status display

## 🎨 Customization

### Change the ML Model

Edit `backend/models/ml_model.py`:
- Replace `RandomForestClassifier` with your model
- Update preprocessing logic
- Modify prediction methods

### Customize the Web UI

Edit files in `web_app/src/`:
- `App.css` - Styling
- `components/` - React components
- `services/api.js` - API configuration

### Modify Flutter App

Edit files in `flutter_app/lib/`:
- `screens/` - UI screens
- `services/api_service.dart` - API URL and methods

## 🔧 Configuration

### Backend API URL

**Web App:** Create `web_app/.env`
```
VITE_API_URL=http://localhost:8000
```

**Flutter App:** Edit `flutter_app/lib/services/api_service.dart`
```dart
ApiService(baseUrl: 'http://your-api-url:8000')
```

## 📚 API Documentation

Once the backend is running, visit:
- Interactive API docs: http://localhost:8000/docs
- Alternative docs: http://localhost:8000/redoc

## 🐛 Troubleshooting

### Backend Issues

**Problem:** Port 8000 already in use
```bash
# Find and kill the process
lsof -ti:8000 | xargs kill -9
```

**Problem:** Module not found
```bash
# Make sure virtual environment is activated
source venv/bin/activate
pip install -r requirements.txt
```

### Web App Issues

**Problem:** Port 3000 already in use
- Edit `web_app/vite.config.js` to change port

**Problem:** Module not found
```bash
rm -rf node_modules package-lock.json
npm install
```

### Flutter App Issues

**Problem:** Packages not found
```bash
flutter clean
flutter pub get
```

**Problem:** Can't connect to API from Android emulator
- Use `http://10.0.2.2:8000` instead of `localhost:8000`

## 🚀 Next Steps

1. **Customize the ML Model** - Replace with your domain-specific model
2. **Add Authentication** - Secure your API endpoints
3. **Deploy to Cloud** - Use Heroku, Railway, or AWS
4. **Add More Features** - Data visualization, batch predictions, etc.
5. **Improve UI** - Add charts, better styling, animations
6. **Add Tests** - Write unit and integration tests

## 💡 Tips

- Use the `/docs` endpoint to explore and test your API interactively
- Start with the Docker setup for the quickest results
- Check individual README files in each directory for more details
- The backend logs will show all API requests in real-time

## 🎓 Learning Resources

- FastAPI: https://fastapi.tiangolo.com/
- React: https://react.dev/
- Flutter: https://flutter.dev/
- scikit-learn: https://scikit-learn.org/

---

Happy Hacking! 🚀
