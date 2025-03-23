// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the gear ratio calculator page
    const calculatorContainer = document.getElementById('gear-ratio-calculator-container');
    if (!calculatorContainer) return;

    // Get elements
    const calculateBtn = document.getElementById('calculate-btn');
    const gearsInput = document.getElementById('gears');
    const firstGearInput = document.getElementById('first-gear-speed');
    const finalGearInput = document.getElementById('final-gear-speed');
    const resultsContainer = document.getElementById('results');
    const gearResultsContainer = document.getElementById('gear-results-container');

    // Clear any default values in inputs to ensure they start empty
    gearsInput.value = '';
    firstGearInput.value = '';
    finalGearInput.value = '';

    // Function to calculate gear ratios (translated from Python)
    function calculateGearRatios(gears, firstGearSpeed, finalGearSpeed) {
        // Calculate the step size for the speed increment
        const step = (finalGearSpeed - firstGearSpeed) / (gears - 1);
        
        // Create an array to store the top speeds for each gear
        const gearSpeeds = [];
        
        for (let i = 0; i < gears; i++) {
            gearSpeeds.push(firstGearSpeed + step * i);
        }
        
        return gearSpeeds;
    }
    
    // Function to get ordinal suffix (1st, 2nd, 3rd, etc.)
    function getOrdinalSuffix(num) {
        if (num === 1) return 'st';
        if (num === 2) return 'nd';
        if (num === 3) return 'rd';
        return 'th';
    }
    
    // Function to display results
    function displayResults(gearSpeeds) {
        gearResultsContainer.innerHTML = '';
        
        gearSpeeds.forEach((speed, index) => {
            const gearNumber = index + 1;
            
            // Create gear result element
            const gearResult = document.createElement('div');
            gearResult.className = 'gear-result';
            
            // Create gear number element
            const gearNumberElement = document.createElement('div');
            gearNumberElement.className = 'gear-number';
            
            // Get ordinal suffix
            const ordinal = getOrdinalSuffix(gearNumber);
            
            gearNumberElement.textContent = `${gearNumber}${ordinal} Gear`;
            
            // Create speed element
            const speedElement = document.createElement('div');
            speedElement.textContent = `${speed.toFixed(1)} km/h`;
            
            // Append elements to gear result
            gearResult.appendChild(gearNumberElement);
            gearResult.appendChild(speedElement);
            
            // Append gear result to results container
            gearResultsContainer.appendChild(gearResult);
        });
        
        resultsContainer.style.display = 'block';
    }
    
    // Function to validate inputs
    function validateInputs() {
        // Reset error messages
        document.querySelectorAll('.error').forEach(el => el.style.display = 'none');
        
        // Get user input
        const gears = parseInt(gearsInput.value);
        const firstGearSpeed = parseFloat(firstGearInput.value);
        const finalGearSpeed = parseFloat(finalGearInput.value);
        
        // Validate input
        let isValid = true;
        
        if (isNaN(gears) || gears < 2 || gears > 8) {
            document.getElementById('gears-error').style.display = 'block';
            isValid = false;
        }
        
        if (isNaN(firstGearSpeed) || firstGearSpeed <= 0) {
            document.getElementById('first-gear-error').style.display = 'block';
            isValid = false;
        }
        
        if (isNaN(finalGearSpeed) || finalGearSpeed <= firstGearSpeed) {
            document.getElementById('final-gear-error').style.display = 'block';
            isValid = false;
        }
        
        return {
            isValid,
            gears,
            firstGearSpeed,
            finalGearSpeed
        };
    }
    
    // Function to handle calculation
    function calculate() {
        const validation = validateInputs();
        
        if (validation.isValid) {
            // Calculate gear ratios
            const gearSpeeds = calculateGearRatios(
                validation.gears, 
                validation.firstGearSpeed, 
                validation.finalGearSpeed
            );
            
            // Display results
            displayResults(gearSpeeds);
        } else {
            resultsContainer.style.display = 'none';
        }
    }
    
    // Event listener for calculate button
    calculateBtn.addEventListener('click', calculate);
    
    // Event listeners for enter key press in input fields
    const inputFields = [gearsInput, firstGearInput, finalGearInput];
    
    inputFields.forEach(input => {
        input.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault(); // Prevent form submission
                calculate();
            }
        });
    });
    
    // Hide results initially since inputs are empty
    resultsContainer.style.display = 'none';
});