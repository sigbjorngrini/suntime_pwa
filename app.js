// Global variables
let pyodide;
let locationWatchId = null;
let deferredPrompt = null;

// DOM elements
const loadingElement = document.getElementById('loading');
const errorMessageElement = document.getElementById('error-message');
const locationDisplay = document.getElementById('location-display');
const refreshLocationButton = document.getElementById('refresh-location');
const sunriseTimeElement = document.getElementById('sunrise-time');
const sunsetTimeElement = document.getElementById('sunset-time');
const sunriseInfoElement = document.getElementById('sunrise-info');
const sunsetInfoElement = document.getElementById('sunset-info');
const dayLengthElement = document.getElementById('day-length');
const installButton = document.getElementById('install-button');
const manualLocationForm = document.getElementById('manual-location-form');
const latitudeInput = document.getElementById('latitude');
const longitudeInput = document.getElementById('longitude');
const submitLocationButton = document.getElementById('submit-location');

// Initialize the application
async function initApp() {
    try {
        // Load Pyodide
        loadingElement.style.display = 'flex';
        pyodide = await loadPyodide();
        
        // Load our Python code
        await pyodide.loadPackagesFromImports(`
            import json
            import datetime
        `);
        
        // Load our main Python script
        const response = await fetch('main.py');
        const pythonCode = await response.text();
        await pyodide.runPythonAsync(pythonCode);
        
        // Hide loading indicator
        loadingElement.style.display = 'none';
        
        // Get user's location
        getLocation();
        
        // Set up event listeners
        setupEventListeners();
        
    } catch (error) {
        console.error('Failed to initialize Pyodide:', error);
        showError('Failed to load Python environment. Please try refreshing the page.');
        loadingElement.style.display = 'none';
    }
}

// Set up event listeners
function setupEventListeners() {
    refreshLocationButton.addEventListener('click', getLocation);
    
    // Manual location submission
    submitLocationButton.addEventListener('click', handleManualLocationSubmit);
    
    // PWA installation
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installButton.style.display = 'inline-block';
    });
    
    installButton.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User ${outcome} the installation`);
        deferredPrompt = null;
        installButton.style.display = 'none';
    });
}

// Handle manual location submission
async function handleManualLocationSubmit() {
    const latitude = parseFloat(latitudeInput.value);
    const longitude = parseFloat(longitudeInput.value);
    
    // Validate inputs
    if (isNaN(latitude) || isNaN(longitude)) {
        showError('Please enter valid latitude and longitude values');
        return;
    }
    
    if (latitude < -90 || latitude > 90) {
        showError('Latitude must be between -90 and 90 degrees');
        return;
    }
    
    if (longitude < -180 || longitude > 180) {
        showError('Longitude must be between -180 and 180 degrees');
        return;
    }
    
    try {
        // Display coordinates
        locationDisplay.textContent = `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`;
        
        // Call Python function to calculate sun times
        const result = await pyodide.runPythonAsync(`
            calculate_sun_times(${latitude}, ${longitude})
        `);
        
        // Parse the result
        const sunData = JSON.parse(result);
        
        // Update UI with sun data
        updateSunUI(sunData);
        
        // Hide error message if any
        errorMessageElement.style.display = 'none';
        
    } catch (error) {
        console.error('Error processing manual location data:', error);
        showError('Failed to calculate sun times. Please try again.');
    }
}

// Get user's location
function getLocation() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser');
        return;
    }
    
    locationDisplay.textContent = 'Detecting location...';
    
    // Clear any existing watch
    if (locationWatchId !== null) {
        navigator.geolocation.clearWatch(locationWatchId);
    }
    
    // Watch position with high accuracy
    locationWatchId = navigator.geolocation.watchPosition(
        handleLocationSuccess,
        handleLocationError,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

// Handle successful location retrieval
async function handleLocationSuccess(position) {
    try {
        const { latitude, longitude } = position.coords;
        
        // Display coordinates
        locationDisplay.textContent = `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`;
        
        // Call Python function to calculate sun times
        const result = await pyodide.runPythonAsync(`
            calculate_sun_times(${latitude}, ${longitude})
        `);
        
        // Parse the result
        const sunData = JSON.parse(result);
        
        // Update UI with sun data
        updateSunUI(sunData);
        
    } catch (error) {
        console.error('Error processing location data:', error);
        showError('Failed to calculate sun times. Please try again.');
    }
}

// Handle location error
function handleLocationError(error) {
    let errorMsg;
    switch(error.code) {
        case error.PERMISSION_DENIED:
            errorMsg = 'Location access denied. Please enable location services or enter coordinates manually.';
            break;
        case error.POSITION_UNAVAILABLE:
            errorMsg = 'Location information is unavailable. Please enter coordinates manually.';
            break;
        case error.TIMEOUT:
            errorMsg = 'Location request timed out. Please enter coordinates manually.';
            break;
        default:
            errorMsg = 'An unknown error occurred while getting location. Please enter coordinates manually.';
    }
    showError(errorMsg);
    locationDisplay.textContent = 'Location unavailable';
    
    // Show manual location form
    manualLocationForm.style.display = 'block';
}

// Update UI with sun data
function updateSunUI(sunData) {
    // Update sunrise info
    sunriseTimeElement.textContent = sunData.sunrise_time;
    sunriseInfoElement.textContent = sunData.sunrise_info;
    
    // Update sunset info
    sunsetTimeElement.textContent = sunData.sunset_time;
    sunsetInfoElement.textContent = sunData.sunset_info;
    
    // Update day length
    dayLengthElement.textContent = sunData.day_length;
    
    // Hide any previous errors
    errorMessageElement.style.display = 'none';
}

// Show error message
function showError(message) {
    errorMessageElement.textContent = message;
    errorMessageElement.style.display = 'block';
}

// Start the application when the page loads
window.addEventListener('DOMContentLoaded', initApp);
