// car-search.js - Updated with filtering functionality

document.addEventListener('DOMContentLoaded', () => {
    // Load car data using IPC
    loadCarDataFromSystem();
    
    // Set up search functionality
    const searchInput = document.getElementById('car-search-input');
    searchInput.addEventListener('input', () => {
        applyFilters();
    });
    
    // Set up filter functionality
    const yearFilter = document.getElementById('year-filter');
    const classFilter = document.getElementById('class-filter');
    
    yearFilter.addEventListener('change', applyFilters);
    classFilter.addEventListener('change', applyFilters);
    
    // Set up reset button
    const resetButton = document.getElementById('reset-filters');
    resetButton.addEventListener('click', resetFilters);
});

// Global variable to store all loaded cars
let allCars = [];
// Global variables to store unique years and classes
let allYears = [];
let allClasses = [];

// Function to sort cars alphabetically by name
function sortCarsByName(cars) {
    return cars.sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
    });
}

// Function to populate filter dropdowns
function populateFilters() {
    const yearFilter = document.getElementById('year-filter');
    const classFilter = document.getElementById('class-filter');
    
    // Clear existing options except the first one
    yearFilter.innerHTML = '<option value="">All Years</option>';
    classFilter.innerHTML = '<option value="">All Classes</option>';
    
    // Extract unique years and classes
    allYears = [...new Set(allCars.map(car => car.year).filter(Boolean))];
    allClasses = [...new Set(allCars.map(car => car.class).filter(Boolean))];
    
    // Sort years numerically in descending order (newest first)
    allYears.sort((a, b) => b - a);
    
    // Sort classes alphabetically
    allClasses.sort();
    
    // Add year options
    allYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearFilter.appendChild(option);
    });
    
    // Add class options
    allClasses.forEach(carClass => {
        const option = document.createElement('option');
        option.value = carClass;
        option.textContent = carClass;
        classFilter.appendChild(option);
    });
}

// Function to reset all filters
function resetFilters() {
    const searchInput = document.getElementById('car-search-input');
    const yearFilter = document.getElementById('year-filter');
    const classFilter = document.getElementById('class-filter');
    
    searchInput.value = '';
    yearFilter.value = '';
    classFilter.value = '';
    
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
    const searchTerm = document.getElementById('car-search-input').value.toLowerCase().trim();
    const yearFilter = document.getElementById('year-filter').value;
    const classFilter = document.getElementById('class-filter').value;
    
    // Filter the cars based on all criteria
    const filteredCars = allCars.filter(car => {
        // Search term filter
        const matchesSearch = !searchTerm || 
            (car.name && car.name.toLowerCase().includes(searchTerm)) ||
            (car.brand && car.brand.toLowerCase().includes(searchTerm)) ||
            (car.class && car.class.toLowerCase().includes(searchTerm)) ||
            (car.tags && car.tags.some(tag => tag.toLowerCase().includes(searchTerm)));
            
        // Year filter
        const matchesYear = !yearFilter || car.year == yearFilter;
        
        // Class filter
        const matchesClass = !classFilter || car.class == classFilter;
        
        // Item passes if it matches all applied filters
        return matchesSearch && matchesYear && matchesClass;
    });
    
    // Render the filtered cars
    renderCars(filteredCars);
    
    // Update the results info text
    updateResultsInfo(searchTerm, yearFilter, classFilter, filteredCars.length);
}

// Function to update the results info text
function updateResultsInfo(searchTerm, yearFilter, classFilter, resultCount) {
    const infoElement = document.getElementById('search-results-info');
    
    // Create a description of the active filters
    let filterDescription = [];
    
    if (searchTerm) {
        filterDescription.push(`"${searchTerm}"`);
    }
    
    if (yearFilter) {
        filterDescription.push(`Year: ${yearFilter}`);
    }
    
    if (classFilter) {
        filterDescription.push(`Class: ${classFilter}`);
    }
    
    // Construct the final message
    let message;
    if (filterDescription.length > 0) {
        message = `Search results for ${filterDescription.join(', ')}`;
    } else {
        message = 'All cars (A-Z)';
    }
    
    // Add count
    message += ` - ${resultCount} car${resultCount !== 1 ? 's' : ''} found`;
    
    infoElement.textContent = message;
}

// Function to load car data from the system
async function loadCarDataFromSystem() {
    try {
        // Show loading indicator or message here if desired
        document.getElementById('car-grid').innerHTML = `
            <div class="loading-message">
                Loading car data...
            </div>
        `;
        
        // Get car data from main process
        if (window.api && typeof window.api.getCars === 'function') {
            // Using IPC if available (in actual Electron app)
            allCars = await window.api.getCars();
            
            // Check if we got data back
            if (allCars && allCars.length > 0) {
                // Sort all cars alphabetically by name
                allCars = sortCarsByName(allCars);
                
                // Populate filter dropdowns
                populateFilters();
                
                // Render all cars in alphabetical order
                renderCars(allCars);
                document.getElementById('search-results-info').textContent = `All cars (A-Z) - ${allCars.length} cars found`;
            } else {
                // No data was returned
                document.getElementById('car-grid').innerHTML = `
                    <div class="error-message">
                        No cars found. Check if your Assetto Corsa folder is correctly configured.
                    </div>
                `;
            }
        } else {
            // API not available - show error message
            console.error('API not available. Cannot load car data.');
            document.getElementById('car-grid').innerHTML = `
                <div class="error-message">
                    Cannot load car data. API not available.
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Error loading car data:', error);
        document.getElementById('car-grid').innerHTML = `
            <div class="error-message">
                Error loading car data: ${error.message}
            </div>
        `;
    }
}

// Function to open car's folder in file explorer
async function openCarFolder(carId) {
    try {
        if (window.api && typeof window.api.openCarFolder === 'function') {
            await window.api.openCarFolder(carId);
        } else {
            console.warn('Cannot open car folder: API not available or openCarFolder method not found');
            alert(`Cannot open car folder: API not available`);
        }
    } catch (error) {
        console.error('Error opening car folder:', error);
        alert(`Error opening car folder: ${error.message}`);
    }
}

function renderCars(cars) {
    const carGrid = document.getElementById('car-grid');
    carGrid.innerHTML = ''; // Clear existing cars
    
    if (!cars || cars.length === 0) {
        carGrid.innerHTML = `
            <div class="no-results">
                No cars found matching your search.
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
    
    cars.forEach(car => {
        // Create car card
        const carCard = document.createElement('div');
        carCard.className = 'car-card';
        
        // Add data attribute for current skin index
        carCard.dataset.currentSkinIndex = '0';
        
        // Image container with proper handling for missing images and skin navigation
        let imageContent;
        
        if (car.skins && car.skins.length > 0) {
            // Using actual image when available
            const safeSkinPath = safeImagePath(car.skins[0].imagePath);
            imageContent = `
                <div class="skin-navigation">
                    <button class="skin-nav-btn skin-prev ${car.skins.length <= 1 ? 'disabled' : ''}" title="Previous Skin">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                    </button>
                    <img src="${safeSkinPath}" alt="${car.name || 'Car'}" onerror="this.onerror=null; this.src='./assets/placeholder-car.png'">
                    <button class="skin-nav-btn skin-next ${car.skins.length <= 1 ? 'disabled' : ''}" title="Next Skin">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </button>
                    <div class="skin-counter">${car.skins.length > 0 ? `1/${car.skins.length}` : '0/0'}</div>
                </div>
            `;
        } else if (car.imagePath) {
            // Single image without navigation
            const safeImagePath = safeImagePath(car.imagePath);
            imageContent = `<img src="${safeImagePath}" alt="${car.name || 'Car'}" onerror="this.onerror=null; this.src='./assets/placeholder-car.png'">`;
        } else {
            // No image path available
            imageContent = `<div class="no-image-text">No image</div>`;
        }
        
        // Get power and torque values
        const power = car.specs?.bhp || car.specs?.power || 'N/A';
        const torque = car.specs?.torque || 'N/A';
        
        // Update the car card HTML
        carCard.innerHTML = `
            <div class="car-image-container">${imageContent}</div>
            <div class="car-badge">
                ${car.brandImagePath 
                    ? `<img src="${safeImagePath(car.brandImagePath)}" alt="${car.brand || 'Unknown'}" class="brand-badge-img">` 
                    : `${car.brand || 'Unknown'}`}
            </div>
            <div class="car-info">
                <div class="car-name">${car.name || 'Unnamed Car'}</div>
                <div class="car-details">
                    <span class="car-year">Year: ${car.year || 'N/A'}</span>
                    <span class="car-power">Power: ${power}</span>
                    <span class="car-class">Class: ${car.class || 'N/A'}</span>
                    <span class="car-torque">Torque: ${torque}</span>
                </div>
            </div>
            <button class="open-folder-btn" title="Open Car Folder">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
            </button>
        `;
        
        // Store car data in the card element for easy access
        carCard.carData = car;
        
        // Add click event to open car details
        carCard.addEventListener('click', (e) => {
            // Don't trigger if clicking the navigation buttons or open folder button
            if (e.target.closest('.skin-nav-btn') || e.target.closest('.open-folder-btn')) return;
            
            // Here you would navigate to car details page or show a modal
            console.log('Car clicked:', car.name);
        });
        
        // Add click event for open folder button
        const folderBtn = carCard.querySelector('.open-folder-btn');
        folderBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const carId = car.id || car.folderName;
            if (!carId) {
                console.error('Cannot open folder: Car ID is missing', car);
                alert('Cannot open folder: Car ID is missing');
                return;
            }
            console.log('Opening folder for:', car.name, 'ID:', carId);
            openCarFolder(carId);
        });
        
        // Add navigation events if skin navigation is present
        const prevBtn = carCard.querySelector('.skin-prev');
        const nextBtn = carCard.querySelector('.skin-next');
        
        if (prevBtn && nextBtn) {
            prevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                navigateSkin(carCard, -1);
            });
            
            nextBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                navigateSkin(carCard, 1);
            });
        }
        
        carGrid.appendChild(carCard);
    });
    
    function navigateSkin(carCard, direction) {
        const car = carCard.carData;
        if (!car.skins || car.skins.length <= 1) return;
        
        let currentIndex = parseInt(carCard.dataset.currentSkinIndex);
        currentIndex = (currentIndex + direction + car.skins.length) % car.skins.length;
        carCard.dataset.currentSkinIndex = currentIndex;
        
        // Update the image source with safely encoded path
        const skinImage = carCard.querySelector('.skin-navigation img');
        if (skinImage) {
            const safePath = safeImagePath(car.skins[currentIndex].imagePath);
            skinImage.src = safePath;
        }
        
        // Update the skin counter
        const skinCounter = carCard.querySelector('.skin-counter');
        if (skinCounter) {
            skinCounter.textContent = `${currentIndex + 1}/${car.skins.length}`;
        }
    }
    
    // Helper function to safely handle image paths with spaces and special characters
    function safeImagePath(path) {
        if (!path) return '';
        // Replace spaces with %20 and # with %23 specifically
        return path.replace(/ /g, '%20').replace(/#/g, '%23');
    }
}

