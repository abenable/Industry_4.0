# Flutter App Quick Start

## Prerequisites

- Flutter SDK 3.0 or higher
- Dart SDK
- Android Studio / Xcode (for mobile development)

## Installation

```bash
# Get dependencies
flutter pub get
```

## Running the App

### On Chrome (Web)
```bash
flutter run -d chrome
```

### On Android Emulator
```bash
flutter run -d android
```

### On iOS Simulator
```bash
flutter run -d ios
```

### On Physical Device
```bash
# List available devices
flutter devices

# Run on specific device
flutter run -d <device-id>
```

## Configuration

Update the API URL in `lib/services/api_service.dart`:

```dart
ApiService(baseUrl: 'http://your-api-url:8000')
```

For Android emulator, use: `http://10.0.2.2:8000`
For iOS simulator, use: `http://localhost:8000`

## Building for Release

### Android APK
```bash
flutter build apk --release
```

### Android App Bundle
```bash
flutter build appbundle --release
```

### iOS
```bash
flutter build ios --release
```

### Web
```bash
flutter build web
```

## Project Structure

```
lib/
├── main.dart           # App entry point
├── services/
│   └── api_service.dart    # API communication
└── screens/
    └── home_screen.dart    # Main screen
```

## Adding New Screens

1. Create a new file in `lib/screens/`
2. Import it in `main.dart`
3. Add routing if needed
