// track-search.js - Track search functionality for Simracing Companion

document.addEventListener('DOMContentLoaded', () => {
    // Load track data using IPC
    loadTrackDataFromSystem();
    
    // Set up search functionality
    const searchInput = document.getElementById('track-search-input');
    searchInput.addEventListener('input', () => {
        applyFilters();
    });
    
    // Set up filter functionality
    const yearFilter = document.getElementById('year-filter');
    const countryFilter = document.getElementById('country-filter');
    
    yearFilter.addEventListener('change', applyFilters);
    countryFilter.addEventListener('change', applyFilters);
    
    // Set up reset button
    const resetButton = document.getElementById('reset-filters');
    resetButton.addEventListener('click', resetFilters);
});

// Global variable to store all loaded tracks
let allTracks = [];
// Global variables to store unique years and countries
let allYears = [];
let allCountries = [];

// Function to sort tracks alphabetically by name
function sortTracksByName(tracks) {
    return tracks.sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
    });
}

// Function to populate filter dropdowns
function populateFilters() {
    const yearFilter = document.getElementById('year-filter');
    const countryFilter = document.getElementById('country-filter');
    
    // Clear existing options except the first one
    yearFilter.innerHTML = '<option value="">All Years</option>';
    countryFilter.innerHTML = '<option value="">All Countries</option>';
    
    // Extract unique years and countries
    allYears = [...new Set(allTracks.map(track => track.year).filter(Boolean))];
    allCountries = [...new Set(allTracks.map(track => track.country).filter(Boolean))];
    
    // Sort years numerically in descending order (newest first)
    allYears.sort((a, b) => b - a);
    
    // Sort countries alphabetically
    allCountries.sort();
    
    // Add year options
    allYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearFilter.appendChild(option);
    });
    
    // Add country options
    allCountries.forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        countryFilter.appendChild(option);
    });
}

// Function to reset all filters
function resetFilters() {
    const searchInput = document.getElementById('track-search-input');
    const yearFilter = document.getElementById('year-filter');
    const countryFilter = document.getElementById('country-filter');
    
    searchInput.value = '';
    yearFilter.value = '';
    countryFilter.value = '';
    
    applyFilters();
    
    // Add a subtle animation to the reset button
    const resetButton = document.getElementById('reset-filters');
    resetButton.classList.add('reset-active');
    setTimeout(() => {
        resetButton.classList.remove('reset-active');
    }, 300);
}

// Function to apply all filters
function applyFilters() {
    const searchTerm = document.getElementById('track-search-input').value.toLowerCase().trim();
    const yearFilter = document.getElementById('year-filter').value;
    const countryFilter = document.getElementById('country-filter').value;
    
    // Filter the tracks based on all criteria
    const filteredTracks = allTracks.filter(track => {
        // Search term filter
        const matchesSearch = !searchTerm || 
            (track.name && track.name.toLowerCase().includes(searchTerm)) ||
            (track.description && track.description.toLowerCase().includes(searchTerm)) ||
            (track.country && track.country.toLowerCase().includes(searchTerm)) ||
            (track.city && track.city.toLowerCase().includes(searchTerm)) ||
            (track.tags && track.tags.some(tag => tag.toLowerCase().includes(searchTerm)));
            
        // Year filter
        const matchesYear = !yearFilter || track.year == yearFilter;
        
        // Country filter
        const matchesCountry = !countryFilter || track.country == countryFilter;
        
        // Item passes if it matches all applied filters
        return matchesSearch && matchesYear && matchesCountry;
    });
    
    // Render the filtered tracks
    renderTracks(filteredTracks);
    
    // Update the results info text
    updateResultsInfo(searchTerm, yearFilter, countryFilter, filteredTracks.length);
}

// Function to update the results info text
function updateResultsInfo(searchTerm, yearFilter, countryFilter, resultCount) {
    const infoElement = document.getElementById('search-results-info');
    
    // Create a description of the active filters
    let filterDescription = [];
    
    if (searchTerm) {
        filterDescription.push(`"${searchTerm}"`);
    }
    
    if (yearFilter) {
        filterDescription.push(`Year: ${yearFilter}`);
    }
    
    if (countryFilter) {
        filterDescription.push(`Country: ${countryFilter}`);
    }
    
    // Construct the final message
    let message;
    if (filterDescription.length > 0) {
        message = `Search results for ${filterDescription.join(', ')}`;
    } else {
        message = 'All tracks (A-Z)';
    }
    
    // Add count
    message += ` - ${resultCount} track${resultCount !== 1 ? 's' : ''} found`;
    
    infoElement.textContent = message;
}

// Function to load track data from the system
async function loadTrackDataFromSystem() {
    try {
        // Show loading indicator or message
        document.getElementById('track-grid').innerHTML = `
            <div class="loading-message">
                Loading track data...
            </div>
        `;
        
        // Get track data from main process
        if (window.api && typeof window.api.getTracks === 'function') {
            // Using IPC if available (in actual Electron app)
            allTracks = await window.api.getTracks();
            
            // Check if we got data back
            if (allTracks && allTracks.length > 0) {
                // Sort all tracks alphabetically by name
                allTracks = sortTracksByName(allTracks);
                
                // Populate filter dropdowns
                populateFilters();
                
                // Render all tracks in alphabetical order
                renderTracks(allTracks);
                document.getElementById('search-results-info').textContent = `All tracks (A-Z) - ${allTracks.length} tracks found`;
            } else {
                // No data was returned
                document.getElementById('track-grid').innerHTML = `
                    <div class="error-message">
                        No tracks found. Check if your Assetto Corsa folder is correctly configured.
                    </div>
                `;
            }
        } else {
            // API not available - show error message
            console.error('API not available. Cannot load track data.');
            document.getElementById('track-grid').innerHTML = `
                <div class="error-message">
                    Cannot load track data. API not available.
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Error loading track data:', error);
        document.getElementById('track-grid').innerHTML = `
            <div class="error-message">
                Error loading track data: ${error.message}
            </div>
        `;
    }
}

// Function to open track's folder in file explorer
async function openTrackFolder(trackPath) {
    try {
        if (window.api && typeof window.api.openTrackFolder === 'function') {
            await window.api.openTrackFolder(trackPath);
        } else {
            console.warn('Cannot open track folder: API not available or openTrackFolder method not found');
            alert(`Cannot open track folder: API not available`);
        }
    } catch (error) {
        console.error('Error opening track folder:', error);
        alert(`Error opening track folder: ${error.message}`);
    }
}

function renderTracks(tracks) {
    const trackGrid = document.getElementById('track-grid');
    trackGrid.innerHTML = ''; // Clear existing tracks
    
    if (!tracks || tracks.length === 0) {
        trackGrid.innerHTML = `
            <div class="no-results">
                No tracks found matching your search.
            </div>
        `;
        return;
    }
    
    // Helper function to safely handle image paths with spaces and special characters
    function safeImagePath(path) {
        if (!path) return '';
        // Replace spaces with %20 and # with %23 specifically
        return path.replace(/ /g, '%20').replace(/#/g, '%23');
    }
    
    // Helper function to get country code from country name
    function getCountryCode(countryName) {
        if (!countryName) return null;
        
        // Map of common country names to their 2-letter ISO codes
        const countryMap = {
            'argentina': 'ar',
            'australia': 'au',
            'austria': 'at',
            'azerbaijan': 'az',
            'bahrain': 'bh',
            'belgium': 'be',
            'brazil': 'br',
            'canada': 'ca',
            'chile': 'cl',
            'china': 'cn',
            'czech republic': 'cz',
            'england': 'gb-eng', // Special case for England flag
            'finland': 'fi',
            'france': 'fr',
            'germany': 'de',
            'great britain': 'gb',
            'hong kong': 'hk',
            'hungary': 'hu',
            'india': 'in',
            'indonesia': 'id',
            'ireland': 'ie',
            'italy': 'it',
            'japan': 'jp',
            'kuwait': 'kw',
            'lithuania': 'lt',
            'macau': 'mo',
            'malaysia': 'my',
            'mexico': 'mx',
            'monaco': 'mc',
            'morocco': 'ma',
            'n/a': null, // Handle N/A case
            'netherlands': 'nl',
            'new zealand': 'nz',
            'poland': 'pl',
            'portugal': 'pt',
            'qatar': 'qa',
            'russia': 'ru',
            'saudi arabia': 'sa',
            'scotland': 'gb-sct', // Special case for Scotland flag
            'singapore': 'sg',
            'slovakia': 'sk',
            'south africa': 'za',
            'south korea': 'kr',
            'spain': 'es',
            'sweden': 'se',
            'switzerland': 'ch',
            'thailand': 'th',
            'turkey': 'tr',
            'usa': 'us',
            'united states': 'us',
            'united arab emirates': 'ae',
            'uruguay': 'uy',
            
            // Additional common variants and abbreviations
            'uk': 'gb',
            'united kingdom': 'gb',
            'uae': 'ae',
            'korea': 'kr',
            'czech': 'cz',
            'emirates': 'ae',
            'wales': 'gb-wls', // Special case for Wales
            'northern ireland': 'gb-nir' // Special case for Northern Ireland
        };
        
        const normalizedCountry = countryName.toLowerCase().trim();
        return countryMap[normalizedCountry] || null;
    }
    
    tracks.forEach(track => {
        // Create track card
        const trackCard = document.createElement('div');
        trackCard.className = 'track-card';
        
        // Get country code for flag
        const country = track.country || '';
        const countryCode = getCountryCode(country);
        
        // Add flag HTML if country code is available
        let flagHTML = '';
        if (countryCode) {
            flagHTML = `<div class="country-flag"><img src="https://flagcdn.com/w40/${countryCode}.png" alt="${country}" title="${country}"></div>`;
        }
        
        // Image container
        let imageContent;
        
        if (track.outlinePath) {
            // Using actual image when available
            const safeOutlinePath = safeImagePath(track.outlinePath);
            imageContent = `<img src="${safeOutlinePath}" alt="${track.name || 'Track'}" onerror="this.onerror=null; this.src='./assets/placeholder-track.png'">`;
        } else {
            // No image path available
            imageContent = `<div class="no-image-text">No image</div>`;
        }
        
        // Get track details
        const length = track.length || 'N/A';
        const pits = track.pitboxes || 'N/A';
        const year = track.year || 'N/A';
        
        // Update the track card HTML
        trackCard.innerHTML = `
            <div class="track-image-container">
                ${flagHTML}
                ${imageContent}
            </div>
            <div class="track-info">
                <div class="track-name">${track.name || 'Unnamed Track'}</div>
                <div class="track-details">
                    <span class="track-year">Year: ${year}</span>
                    <span class="track-length">Length: ${length}</span>
                    <span class="track-country">Country: ${country}</span>
                    <span class="track-pits">Pits: ${pits}</span>
                </div>
            </div>
            <button class="open-folder-btn" title="Open Track Folder">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
            </button>
        `;
        
        // Store track data in the card element for easy access
        trackCard.trackData = track;
        
        // Add click event to open track details
        trackCard.addEventListener('click', (e) => {
            // Don't trigger if clicking the open folder button
            if (e.target.closest('.open-folder-btn')) return;
            
            // Here you would navigate to track details page or show a modal
            console.log('Track clicked:', track.name);
        });
        
        // Add click event for open folder button
        const folderBtn = trackCard.querySelector('.open-folder-btn');
        folderBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const trackPath = track.folderPath;
            if (!trackPath) {
                console.error('Cannot open folder: Track path is missing', track);
                alert('Cannot open folder: Track path is missing');
                return;
            }
            console.log('Opening folder for:', track.name, 'Path:', trackPath);
            openTrackFolder(trackPath);
        });
        
        trackGrid.appendChild(trackCard);
    });
}