// Global variables
let pyodide;
let locationWatchId = null;
let deferredPrompt = null;
const MAX_RECENT_LOCATIONS = 5;

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
const tabCoordinates = document.getElementById('tab-coordinates');
const tabSearch = document.getElementById('tab-search');
const coordinatesForm = document.getElementById('coordinates-form');
const searchForm = document.getElementById('search-form');
const locationSearchInput = document.getElementById('location-search');
const searchLocationButton = document.getElementById('search-location');
const searchResults = document.getElementById('search-results');
const resultsList = document.getElementById('results-list');
const recentLocationsContainer = document.getElementById('recent-locations');
const recentLocationsList = document.getElementById('recent-locations-list');

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
        
        // Load recent locations
        loadRecentLocations();
        
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
    
    // Location search
    searchLocationButton.addEventListener('click', handleLocationSearch);
    locationSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleLocationSearch();
        }
    });
    
    // Tab switching
    tabCoordinates.addEventListener('click', () => switchTab('coordinates'));
    tabSearch.addEventListener('click', () => switchTab('search'));
    
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

// Switch between tabs
function switchTab(tab) {
    if (tab === 'coordinates') {
        tabCoordinates.classList.add('active');
        tabSearch.classList.remove('active');
        coordinatesForm.style.display = 'block';
        searchForm.style.display = 'none';
    } else {
        tabCoordinates.classList.remove('active');
        tabSearch.classList.add('active');
        coordinatesForm.style.display = 'none';
        searchForm.style.display = 'block';
    }
}

// Handle location search
async function handleLocationSearch() {
    const searchQuery = locationSearchInput.value.trim();
    
    if (!searchQuery) {
        showError('Please enter a location to search');
        return;
    }
    
    try {
        // Show loading state
        searchLocationButton.textContent = 'Searching...';
        searchLocationButton.disabled = true;
        
        // Clear previous results
        resultsList.innerHTML = '';
        searchResults.style.display = 'none';
        
        // Call Nominatim API
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch location data');
        }
        
        const data = await response.json();
        
        if (data.length === 0) {
            showError('No locations found. Please try a different search term.');
        } else {
            // Display results
            data.forEach(location => {
                const li = document.createElement('li');
                li.className = 'result-item';
                li.innerHTML = `
                    <div class="result-name">${location.display_name}</div>
                    <div class="result-details">Lat: ${location.lat}, Lon: ${location.lon}</div>
                `;
                
                // Add click event to use this location
                li.addEventListener('click', () => {
                    useSearchResult(location);
                });
                
                resultsList.appendChild(li);
            });
            
            searchResults.style.display = 'block';
        }
    } catch (error) {
        console.error('Error searching for location:', error);
        showError('Failed to search for location. Please try again.');
    } finally {
        // Reset button state
        searchLocationButton.textContent = 'Search';
        searchLocationButton.disabled = false;
    }
}

// Use a search result
async function useSearchResult(location) {
    try {
        const latitude = parseFloat(location.lat);
        const longitude = parseFloat(location.lon);
        const locationName = location.display_name.split(',')[0];
        
        // Display location name and coordinates
        locationDisplay.textContent = `${locationName} (${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°)`;
        
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
        
        // Add to recent locations
        addToRecentLocations({
            name: locationName,
            displayName: location.display_name,
            latitude: latitude,
            longitude: longitude
        });
        
    } catch (error) {
        console.error('Error processing location data:', error);
        showError('Failed to calculate sun times. Please try again.');
    }
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
        
        // Add to recent locations
        addToRecentLocations({
            name: `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`,
            latitude: latitude,
            longitude: longitude
        });
        
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
        
        // Add to recent locations
        addToRecentLocations({
            name: 'Current Location',
            latitude: latitude,
            longitude: longitude
        });
        
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
            errorMsg = 'Location access denied. Please enable location services or enter location manually.';
            break;
        case error.POSITION_UNAVAILABLE:
            errorMsg = 'Location information is unavailable. Please enter location manually.';
            break;
        case error.TIMEOUT:
            errorMsg = 'Location request timed out. Please enter location manually.';
            break;
        default:
            errorMsg = 'An unknown error occurred while getting location. Please enter location manually.';
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

// Recent locations functions
function loadRecentLocations() {
    try {
        const recentLocations = JSON.parse(localStorage.getItem('recentLocations')) || [];
        
        if (recentLocations.length > 0) {
            recentLocationsContainer.style.display = 'block';
            updateRecentLocationsList(recentLocations);
        }
    } catch (error) {
        console.error('Error loading recent locations:', error);
    }
}

function addToRecentLocations(location) {
    try {
        // Get existing locations
        let recentLocations = JSON.parse(localStorage.getItem('recentLocations')) || [];
        
        // Check if this location already exists (by coordinates)
        const existingIndex = recentLocations.findIndex(loc => 
            Math.abs(loc.latitude - location.latitude) < 0.0001 && 
            Math.abs(loc.longitude - location.longitude) < 0.0001
        );
        
        // If it exists, remove it (we'll add it to the top)
        if (existingIndex !== -1) {
            recentLocations.splice(existingIndex, 1);
        }
        
        // Add new location to the beginning
        recentLocations.unshift(location);
        
        // Keep only the most recent MAX_RECENT_LOCATIONS
        if (recentLocations.length > MAX_RECENT_LOCATIONS) {
            recentLocations = recentLocations.slice(0, MAX_RECENT_LOCATIONS);
        }
        
        // Save to localStorage
        localStorage.setItem('recentLocations', JSON.stringify(recentLocations));
        
        // Update the UI
        recentLocationsContainer.style.display = 'block';
        updateRecentLocationsList(recentLocations);
        
    } catch (error) {
        console.error('Error adding to recent locations:', error);
    }
}

function updateRecentLocationsList(locations) {
    // Clear the list
    recentLocationsList.innerHTML = '';
    
    // Add each location
    locations.forEach((location, index) => {
        const li = document.createElement('li');
        li.className = 'recent-location-item';
        
        li.innerHTML = `
            <span class="location-name">${location.name}</span>
            <span class="location-coords">${location.latitude.toFixed(4)}°, ${location.longitude.toFixed(4)}°</span>
            <span class="remove-location" data-index="${index}">×</span>
        `;
        
        // Add click event to use this location
        li.addEventListener('click', (e) => {
            // Don't trigger if they clicked the remove button
            if (!e.target.classList.contains('remove-location')) {
                useRecentLocation(location);
            }
        });
        
        recentLocationsList.appendChild(li);
    });
    
    // Add event listeners for remove buttons
    document.querySelectorAll('.remove-location').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering the parent click
            removeRecentLocation(parseInt(e.target.dataset.index));
        });
    });
}

function removeRecentLocation(index) {
    try {
        // Get existing locations
        let recentLocations = JSON.parse(localStorage.getItem('recentLocations')) || [];
        
        // Remove the location at the specified index
        recentLocations.splice(index, 1);
        
        // Save to localStorage
        localStorage.setItem('recentLocations', JSON.stringify(recentLocations));
        
        // Update the UI
        if (recentLocations.length === 0) {
            recentLocationsContainer.style.display = 'none';
        } else {
            updateRecentLocationsList(recentLocations);
        }
        
    } catch (error) {
        console.error('Error removing recent location:', error);
    }
}

async function useRecentLocation(location) {
    try {
        // Display location name and coordinates
        locationDisplay.textContent = `${location.name} (${location.latitude.toFixed(4)}°, ${location.longitude.toFixed(4)}°)`;
        
        // Call Python function to calculate sun times
        const result = await pyodide.runPythonAsync(`
            calculate_sun_times(${location.latitude}, ${location.longitude})
        `);
        
        // Parse the result
        const sunData = JSON.parse(result);
        
        // Update UI with sun data
        updateSunUI(sunData);
        
        // Hide error message if any
        errorMessageElement.style.display = 'none';
        
        // Move this location to the top of recent locations
        addToRecentLocations(location);
        
    } catch (error) {
        console.error('Error using recent location:', error);
        showError('Failed to calculate sun times. Please try again.');
    }
}

// Start the application when the page loads
window.addEventListener('DOMContentLoaded', initApp);
