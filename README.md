# AeroVista Globe 🌍✈️

A sophisticated 3D flight visualization dashboard that renders global flight paths from Excel/CSV data using a high-fidelity interactive globe.

## Features
- **Interactive SVG Globe**: Drag to rotate, click arcs to inspect flight details.
- **Dynamic Excel/CSV Import**: Upload your own flight data and see the map update instantly.
- **AI-Powered Geocoding**: Uses Google Gemini to automatically resolve city names into geographical coordinates.
- **D3.js Visualization**: High-performance vector rendering for smooth interactions.

## Local Setup

To run this project locally, we recommend using [Vite](https://vitejs.dev/).

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/aerovista-globe.git
   cd aerovista-globe
   ```

2. **Installation**:
   While the current version uses `esm.sh` imports via `importmap` (making it "no-build" friendly), for a standard project you might want to install dependencies:
   ```bash
   npm install react react-dom d3 topojson-client lucide-react xlsx @google/genai
   ```

3. **Running**:
   If you are using the `index.html` exactly as is, you can serve it with any static server:
   ```bash
   # Using python
   python -m http.server 8000
   ```

## API Key Configuration
The app requires a Google Gemini API Key for geocoding unknown cities.
In this version, it expects `process.env.API_KEY`. For local development with Vite, you should update the code to use `import.meta.env.VITE_API_KEY` and create a `.env` file:
```env
VITE_API_KEY=your_gemini_api_key_here
```

## Data Format
Your Excel or CSV file should contain the following columns:
| from | to | duration | airlines |
|------|----|----------|----------|
| London | New York | 7h 50m | British Airways |
| Paris | Tokyo | 12h 30m | Air France |

---
*Created with AeroVista Engine*
