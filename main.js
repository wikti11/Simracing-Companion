const { BrowserWindow, app } = require('electron');
const path = require('path'); 

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
