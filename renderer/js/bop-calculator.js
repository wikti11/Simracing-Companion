document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const addRowBtn = document.getElementById('add-row-btn');
    const calculateBtn = document.getElementById('calculate-btn');
    const sampleRowsContainer = document.getElementById('sample-rows');
    const resultsContainer = document.getElementById('results');
    const targetError = document.getElementById('target-error');
    const samplesError = document.getElementById('samples-error');
    
    // Results elements
    const resultBallast = document.getElementById('result-ballast');
    const resultRestrictor = document.getElementById('result-restrictor');
    const resultLaptime = document.getElementById('result-laptime');
    
    // Event listeners
    addRowBtn.addEventListener('click', addSampleRow);
    calculateBtn.addEventListener('click', calculateBoP);
    
    // Initialize event listeners for first row
    initializeRowEventListeners(document.querySelector('.sample-row'));
    
    // Add a new sample row
    function addSampleRow() {
        const rowCount = sampleRowsContainer.querySelectorAll('.sample-row').length;
        const newRowId = rowCount + 1;
        
        const rowTemplate = `
            <div class="sample-row" data-row-id="${newRowId}">
                <div class="sample-inputs">
                    <div class="sample-input">
                        <label>Ballast (kg):</label>
                        <input type="number" class="ballast-input" placeholder="0-200" min="0" max="200">
                    </div>
                    <div class="sample-input">
                        <label>Restrictor (mm):</label>
                        <input type="number" class="restrictor-input" placeholder="0-50" min="0" max="50" step="1">
                    </div>
                    <div class="sample-input laptime-container">
                        <label>Laptime:</label>
                        <div class="laptime-inputs sample-laptime">
                            <div class="laptime-input">
                                <input type="number" class="lap-minutes" placeholder="Min" min="0" max="59">
                                <span class="laptime-separator">:</span>
                            </div>
                            <div class="laptime-input">
                                <input type="number" class="lap-seconds" placeholder="Sec" min="0" max="59" step="1">
                                <span class="laptime-separator">.</span>
                            </div>
                            <div class="laptime-input">
                                <input type="number" class="lap-milliseconds" placeholder="ms" min="0" max="999" step="1">
                            </div>
                        </div>
                    </div>
                    <div class="sample-actions">
                        <button class="remove-row-btn action-btn" title="Remove row">✕</button>
                    </div>
                </div>
            </div>
        `;
        
        sampleRowsContainer.insertAdjacentHTML('beforeend', rowTemplate);
        
        // Initialize event listeners for the new row
        const newRow = sampleRowsContainer.querySelector(`.sample-row[data-row-id="${newRowId}"]`);
        initializeRowEventListeners(newRow);
    }
    
    // Initialize event listeners for a row
    function initializeRowEventListeners(row) {
        const removeBtn = row.querySelector('.remove-row-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', function() {
                // Don't remove if it's the last row
                if (sampleRowsContainer.querySelectorAll('.sample-row').length > 1) {
                    row.remove();
                }
            });
        }
    }
    
    // Convert laptime to seconds
    function laptimeToSeconds(minutes, seconds, milliseconds) {
        return (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0) + (parseInt(milliseconds) || 0) / 1000;
    }
    
    // Format seconds to laptime string with milliseconds
    function secondsToLaptime(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        const milliseconds = Math.round((totalSeconds % 1) * 1000);
        
        // Format with leading zeros
        const formattedSeconds = seconds.toString().padStart(2, '0');
        const formattedMilliseconds = milliseconds.toString().padStart(3, '0');
        
        return `${minutes}:${formattedSeconds}.${formattedMilliseconds}`;
    }
    
    // Validate input data
    function validateInputs() {
        let isValid = true;
        
        // Validate target laptime
        const targetMinutes = document.getElementById('target-minutes').value;
        const targetSeconds = document.getElementById('target-seconds').value;
        const targetMilliseconds = document.getElementById('target-milliseconds').value;
        
        if (!targetMinutes && !targetSeconds && !targetMilliseconds) {
            targetError.style.display = 'block';
            isValid = false;
        } else {
            targetError.style.display = 'none';
        }
        
        // Validate sample data - need at least 3 valid points for interpolation
        const rows = sampleRowsContainer.querySelectorAll('.sample-row');
        let validSamples = 0;
        
        rows.forEach(row => {
            const ballast = row.querySelector('.ballast-input').value;
            const restrictor = row.querySelector('.restrictor-input').value;
            const minutes = row.querySelector('.lap-minutes').value;
            const seconds = row.querySelector('.lap-seconds').value;
            const milliseconds = row.querySelector('.lap-milliseconds').value;
            
            if (ballast && restrictor && (minutes || seconds || milliseconds)) {
                validSamples++;
            }
        });
        
        if (validSamples < 3) {
            samplesError.style.display = 'block';
            isValid = false;
        } else {
            samplesError.style.display = 'none';
        }
        
        return isValid;
    }
    
    // Calculate BoP
    function calculateBoP() {
        // Validate inputs first
        if (!validateInputs()) {
            resultsContainer.style.display = 'none';
            return;
        }
        
        // Get target laptime
        const targetMinutes = parseInt(document.getElementById('target-minutes').value) || 0;
        const targetSeconds = parseInt(document.getElementById('target-seconds').value) || 0;
        const targetMilliseconds = parseInt(document.getElementById('target-milliseconds').value) || 0;
        const targetLaptime = laptimeToSeconds(targetMinutes, targetSeconds, targetMilliseconds);
        
        // Collect sample data
        const data = [];
        const rows = sampleRowsContainer.querySelectorAll('.sample-row');
        
        rows.forEach(row => {
            const ballast = parseInt(row.querySelector('.ballast-input').value) || 0;
            const restrictor = parseInt(row.querySelector('.restrictor-input').value) || 0;
            const minutes = parseInt(row.querySelector('.lap-minutes').value) || 0;
            const seconds = parseInt(row.querySelector('.lap-seconds').value) || 0;
            const milliseconds = parseInt(row.querySelector('.lap-milliseconds').value) || 0;
            const laptime = laptimeToSeconds(minutes, seconds, milliseconds);
            
            if (ballast >= 0 && restrictor >= 0 && laptime > 0) {
                data.push({
                    ballast: ballast,
                    restrictor: restrictor,
                    laptime: laptime
                });
            }
        });
        
        // Implement simplified grid search and linear interpolation
        const results = findOptimalBoP(data, targetLaptime);
        
        // Display results
        resultBallast.textContent = `${results.ballast} kg`;
        resultRestrictor.textContent = `${results.restrictor} mm`;
        resultLaptime.textContent = secondsToLaptime(results.laptime);
        
        resultsContainer.style.display = 'block';
    }
    
    // Find optimal BoP using grid interpolation
    function findOptimalBoP(data, targetLaptime) {
        // Create ballast and restrictor ranges for our grid
        const ballastMin = Math.min(...data.map(d => d.ballast));
        const ballastMax = Math.max(...data.map(d => d.ballast));
        const restrictorMin = Math.min(...data.map(d => d.restrictor));
        const restrictorMax = Math.max(...data.map(d => d.restrictor));
        
        // Create grid points
        const ballastStep = 10;
        const restrictorStep = 1;
        const ballastRange = [];
        const restrictorRange = [];
        
        // Generate ranges
        for (let b = ballastMin; b <= ballastMax; b += ballastStep) {
            ballastRange.push(b);
        }
        
        for (let r = restrictorMin; r <= restrictorMax; r += restrictorStep) {
            restrictorRange.push(r);
        }
        
        // Ensure we have the min and max values
        if (!ballastRange.includes(ballastMin)) ballastRange.push(ballastMin);
        if (!ballastRange.includes(ballastMax)) ballastRange.push(ballastMax);
        if (!restrictorRange.includes(restrictorMin)) restrictorRange.push(restrictorMin);
        if (!restrictorRange.includes(restrictorMax)) restrictorRange.push(restrictorMax);
        
        // Create grid
        const grid = [];
        for (const ballast of ballastRange) {
            for (const restrictor of restrictorRange) {
                // Estimate laptime at this grid point using linear interpolation
                const estimatedLaptime = estimateLaptime(data, ballast, restrictor);
                if (estimatedLaptime) {
                    grid.push({
                        ballast: ballast,
                        restrictor: restrictor,
                        laptime: estimatedLaptime
                    });
                }
            }
        }
        
        // Find grid point closest to target laptime
        let minDiff = Infinity;
        let bestPoint = null;
        
        for (const point of grid) {
            const diff = Math.abs(point.laptime - targetLaptime);
            if (diff < minDiff) {
                minDiff = diff;
                bestPoint = point;
            }
        }
        
        return bestPoint || { ballast: 0, restrictor: 0, laptime: 0 };
    }
    
    // Estimate laptime at a specific ballast and restrictor using weighted average
    function estimateLaptime(data, ballast, restrictor) {
        // Need at least 3 data points for a decent interpolation
        if (data.length < 3) return null;
        
        // Calculate weighted average based on inverse distance
        let totalWeight = 0;
        let weightedSum = 0;
        
        for (const point of data) {
            // Calculate Euclidean distance (simple 2D distance)
            // Scale restrictor more since its range is smaller
            const distBallast = point.ballast - ballast;
            const distRestrictor = (point.restrictor - restrictor) * 5; // Scale factor for restrictor
            const distance = Math.sqrt(distBallast * distBallast + distRestrictor * distRestrictor);
            
            // Avoid division by zero
            if (distance < 0.001) {
                return point.laptime; // Exact match
            }
            
            // Use inverse distance weighting
            const weight = 1 / (distance * distance);
            weightedSum += point.laptime * weight;
            totalWeight += weight;
        }
        
        if (totalWeight > 0) {
            return weightedSum / totalWeight;
        }
        
        return null;
    }
});