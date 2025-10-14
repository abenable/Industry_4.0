# Complete Flutter Development Prompt for AgrivAI

## Project Overview

Build a complete Flutter mobile application called "AgrivAI" - an AI-powered crop disease detection app for farmers. The app captures images of crops (beans and cassava) and uses machine learning to classify whether the crop is diseased or healthy.

## App Identity

- **Name**: AgrivAI
- **Purpose**: Crop disease detection and diagnosis
- **Target Crops**: Beans and Cassava
- **Platform**: Android & iOS (Flutter)

## Design Requirements

### Color Palette

- **Primary Colors**:
  - Emerald Green: #10B981
  - Forest Green: #059669
  - Teal: #14B8A6
- **Background**:
  - Light gradient from emerald-50 to green-50 to teal-50
  - Card backgrounds: White (#FFFFFF)
- **Accent Colors**:
  - Success/Healthy: Green (#22C55E)
  - Warning/Disease: Amber (#F59E0B)
  - Error: Red (#EF4444)
- **Text Colors**:
  - Primary: Dark Gray (#1F2937)
  - Secondary: Medium Gray (#6B7280)

### UI/UX Requirements

1. **Modern and Clean**: Use rounded corners (border-radius: 16-24px), subtle shadows, and smooth animations
2. **User-Friendly**: Intuitive navigation with clear call-to-action buttons
3. **Responsive**: Adapt to different screen sizes
4. **Accessible**: High contrast text, clear icons, readable fonts
5. **Professional**: Polished look suitable for agricultural professionals

## Core Features & Screens

### 1. Splash Screen

- Display "AgrivAI" logo with a leaf icon
- Animated fade-in effect
- Duration: 2-3 seconds
- Background: Gradient (emerald to green)

### 2. Home Screen / Main Screen

**Components**:

- **Header**:
  - App logo and name "AgrivAI"
  - Tagline: "AI-powered crop health scanner"
  - Leaf icon in a gradient circular container
- **Crop Selection Section**:
  - Title: "Select Your Crop"
  - Two large, tappable cards in a grid layout:
    - **Beans Card**: 🫘 icon, "Beans" label
    - **Cassava Card**: 🌿 icon, "Cassava" label
  - Visual feedback when selected (border color change, slight scale animation)
  - Cards should have rounded corners and subtle shadows
- **Image Capture Section** (appears after crop selection):
  - Title: "Capture or Upload Image"
  - Two action buttons in a grid:
    - **Take Photo Button**:
      - Camera icon
      - "Take Photo" text
      - "Use your camera" subtext
      - Opens device camera
    - **Upload Image Button**:
      - Upload icon
      - "Upload Image" text
      - "From your device" subtext
      - Opens gallery/file picker
  - Both buttons have dashed borders with hover/press effects

### 3. Image Preview & Analysis Screen

**Components**:

- **Image Display**:
  - Full-width image preview with rounded corners
  - Close/Cancel button (X icon) in top-right corner to go back
- **Selected Crop Badge**:
  - Centered pill-shaped badge showing crop emoji and name
  - Background: Light emerald
- **Analyze Button**:
  - Full-width gradient button (emerald to green)
  - Text: "Analyze Crop Health"
  - Large, prominent, with shadow
  - Loading state: Show spinner and "Analyzing..." text

### 4. Results Screen

**Components**:

- **Result Card**:
  - Conditional styling based on result:
    - **Healthy**: Green background, checkmark icon
    - **Diseased**: Amber background, alert icon
- **Disease Name/Status**:
  - Large, bold text displaying the diagnosis
  - Example: "Healthy" or "Bacterial Blight" or "Mosaic Virus"
- **Confidence Level**:
  - Percentage display (e.g., "95%")
  - Visual progress bar showing confidence
  - Color matches health status
- **Recommendations Section**:
  - Title: "Recommendations"
  - Bulleted list of actionable advice
  - Examples for healthy crops:
    - "Continue regular monitoring"
    - "Maintain current care practices"
  - Examples for diseased crops:
    - "Remove infected plants"
    - "Apply appropriate treatment"
    - "Improve air circulation"
- **Action Button**:
  - "Scan Another Crop" button
  - Returns to home screen
  - White background with border

### 5. Additional UI Elements

- **Loading Indicators**:
  - Circular progress indicator during analysis
  - Smooth animations
- **Error Handling**:
  - Toast messages or snackbars for errors
  - User-friendly error messages
- **Footer**:
  - Small text: "Powered by AI • For best results, capture clear, well-lit images"

## Technical Requirements

### 1. Dependencies

```yaml
dependencies:
  flutter:
    sdk: flutter
  image_picker: ^latest_version # For camera and gallery access
  http: ^latest_version # For API calls
  provider: ^latest_version # State management
  shared_preferences: ^latest_version # Local storage (optional)
  camera: ^latest_version # Camera functionality
  path_provider: ^latest_version # File path handling
  flutter_svg: ^latest_version # For SVG icons (optional)
```

### 2. Permissions

**Android (AndroidManifest.xml)**:

```xml
<uses-permission android:name="android.permission.CAMERA"/>
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.INTERNET"/>
```

**iOS (Info.plist)**:

```xml
<key>NSCameraUsageDescription</key>
<string>AgrivAI needs camera access to capture crop images for disease detection</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>AgrivAI needs photo library access to upload crop images</string>
```

### 3. State Management

- Use Provider or Riverpod for state management
- Manage the following states:
  - Selected crop (beans/cassava)
  - Captured/uploaded image
  - Analysis loading state
  - Analysis results
  - Error states

### 4. API Integration Structure

```dart
// Placeholder API service structure
class CropAnalysisService {
  Future<AnalysisResult> analyzeCrop({
    required File imageFile,
    required String cropType,
  }) async {
    // TODO: Replace with actual API endpoint
    final url = 'YOUR_API_ENDPOINT';

    // Convert image to base64 or multipart
    // Send POST request with image and crop type
    // Parse response

    // Mock response structure for now:
    return AnalysisResult(
      disease: 'Healthy',
      confidence: 95.0,
      isHealthy: true,
      recommendations: [
        'Continue regular monitoring',
        'Maintain current care practices',
      ],
    );
  }
}
```

### 5. Data Models

```dart
// Analysis Result Model
class AnalysisResult {
  final String disease;
  final double confidence;
  final bool isHealthy;
  final List<String> recommendations;

  AnalysisResult({
    required this.disease,
    required this.confidence,
    required this.isHealthy,
    required this.recommendations,
  });

  factory AnalysisResult.fromJson(Map<String, dynamic> json) {
    // Parse JSON from API
  }
}

// Crop Model
enum CropType { beans, cassava }

class Crop {
  final CropType type;
  final String name;
  final String emoji;

  Crop({required this.type, required this.name, required this.emoji});
}
```

## Animation Requirements

1. **Screen Transitions**: Smooth page transitions using Hero animations or slide transitions
2. **Button Press**: Scale animation (0.95x) on press
3. **Card Selection**: Border color change + slight scale (1.05x)
4. **Loading State**: Rotating spinner or pulsing animation
5. **Result Reveal**: Fade-in animation for results card

## File Structure

```
lib/
├── main.dart
├── models/
│   ├── analysis_result.dart
│   └── crop.dart
├── services/
│   └── crop_analysis_service.dart
├── providers/
│   └── app_state_provider.dart
├── screens/
│   ├── splash_screen.dart
│   ├── home_screen.dart
│   ├── image_preview_screen.dart
│   └── results_screen.dart
├── widgets/
│   ├── crop_card.dart
│   ├── action_button.dart
│   ├── result_card.dart
│   └── custom_button.dart
└── utils/
    ├── colors.dart
    └── constants.dart
```

## Additional Features (Nice-to-Have)

1. **History**: Save past scans locally with timestamps
2. **Share Results**: Share diagnosis via social media or messaging
3. **Multi-language Support**: English and local languages
4. **Offline Mode**: Show message when no internet connection
5. **Tips Section**: Educational content about crop care
6. **Onboarding**: First-time user tutorial

## Testing Checklist

- [ ] Camera capture works on both Android and iOS
- [ ] Gallery upload works correctly
- [ ] Image preview displays properly
- [ ] Loading states show during API calls
- [ ] Results display correctly for both healthy and diseased crops
- [ ] Confidence bar animates smoothly
- [ ] All buttons are responsive and provide feedback
- [ ] App handles errors gracefully
- [ ] Navigation between screens is smooth
- [ ] App works on different screen sizes

## Development Notes

1. **Start with UI**: Build all screens with mock data first
2. **Add Functionality**: Implement image capture and upload
3. **API Integration**: Connect to ML model endpoint (use mock data initially)
4. **Polish**: Add animations, error handling, and edge cases
5. **Test**: Thoroughly test on real devices

## Mock Data for Development

Use these mock responses while developing before connecting to the real ML model:

```dart
final mockResults = [
  AnalysisResult(
    disease: 'Healthy',
    confidence: 95.0,
    isHealthy: true,
    recommendations: [
      'Continue regular monitoring',
      'Maintain current care practices',
      'Ensure adequate watering',
    ],
  ),
  AnalysisResult(
    disease: 'Bacterial Blight',
    confidence: 87.0,
    isHealthy: false,
    recommendations: [
      'Remove infected plants immediately',
      'Apply copper-based fungicide',
      'Improve air circulation between plants',
      'Avoid overhead watering',
    ],
  ),
  AnalysisResult(
    disease: 'Mosaic Virus',
    confidence: 92.0,
    isHealthy: false,
    recommendations: [
      'Remove and destroy infected plants',
      'Control aphid populations',
      'Plant resistant varieties in future',
      'Disinfect tools between plants',
    ],
  ),
];
```

## Final Deliverables

1. Complete Flutter project with all screens implemented
2. Clean, well-commented code
3. Working camera and gallery integration
4. Mock API service ready for real endpoint integration
5. Responsive UI that works on various screen sizes
6. Smooth animations and transitions
7. README.md with setup instructions

---

**Note**: This app currently uses mock data for the ML analysis. To connect to a real machine learning model, update the `CropAnalysisService` class with your actual API endpoint and adjust the data parsing accordingly.
