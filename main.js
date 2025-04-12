const { BrowserWindow, app, ipcMain, shell, dialog } = require('electron');
const path = require('path'); 
const fs = require('fs');
const os = require('os');

// Settings storage path
const SETTINGS_PATH = path.join(app.getPath('userData'), 'settings.json');

// Settings object
let appSettings = {};

// Load settings at startup
function loadSettings() {
    try {
        if (fs.existsSync(SETTINGS_PATH)) {
            const data = fs.readFileSync(SETTINGS_PATH, 'utf8');
            appSettings = JSON.parse(data);
        } else {
            // Create empty settings file if it doesn't exist
            saveSettings(appSettings);
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
    return appSettings;
}

// Save settings to file
function saveSettings(settings) {
    try {
        fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8');
        appSettings = settings;
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

// Initialize settings
loadSettings();

const createMainWindow = () => {
    const mainWindow = new BrowserWindow({
        title: 'Simracing Companion',
        width: 1920,
        height: 1080,
        fullscreenable: true,
        frame: true, 
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.setMenu(null);
    mainWindow.maximize();
    mainWindow.loadFile(path.join(__dirname, './renderer/car-search.html'));
}

app.whenReady().then(() => {
    createMainWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});

// Navigation handler for sidebar
ipcMain.on('navigate', (event, pageName) => {
    const sender = event.sender;
    const currentWindow = BrowserWindow.fromWebContents(sender);
    
    if (currentWindow) {
        const pagePath = path.join(__dirname, './renderer/', `${pageName}.html`);
        
        if (fs.existsSync(pagePath)) {
            currentWindow.loadFile(pagePath);
        } else {
            console.error(`Page not found: ${pagePath}`);
        }
    }
});

// Get car and track paths based on settings
function getCarPath() {
    if (!appSettings.acPath) {
        return null;
    }
    return path.join(appSettings.acPath, 'content/cars');
}

function getTrackPath() {
    if (!appSettings.acPath) {
        return null;
    }
    return path.join(appSettings.acPath, 'content/tracks');
}

// Get settings - changed to camelCase to match frontend expectations
ipcMain.handle('getSettings', async () => {
    return appSettings;
});

// Save settings - changed to camelCase to match frontend expectations
ipcMain.handle('saveSettings', async (event, settings) => {
    saveSettings(settings);
    return true;
});

// Show directory selection dialog - changed to camelCase to match frontend expectations
ipcMain.handle('showOpenDialog', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select Assetto Corsa Installation Directory'
    });
    return result;
});

// Keep backward compatibility with kebab-case for any potential existing code
ipcMain.handle('get-settings', async () => {
    return appSettings;
});

ipcMain.handle('save-settings', async (event, settings) => {
    saveSettings(settings);
    return true;
});

ipcMain.handle('show-open-dialog', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select Assetto Corsa Installation Directory'
    });
    return result;
});

// Base path for Assetto Corsa cars and tracks
const USER_BRAND_BADGES_PATH = path.join(os.homedir(), 'AppData', 'Local', 'AcTools Content Manager', 'Data (User)', 'Brand Badges');
const DEFAULT_BRAND_BADGES_PATH = path.join(os.homedir(), 'AppData', 'Local', 'AcTools Content Manager', 'Data', 'Brand Badges');

ipcMain.handle('get-car-data', async (event, carsFolder) => {
    try {
        // Use the path from settings only
        const folderToUse = getCarPath();
        
        if (!folderToUse) {
            throw new Error('Assetto Corsa path not configured in settings');
        }
        
        return getCarsData(folderToUse);
    } catch (error) {
        console.error('Error loading car data:', error);
        return [];
    }
});

// Add this handler for opening car folders
ipcMain.handle('open-car-folder', async (event, carId) => {
    if (!carId) {
        throw new Error('Car ID is required');
    }
    
    // Use the path from settings
    const carsFolder = getCarPath();
    
    if (!carsFolder) {
        throw new Error('Assetto Corsa path not configured in settings');
    }
    
    // Combine with the specific car's ID to get the full path
    const carPath = path.join(carsFolder, carId);
    
    // Check if the folder exists
    if (!fs.existsSync(carPath)) {
        throw new Error(`Car folder not found: ${carPath}`);
    }
    
    // Open the folder in the OS file explorer
    const result = await shell.openPath(carPath);
    
    // shell.openPath returns an empty string on success, or an error message
    if (result !== '') {
        throw new Error(`Failed to open folder: ${result}`);
    }
    
    return true;
});

// Window control handlers
ipcMain.on('close-window', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) window.close();
});

ipcMain.on('minimize-window', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) window.minimize();
});

ipcMain.on('maximize-window', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
        if (window.isMaximized()) {
            window.unmaximize();
        } else {
            window.maximize();
        }
    }
});

// Function to sanitize JSON text with unescaped line breaks and HTML tags
function sanitizeJsonText(text) {
    try {
        // First, try regular JSON parsing - if it works, return the parsed object
        return JSON.parse(text);
    } catch (error) {
        // console.debug('Basic JSON parsing failed, attempting to fix malformed JSON...');
        
        try {
            // Method 1: Fix newlines inside string values
            // This finds all strings with unescaped newlines and escapes them
            let fixedText = text.replace(/("(?:[^"\\]|\\.)*")|[\n\r]+/g, (match, group) => {
                // If we matched a string (group is defined), return it unchanged
                // Otherwise, replace newlines with space
                return group || ' ';
            });
            
            return JSON.parse(fixedText);
        } catch (error2) {
            // console.debug('First repair method failed, trying more aggressive approach...');
            
            try {
                // Method 2: More aggressive - treat everything between description quotes as a single string
                // Find the description field and fix it - match from "description": " to the next "
                let fixedText = text.replace(/"description"\s*:\s*"([\s\S]*?)(?:"(?=\s*,|\s*}))/g, (match, content) => {
                    // Escape all newlines and quotes in the content
                    let sanitizedContent = content
                        .replace(/\\/g, '\\\\') // Double escape existing backslashes
                        .replace(/\n/g, '\\n')  // Escape newlines
                        .replace(/\r/g, '\\r')  // Escape carriage returns
                        .replace(/"/g, '\\"');  // Escape quotes that aren't already escaped
                    
                    return `"description":"${sanitizedContent}"`;
                });
                
                return JSON.parse(fixedText);
            } catch (error3) {
                // console.debug('Second repair method failed, trying restructuring approach...');
                
                try {
                    // Method 3: Manual structure rebuild
                    // First, let's extract what seems to be the start of a valid JSON object
                    const startBraceMatch = text.match(/^\s*\{/);
                    const endBraceMatch = text.match(/\}\s*$/);
                    
                    if (!startBraceMatch || !endBraceMatch) {
                        console.error('JSON is severely malformed (missing braces)');
                        throw new Error('JSON is severely malformed');
                    }

                    // Split by potential property boundaries
                    let segments = text.split(/,\s*(?=")/);
                    let rebuiltObject = {};
                    
                    for (let segment of segments) {
                        // Try to extract key-value pairs
                        let match = segment.match(/"\s*([^"]+)\s*"\s*:\s*(.+)/s);
                        if (match) {
                            let key = match[1].trim();
                            let value = match[2].trim();
                            
                            // Handle different value types
                            if (value.startsWith('"') && value.includes('\n')) {
                                // Multiline string
                                // Find the closing quote that's either followed by a comma or the end brace
                                const valueEndMatches = value.match(/"(?=\s*$|\s*,|\s*\})/g);
                                if (valueEndMatches && valueEndMatches.length > 0) {
                                    const lastIndex = value.lastIndexOf(valueEndMatches[valueEndMatches.length - 1]);
                                    if (lastIndex > 0) {
                                        value = value.substring(0, lastIndex + 1);
                                        // Now properly escape the content
                                        value = value.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
                                    }
                                }
                            }
                            
                            try {
                                // Try to parse the value
                                rebuiltObject[key] = JSON.parse(value);
                            } catch (e) {
                                // If it's a string but couldn't be parsed, wrap it properly
                                if (value.startsWith('"')) {
                                    value = value.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
                                    try {
                                        rebuiltObject[key] = JSON.parse(value);
                                    } catch (e2) {
                                        // console.warn(`Could not parse value for key "${key}": ${value.substring(0, 50)}...`);
                                        rebuiltObject[key] = value.replace(/"/g, '');
                                    }
                                } else {
                                    // Handle non-string values like arrays or objects
                                    try {
                                        if (value.match(/^\s*\[.*\]\s*$/s)) {
                                            // It's an array - try to clean it
                                            let cleanArray = value.replace(/\n/g, ' ').replace(/\r/g, ' ');
                                            rebuiltObject[key] = JSON.parse(cleanArray);
                                        } else {
                                            rebuiltObject[key] = value;
                                        }
                                    } catch (e3) {
                                        // console.warn(`Could not parse complex value for key "${key}"`);
                                        rebuiltObject[key] = null;
                                    }
                                }
                            }
                        } else if (segment.includes('{')) {
                            // This might be the start of the object with potential metadata
                            try {
                                const firstProperty = segment.match(/\{\s*"([^"]+)"\s*:\s*(.+)/s);
                                if (firstProperty) {
                                    let key = firstProperty[1].trim();
                                    let value = firstProperty[2].trim();
                                    
                                    // Parse as above
                                    try {
                                        rebuiltObject[key] = JSON.parse(value);
                                    } catch (e) {
                                        // Simplified handling
                                        rebuiltObject[key] = value.replace(/"/g, '');
                                    }
                                }
                            } catch (e) {
                                // console.warn('Could not parse first segment of JSON');
                            }
                        }
                    }
                    
                    return rebuiltObject;
                } catch (error4) {
                    console.error('All JSON repair methods failed for:', text.substring(0, 200) + '...');
                    
                    // Final fallback - try to extract at least the name and basic info
                    try {
                        const nameMatch = text.match(/"name"\s*:\s*"([^"]+)"/);
                        const brandMatch = text.match(/"brand"\s*:\s*"([^"]+)"/);
                        
                        let fallbackObject = {
                            name: nameMatch ? nameMatch[1] : 'Unknown',
                            brand: brandMatch ? brandMatch[1] : 'Unknown',
                            description: '*** Error parsing description ***',
                            class: 'Unknown',
                            specs: {},
                            tags: []
                        };
                        
                        console.warn('Using fallback object with minimal data');
                        return fallbackObject;
                    } catch (finalError) {
                        // If absolutely nothing works, throw the original error
                        throw error;
                    }
                }
            }
        }
    }
}

function getCarsData(carsFolder) {
    // Ensure the path is correctly resolved
    carsFolder = path.resolve(carsFolder);

    const cars = [];

    if (!fs.existsSync(carsFolder)) {
        console.error(`Cars directory not found: "${carsFolder}"`);
        return cars;
    }

    const carFolders = fs.readdirSync(carsFolder, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    carFolders.forEach(carFolder => {
        const carFolderPath = path.resolve(carsFolder, carFolder); // Ensure proper resolution

        try {
            const uiCarPath = path.join(carFolderPath, 'ui', 'ui_car.json');

            if (fs.existsSync(uiCarPath)) {
                const carDataText = fs.readFileSync(uiCarPath, { encoding: 'utf8' });
                
                // Use the sanitized JSON parser
                let carData;
                try {
                    carData = sanitizeJsonText(carDataText);
                } catch (error) {
                    console.error(`Failed to parse car data for "${carFolder}":`, error);
                    console.error('First 100 chars of problematic JSON:', carDataText.substring(0, 100));
                    // Continue with next car instead of failing
                    return;
                }

                let skins = [];
                const skinsFolder = path.join(carFolderPath, 'skins');

                if (fs.existsSync(skinsFolder)) {
                    const skinFolders = fs.readdirSync(skinsFolder, { withFileTypes: true })
                        .filter(dirent => dirent.isDirectory())
                        .map(dirent => dirent.name);

                    skinFolders.forEach(skinFolder => {
                        const skinPath = path.resolve(skinsFolder, skinFolder);
                        const skinFiles = fs.readdirSync(skinPath);

                        let previewImage = skinFiles.find(file => 
                            file.toLowerCase().startsWith('preview') && !file.toLowerCase().endsWith('.psd')
                        );

                        if (previewImage) {
                            skins.push({
                                name: skinFolder,
                                imagePath: path.resolve(skinPath, previewImage) // Always resolve full path
                            });
                        }
                    });
                }

                let previewImagePath = skins.length > 0 ? skins[0].imagePath : null;
                const brand = carData.brand || carData.name?.split(' ')[0] || 'Unknown';
                const brandImagePath = findBrandImage(brand);

                cars.push({
                    id: carFolder,
                    name: carData.name || 'Unknown Car',
                    brand: brand,
                    class: carData.class || 'Unknown',
                    specs: carData.specs || {},
                    year: carData.year || 'Unknown',
                    tags: carData.tags || [],
                    imagePath: previewImagePath,
                    folderName: carFolder,
                    brandImagePath: brandImagePath,
                    skins: skins,
                    totalSkins: skins.length
                });
            }

        } catch (error) {
            console.error(`Error processing car "${carFolder}":`, error);
        }
    });

    return cars;
}

function findBrandImage(brandName) {
    if (!brandName || brandName === 'Unknown') {
        return null;
    }
   
    const extensions = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];
    
    function findImage(directory, brandName) {
        if (!fs.existsSync(directory)) return null;
        
        // First, try exact match with spaces
        for (const ext of extensions) {
            const exactImagePath = path.join(directory, `${brandName}${ext}`);
            if (fs.existsSync(exactImagePath)) {
                return exactImagePath;
            }
        }
        
        try {
            const files = fs.readdirSync(directory);
            
            // Case-insensitive exact match (excluding extensions)
            const matchingFile = files.find(file => {
                const fileBaseName = path.parse(file).name.toLowerCase();
                return fileBaseName === brandName.toLowerCase() && extensions.some(ext => file.toLowerCase().endsWith(ext));
            });
            if (matchingFile) return path.join(directory, matchingFile);
            
            // Strict partial match: Ensure whole words match, avoiding substring issues (e.g., "BMW Alpina" vs. "BMW")
            const wordBoundaryMatch = files.find(file => {
                const fileBaseName = path.parse(file).name.toLowerCase();
                return fileBaseName.split(/[^a-z0-9]/).join(' ') === brandName.toLowerCase() && extensions.some(ext => file.toLowerCase().endsWith(ext));
            });
            if (wordBoundaryMatch) return path.join(directory, wordBoundaryMatch);
        } catch (error) {
            console.error(`Error reading directory ${directory}:`, error);
        }
        
        return null;
    }
    
    // Try in user directory first
    let imagePath = findImage(USER_BRAND_BADGES_PATH, brandName);
    if (imagePath) return imagePath;
    
    // Try in default directory
    imagePath = findImage(DEFAULT_BRAND_BADGES_PATH, brandName);
    if (imagePath) return imagePath;
    
    // Normalize name
    const normalizedBrand = brandName.toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^\w-]/g, '')
        .replace(/[_-]+/g, '_');
    
    // Try with normalized name in both directories
    imagePath = findImage(USER_BRAND_BADGES_PATH, normalizedBrand);
    if (imagePath) return imagePath;
    
    imagePath = findImage(DEFAULT_BRAND_BADGES_PATH, normalizedBrand);
    if (imagePath) return imagePath;
    
    return null;
}

// Add this handler for getting track data
ipcMain.handle('get-track-data', async (event, tracksFolder) => {
    try {
        // Use only the path from settings
        const folderToUse = getTrackPath();
        
        if (!folderToUse) {
            throw new Error('Assetto Corsa path not configured in settings');
        }
        
        return getTracksData(folderToUse);
    } catch (error) {
        console.error('Error loading track data:', error);
        return [];
    }
});

// Add this handler for opening track folders
ipcMain.handle('open-track-folder', async (event, trackPath) => {
    if (!trackPath) {
        throw new Error('Track path is required');
    }
    
    // Check if the folder exists
    if (!fs.existsSync(trackPath)) {
        throw new Error(`Track folder not found: ${trackPath}`);
    }
    
    // Open the folder in the OS file explorer
    const result = await shell.openPath(trackPath);
    
    // shell.openPath returns an empty string on success, or an error message
    if (result !== '') {
        throw new Error(`Failed to open folder: ${result}`);
    }
    
    return true;
});

function getTracksData(tracksFolder) {
    // Ensure the path is correctly resolved
    tracksFolder = path.resolve(tracksFolder);

    const tracks = [];

    if (!fs.existsSync(tracksFolder)) {
        console.error(`Tracks directory not found: "${tracksFolder}"`);
        return tracks;
    }

    const trackFolders = fs.readdirSync(tracksFolder, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    trackFolders.forEach(trackFolder => {
        const trackFolderPath = path.resolve(tracksFolder, trackFolder);
        const uiFolder = path.join(trackFolderPath, 'ui');
        
        if (!fs.existsSync(uiFolder)) {
            return; // Skip if no ui folder
        }
        
        try {
            // Case 1: Multiple layouts in separate folders, each with ui_track.json
            const uiFolderContents = fs.readdirSync(uiFolder, { withFileTypes: true });
            const layoutFolders = uiFolderContents.filter(item => 
                item.isDirectory() && item.name !== 'tmp' // Exclude tmp folder
            );
            
            // If we have layout folders, process each one
            if (layoutFolders.length > 0) {
                layoutFolders.forEach(layoutDirent => {
                    const layoutFolder = layoutDirent.name;
                    const layoutPath = path.join(uiFolder, layoutFolder);
                    
                    // Check for ui_track.json in the layout folder
                    const uiTrackPath = path.join(layoutPath, 'ui_track.json');
                    
                    if (fs.existsSync(uiTrackPath)) {
                        // Case 1: ui_track.json is inside a layout folder
                        processTrackData(uiTrackPath, trackFolder, layoutFolder, tracks);
                    } else {
                        // Check if ui_track.json is directly in ui folder (Case 2)
                        const mainUiTrackPath = path.join(uiFolder, 'ui_track.json');
                        if (fs.existsSync(mainUiTrackPath)) {
                            // In this case, each subfolder is a layout variant
                            processTrackData(mainUiTrackPath, trackFolder, layoutFolder, tracks);
                        }
                    }
                });
            } else {
                // Case 3: Single layout with ui_track.json directly in the ui folder
                const uiTrackPath = path.join(uiFolder, 'ui_track.json');
                if (fs.existsSync(uiTrackPath)) {
                    processTrackData(uiTrackPath, trackFolder, null, tracks);
                }
            }
        } catch (error) {
            console.error(`Error processing track "${trackFolder}":`, error);
        }
    });

    return tracks;
}

function processTrackData(uiTrackPath, trackFolder, layoutFolder, tracks) {
    try {
        const trackDataText = fs.readFileSync(uiTrackPath, { encoding: 'utf8' });
        
        // Use the sanitized JSON parser
        let trackData;
        try {
            trackData = sanitizeJsonText(trackDataText);
        } catch (error) {
            console.error(`Failed to parse track data for "${trackFolder}${layoutFolder ? ` - ${layoutFolder}` : ''}":`, error);
            console.error('First 100 chars of problematic JSON:', trackDataText.substring(0, 100));
            // Continue with next track instead of failing completely
            return;
        }
        
        // Determine the path where outline.png should be located
        let outlinePath = null;
        let folderPath = null;
        
        if (layoutFolder) {
            // For layouts, check in the layout folder first
            const layoutOutlinePath = path.join(path.dirname(uiTrackPath), 'outline.png');
            if (fs.existsSync(layoutOutlinePath)) {
                outlinePath = layoutOutlinePath;
                folderPath = path.dirname(uiTrackPath);
            }
        } else {
            // For single tracks, check in the ui folder
            const mainOutlinePath = path.join(path.dirname(uiTrackPath), 'outline.png');
            if (fs.existsSync(mainOutlinePath)) {
                outlinePath = mainOutlinePath;
                folderPath = path.dirname(uiTrackPath);
            }
        }
        
        // Construct the track object with all the relevant information
        tracks.push({
            name: trackData.name || `${trackFolder}${layoutFolder ? ` - ${layoutFolder}` : ''}`,
            description: trackData.description || '',
            country: trackData.country || 'Unknown',
            city: trackData.city || '',
            length: trackData.length || 'Unknown',
            pitboxes: trackData.pitboxes || '0',
            year: trackData.year || 'Unknown',
            tags: trackData.tags || [],
            run: trackData.run || 'Unknown',
            outlinePath: outlinePath,
            folderPath: folderPath || path.dirname(uiTrackPath),
            baseFolder: trackFolder,
            layoutFolder: layoutFolder
        });
    } catch (error) {
        console.error(`Error parsing track data from "${uiTrackPath}":`, error);
    }
}