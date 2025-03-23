const { BrowserWindow, app, ipcMain, shell } = require('electron');
const path = require('path'); 
const fs = require('fs');
const os = require('os');

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

// Base path for Assetto Corsa cars
const DEFAULT_CARS_FOLDER = "M:/SteamLibrary/steamapps/common/assettocorsa/content/cars";
const DEFAULT_TRACKS_FOLDER = "M:/SteamLibrary/steamapps/common/assettocorsa/content/tracks";
const USER_BRAND_BADGES_PATH = path.join(os.homedir(), 'AppData', 'Local', 'AcTools Content Manager', 'Data (User)', 'Brand Badges');
const DEFAULT_BRAND_BADGES_PATH = path.join(os.homedir(), 'AppData', 'Local', 'AcTools Content Manager', 'Data', 'Brand Badges');

ipcMain.handle('get-car-data', async (event, carsFolder) => {
    try {
        return getCarsData(carsFolder);
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
    
    // Use the default cars folder path
    const carsFolder = DEFAULT_CARS_FOLDER;
    
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

function getCarsData(carsFolder) {
    if (!carsFolder) {
        carsFolder = DEFAULT_CARS_FOLDER;
    }

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
                const carData = JSON.parse(carDataText);

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
        return getTracksData(tracksFolder);
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
    if (!tracksFolder) {
        tracksFolder = DEFAULT_TRACKS_FOLDER;
    }

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
        const trackData = JSON.parse(trackDataText);
        
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