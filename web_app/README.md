# Web App Quick Start

## Prerequisites

- Node.js 18 or higher
- npm or yarn

## Installation

```bash
# Install dependencies
npm install
```

## Running the Development Server

```bash
npm run dev
```

The app will be available at http://localhost:3000

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Preview Production Build

```bash
npm run preview
```

## Configuration

Create a `.env` file based on `.env.example`:

```
VITE_API_URL=http://localhost:8000
```

## Project Structure

```
src/
├── components/         # React components
│   ├── ModelInfo.jsx
│   └── PredictionForm.jsx
├── services/          # API services
│   └── api.js
├── App.jsx            # Main app component
├── App.css            # App styles
├── main.jsx           # Entry point
└── index.css          # Global styles
```

## Adding New Components

1. Create component file in `src/components/`
2. Import and use in `App.jsx` or other components

## Deployment

### Vercel
```bash
npm install -g vercel
vercel
```

### Netlify
```bash
npm run build
# Upload the dist/ folder to Netlify
```

## Customization

- Edit `src/App.css` for styling
- Modify `src/services/api.js` for API configuration
- Update components in `src/components/` for UI changes
