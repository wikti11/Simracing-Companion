document.addEventListener('DOMContentLoaded', () => {
    const acPathInput = document.getElementById('ac-path');
    const browseButton = document.getElementById('browse-ac-path');
    const saveButton = document.getElementById('save-settings');
    const pathValid = document.querySelector('.path-valid');
    const pathInvalid = document.querySelector('.path-invalid');
    const settingsSaved = document.querySelector('.settings-saved');

    // Load current settings
    loadSettings();

    // Validate path on input
    acPathInput.addEventListener('input', validatePath);

    // Browse button handler
    browseButton.addEventListener('click', async () => {
        // Check if running in Electron environment
        if (window.electronAPI && window.electronAPI.showOpenDialog) {
            const result = await window.electronAPI.showOpenDialog();
            if (!result.canceled && result.filePaths.length > 0) {
                acPathInput.value = result.filePaths[0];
                validatePath();
            }
        } else {
            // Fallback for non-Electron environments
            console.log("Electron API not available");
            
            // Create a file input element as a fallback
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'directory';
            fileInput.webkitdirectory = true;
            
            fileInput.addEventListener('change', (event) => {
                if (event.target.files.length > 0) {
                    // Get the directory path from the first file
                    const filePath = event.target.files[0].path;
                    const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
                    acPathInput.value = dirPath;
                    validatePath();
                }
            });
            
            fileInput.click();
        }
    });

    // Save settings button handler
    saveButton.addEventListener('click', async () => {
        if (validatePath()) {
            await saveSettings();
            showSaveConfirmation();
        }
    });

    function validatePath() {
        const path = acPathInput.value.trim();
       
        // Check if path ends with 'assettocorsa'
        const isValid = path && path.toLowerCase().endsWith('assettocorsa');
       
        if (isValid) {
            pathValid.style.display = 'block';
            pathInvalid.style.display = 'none';
        } else {
            pathValid.style.display = 'none';
            pathInvalid.style.display = 'block';
        }
       
        return isValid;
    }

    async function loadSettings() {
        try {
            // Check if Electron API is available
            if (window.electronAPI && window.electronAPI.getSettings) {
                const settings = await window.electronAPI.getSettings();
                if (settings && settings.acPath) {
                    acPathInput.value = settings.acPath;
                    validatePath();
                }
            } else {
                // Fallback: try to get settings from localStorage
                const savedSettings = localStorage.getItem('simracingCompanionSettings');
                if (savedSettings) {
                    try {
                        const settings = JSON.parse(savedSettings);
                        if (settings && settings.acPath) {
                            acPathInput.value = settings.acPath;
                            validatePath();
                        }
                    } catch (e) {
                        console.error('Error loading settings:', e);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async function saveSettings() {
        try {
            const acPath = acPathInput.value.trim();
            
            // Check if Electron API is available
            if (window.electronAPI && window.electronAPI.saveSettings) {
                await window.electronAPI.saveSettings({ acPath });
                console.log('Settings saved via Electron API');
                return true;
            } else {
                // Fallback: save to localStorage
                localStorage.setItem('simracingCompanionSettings', JSON.stringify({ acPath }));
                console.log('Settings saved to localStorage');
                return true;
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            return false;
        }
    }

    function showSaveConfirmation() {
        settingsSaved.style.display = 'block';
        setTimeout(() => {
            settingsSaved.style.display = 'none';
        }, 3000);
    }
});