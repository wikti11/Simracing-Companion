document.addEventListener('DOMContentLoaded', () => {
    // Tab functionality
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            // Remove active class from all tabs and tab contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));
            // Add active class to clicked tab and corresponding tab content
            tab.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });

    // Grid Creator Functionality
    const setupGridCreator = () => {
        const carSearch = document.getElementById('car-search');
        const manufacturerFilter = document.getElementById('manufacturer-filter');
        const carClassFilter = document.getElementById('car-class-filter');
        const yearFilter = document.getElementById('year-filter');
        const resetFiltersBtn = document.getElementById('reset-filters');
        const importGridBtn = document.getElementById('import-grid');
        const savePresetBtn = document.getElementById('save-preset');
        const loadPresetBtn = document.getElementById('load-preset');
        const clearGridBtn = document.getElementById('clear-grid');
        const carGrid = document.getElementById('car-grid');

        let allCars = []; // Store all cars when loaded

        // Load car data when the page initializes
        window.electronAPI.getCarData()
            .then(cars => {
                allCars = cars;
                populateFilters(cars);
                renderCarGrid(cars);
            })
            .catch(error => {
                console.error('Error loading car data:', error);
            });

        // Populate filter dropdowns dynamically based on loaded cars
        const populateFilters = (cars) => {
            const manufacturers = [...new Set(cars.map(car => car.brand))].sort();
            const carClasses = [...new Set(cars.map(car => car.class))].sort();
            const years = [...new Set(cars.map(car => car.year))].sort();

            // Clear existing options
            manufacturerFilter.innerHTML = '<option value="">All Manufacturers</option>';
            carClassFilter.innerHTML = '<option value="">All Classes</option>';
            yearFilter.innerHTML = '<option value="">All Years</option>';

            manufacturers.forEach(manufacturer => {
                const option = document.createElement('option');
                option.value = manufacturer;
                option.textContent = manufacturer;
                manufacturerFilter.appendChild(option);
            });

            carClasses.forEach(carClass => {
                const option = document.createElement('option');
                option.value = carClass;
                option.textContent = carClass;
                carClassFilter.appendChild(option);
            });

            years.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                yearFilter.appendChild(option);
            });
        };

        // Render car grid with optional filtering
        const renderCarGrid = (cars) => {
            carGrid.innerHTML = ''; // Clear existing grid
            cars.forEach(car => {
                const carCard = document.createElement('div');
                carCard.classList.add('car-card');
                
                const brandImg = car.brandImagePath ? 
                    `<img src="${car.brandImagePath}" alt="${car.brand} logo" class="brand-logo">` : 
                    '';
                
                const carImg = car.imagePath ? 
                    `<img src="${car.imagePath}" alt="${car.name}" class="car-image">` : 
                    '<div class="no-image">No Image</div>';

                carCard.innerHTML = `
                    <div class="car-card-header">
                        ${brandImg}
                        <h3>${car.name}</h3>
                    </div>
                    ${carImg}
                    <div class="car-card-details">
                        <p>Brand: ${car.brand}</p>
                        <p>Class: ${car.class}</p>
                        <p>Year: ${car.year}</p>
                        <div class="car-card-actions">
                            <button class="open-folder" data-car-id="${car.id}">Open Folder</button>
                        </div>
                    </div>
                `;

                // Add event listener to open car folder
                carCard.querySelector('.open-folder').addEventListener('click', (e) => {
                    const carId = e.target.dataset.carId;
                    window.electronAPI.openCarFolder(carId)
                        .catch(error => {
                            console.error('Failed to open car folder:', error);
                            alert(`Failed to open folder: ${error.message}`);
                        });
                });

                carGrid.appendChild(carCard);
            });
        };

        // Filtering logic
        const updateCarList = () => {
            const searchTerm = carSearch.value.toLowerCase();
            const manufacturerValue = manufacturerFilter.value;
            const classValue = carClassFilter.value;
            const yearValue = yearFilter.value;

            const filteredCars = allCars.filter(car => 
                (searchTerm === '' || car.name.toLowerCase().includes(searchTerm)) &&
                (manufacturerValue === '' || car.brand === manufacturerValue) &&
                (classValue === '' || car.class === classValue) &&
                (yearValue === '' || car.year === yearValue)
            );

            renderCarGrid(filteredCars);
        };

        // Event listeners for filtering
        carSearch.addEventListener('input', updateCarList);
        manufacturerFilter.addEventListener('change', updateCarList);
        carClassFilter.addEventListener('change', updateCarList);
        yearFilter.addEventListener('change', updateCarList);

        // Reset filters
        resetFiltersBtn.addEventListener('click', () => {
            carSearch.value = '';
            manufacturerFilter.selectedIndex = 0;
            carClassFilter.selectedIndex = 0;
            yearFilter.selectedIndex = 0;
            renderCarGrid(allCars);
        });

        // Placeholder implementations (to be properly implemented later)
        savePresetBtn.addEventListener('click', () => {
            console.log('Save Preset clicked');
            // TODO: Implement save preset functionality
        });

        loadPresetBtn.addEventListener('click', () => {
            console.log('Load Preset clicked');
            // TODO: Implement load preset functionality
        });

        clearGridBtn.addEventListener('click', () => {
            console.log('Clear Grid clicked');
            renderCarGrid([]);
        });

        importGridBtn.addEventListener('click', () => {
            console.log('Import Grid clicked');
            // TODO: Implement grid import functionality
        });
    };

    setupGridCreator();
});