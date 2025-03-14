# SunTime - Sunrise & Sunset Tracker

A Progressive Web App (PWA) that displays sunrise and sunset times based on your current location. The app uses Python (via Pyodide) to calculate astronomical data directly in your browser.

![SunTime App Screenshot](screenshot.png)

## Features

- 🌅 Real-time sunrise and sunset calculations
- 📍 Location-based data
- 📱 Works offline (PWA)
- 🔄 Responsive design for all devices
- 🐍 Powered by Python in the browser

## Publishing Options

You can publish your PWA using any of these methods:

### 1. GitHub Pages (Free)
- Push your code to a GitHub repository
- Enable GitHub Pages in the repository settings
- Your app will be available at `https://yourusername.github.io/repository-name`

### 2. Netlify (Free tier available)
- Create an account at [netlify.com](https://www.netlify.com/)
- Connect your GitHub repository or drag-and-drop your project folder
- Netlify will automatically deploy your site and provide a custom URL

### 3. Vercel (Free tier available)
- Create an account at [vercel.com](https://vercel.com/)
- Connect your GitHub repository or use the Vercel CLI to deploy
- Vercel will deploy your site and provide a custom URL

### 4. Firebase Hosting (Free tier available)
- Create a Firebase account and project at [firebase.google.com](https://firebase.google.com/)
- Install Firebase CLI: `npm install -g firebase-tools`
- Initialize and deploy with: `firebase init` and `firebase deploy`

### 5. Custom Domain (Paid)
- Purchase a domain from a registrar like Namecheap, GoDaddy, or Google Domains
- Point your domain to any of the above hosting services
- Configure SSL for HTTPS (required for PWAs)

## Installation

### Method 1: Install as a PWA

1. Visit the app in a modern browser (Chrome, Edge, Safari, etc.)
2. The browser should show an install prompt in the address bar or menu
3. Click "Install" or "Add to Home Screen"
4. The app will be installed on your device and can be launched from your home screen/app drawer

### Method 2: Manual Installation

On most modern browsers:

1. Visit the app URL
2. Click the menu button (usually three dots in the top right)
3. Look for "Install App" or "Add to Home Screen"
4. Follow the prompts to complete installation

### Method 3: Run Locally

To run the app locally:

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/suntime.git
   cd suntime
   ```

2. Start a local web server:
   ```
   python -m http.server 8000
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:8000
   ```

## How It Works

SunTime uses:
- **Pyodide**: Runs Python code directly in your browser
- **Geolocation API**: Gets your current location (with your permission)
- **Service Workers**: Enables offline functionality
- **Astronomical Calculations**: Uses mathematical formulas to calculate sun times

## Privacy

SunTime respects your privacy:
- Your location data never leaves your device
- All calculations are performed locally in your browser
- No data is sent to any server

## Development

This project uses:
- HTML, CSS, and JavaScript for the frontend
- Python (via Pyodide) for calculations
- PWA features for offline use and installation

## License

MIT License
