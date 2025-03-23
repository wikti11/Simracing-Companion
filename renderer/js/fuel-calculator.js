// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the fuel calculator page
    const calculatorContainer = document.getElementById('fuel-calculator-container');
    if (!calculatorContainer) return;

    // Get mode selector elements
    const timeModeBtn = document.getElementById('time-mode-btn');
    const lapsModeBtn = document.getElementById('laps-mode-btn');
    const timeInput = document.getElementById('time-input');
    const lapsInput = document.getElementById('laps-input');

    // Get input elements
    const raceTimeInput = document.getElementById('race-time');
    const raceLapsInput = document.getElementById('race-laps');
    const lapMinutesInput = document.getElementById('laptime-minutes');
    const lapSecondsInput = document.getElementById('laptime-seconds');
    const lapMillisecondsInput = document.getElementById('laptime-milliseconds');
    const fuelPerLapInput = document.getElementById('fuel-per-lap');
    const calculateBtn = document.getElementById('calculate-btn');
    const resultsContainer = document.getElementById('results');
    const fuelResultsContainer = document.getElementById('fuel-results-container');

    // Results elements
    const resultRaceDuration = document.getElementById('result-race-duration');
    const resultTotalLaps = document.getElementById('result-total-laps');

    // Set default values
    let currentMode = 'time';
    
    // Clear any existing inputs
    raceTimeInput.value = '';
    raceLapsInput.value = '';
    lapMinutesInput.value = '';
    lapSecondsInput.value = '';
    lapMillisecondsInput.value = '';
    fuelPerLapInput.value = '';

    // Mode switching functionality
    timeModeBtn.addEventListener('click', function() {
        currentMode = 'time';
        timeModeBtn.classList.add('active');
        lapsModeBtn.classList.remove('active');
        timeInput.style.display = 'block';
        lapsInput.style.display = 'none';
    });

    lapsModeBtn.addEventListener('click', function() {
        currentMode = 'laps';
        lapsModeBtn.classList.add('active');
        timeModeBtn.classList.remove('active');
        lapsInput.style.display = 'block';
        timeInput.style.display = 'none';
    });

    // Function to validate inputs
    function validateInputs() {
        // Reset error messages
        document.querySelectorAll('.error').forEach(el => el.style.display = 'none');
        
        // Get input values
        const raceTime = parseFloat(raceTimeInput.value);
        const raceLaps = parseInt(raceLapsInput.value);
        const lapMinutes = parseInt(lapMinutesInput.value) || 0;
        const lapSeconds = parseInt(lapSecondsInput.value) || 0;
        const lapMilliseconds = parseInt(lapMillisecondsInput.value) || 0;
        const fuelValues = fuelPerLapInput.value.split(',').map(val => parseFloat(val.trim())).filter(val => !isNaN(val));
        
        // Validate inputs
        let isValid = true;
        
        // Validate based on current mode
        if (currentMode === 'time') {
            if (isNaN(raceTime) || raceTime <= 0) {
                document.getElementById('race-time-error').style.display = 'block';
                isValid = false;
            }
        } else { // laps mode
            if (isNaN(raceLaps) || raceLaps <= 0) {
                document.getElementById('race-laps-error').style.display = 'block';
                isValid = false;
            }
        }
        
        // Validate lap time (at least one field must be filled)
        if ((lapMinutes === 0 && lapSeconds === 0 && lapMilliseconds === 0) ||
            (isNaN(lapMinutes) && isNaN(lapSeconds) && isNaN(lapMilliseconds))) {
            document.getElementById('laptime-error').style.display = 'block';
            isValid = false;
        }
        
        // Validate fuel values
        if (fuelValues.length === 0) {
            document.getElementById('fuel-per-lap-error').style.display = 'block';
            isValid = false;
        }
        
        return {
            isValid,
            raceTime,
            raceLaps,
            lapTime: (lapMinutes * 60 + lapSeconds + lapMilliseconds / 1000),
            fuelValues
        };
    }

    // Function to format time as "X hr Y min Z s" format
    function formatHumanReadableTime(timeInMinutes) {
        const totalSeconds = timeInMinutes * 60;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.round(totalSeconds % 60);
        
        let formattedTime = '';
        
        if (hours > 0) {
            formattedTime += `${hours} hr `;
        }
        
        if (minutes > 0 || hours > 0) {
            formattedTime += `${minutes} min `;
        }
        
        formattedTime += `${seconds} s`;
        
        return formattedTime;
    }

    // Function to calculate fuel requirements
    function calculateFuel() {
        const validation = validateInputs();
        
        if (!validation.isValid) {
            resultsContainer.style.display = 'none';
            return;
        }
        
        // Calculate total race laps and duration
        let raceLaps, raceTimeMinutes;
        
        if (currentMode === 'time') {
            raceTimeMinutes = validation.raceTime;
            raceLaps = Math.ceil((raceTimeMinutes * 60) / validation.lapTime);
        } else {
            raceLaps = validation.raceLaps;
            raceTimeMinutes = (raceLaps * validation.lapTime) / 60;
        }
        
        // Display race information with human-readable format
        resultRaceDuration.textContent = formatHumanReadableTime(raceTimeMinutes);
        resultTotalLaps.textContent = `${raceLaps} laps`;
        
        // Calculate fuel requirements for each consumption value
        fuelResultsContainer.innerHTML = '';
        
        validation.fuelValues.forEach((fuelPerLap, index) => {
            // Calculate minimum fuel needed
            const minimumFuel = fuelPerLap * raceLaps;
            const safeFuel = fuelPerLap * (raceLaps + 1);
            
            // Create fuel result element
            const fuelResult = document.createElement('div');
            fuelResult.className = 'fuel-result';
            
            // Fuel result header
            const fuelHeader = document.createElement('div');
            fuelHeader.className = 'fuel-result-header';
            fuelHeader.textContent = `Fuel Consumption: ${fuelPerLap.toFixed(2)} L/lap`;
            fuelResult.appendChild(fuelHeader);
            
            // Minimum fuel
            const minFuelItem = document.createElement('div');
            minFuelItem.className = 'fuel-result-item';
            
            const minFuelLabel = document.createElement('div');
            minFuelLabel.textContent = 'Minimum Fuel Required:';
            
            const minFuelValue = document.createElement('div');
            minFuelValue.textContent = `${minimumFuel.toFixed(2)} L`;
            
            minFuelItem.appendChild(minFuelLabel);
            minFuelItem.appendChild(minFuelValue);
            fuelResult.appendChild(minFuelItem);
            
            // Safe fuel
            const safeFuelItem = document.createElement('div');
            safeFuelItem.className = 'fuel-result-item';
            
            const safeFuelLabel = document.createElement('div');
            safeFuelLabel.textContent = 'Safe Fuel Required (+1 lap):';
            
            const safeFuelValue = document.createElement('div');
            safeFuelValue.textContent = `${safeFuel.toFixed(2)} L`;
            
            safeFuelItem.appendChild(safeFuelLabel);
            safeFuelItem.appendChild(safeFuelValue);
            fuelResult.appendChild(safeFuelItem);
            
            // Append to results container
            fuelResultsContainer.appendChild(fuelResult);
        });
        
        // Show results
        resultsContainer.style.display = 'block';
    }
    
    // Event listener for calculate button
    calculateBtn.addEventListener('click', calculateFuel);
    
    // Event listeners for enter key in input fields
    const inputFields = [
        raceTimeInput, raceLapsInput, 
        lapMinutesInput, lapSecondsInput, lapMillisecondsInput,
        fuelPerLapInput
    ];
    
    inputFields.forEach(input => {
        input.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                calculateFuel();
            }
        });
    });
    
    // Helper functions for lap time inputs (auto-focusing next input)
    lapMinutesInput.addEventListener('input', function() {
        if (this.value.length >= 2) {
            lapSecondsInput.focus();
        }
    });
    
    lapSecondsInput.addEventListener('input', function() {
        if (this.value.length >= 2) {
            lapMillisecondsInput.focus();
        }
    });
    
    // Hide results initially
    resultsContainer.style.display = 'none';
});