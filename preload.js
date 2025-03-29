// preload.js
const { contextBridge, ipcRenderer } = require('electron');
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
    'api', {
        // Car-related methods
        getCars: (carsFolder) => ipcRenderer.invoke('get-car-data', carsFolder),
        openCarFolder: (carId) => ipcRenderer.invoke('open-car-folder', carId),
       
        // Track-related methods
        getTracks: () => ipcRenderer.invoke('get-track-data'),
        openTrackFolder: (trackPath) => ipcRenderer.invoke('open-track-folder', trackPath),

        // Window control methods
        closeWindow: () => ipcRenderer.send('close-window'),
        minimizeWindow: () => ipcRenderer.send('minimize-window'),
        maximizeWindow: () => ipcRenderer.send('maximize-window'),
        
        // Navigation method for sidebar
        navigateTo: (pageName) => ipcRenderer.send('navigate', pageName),

        // Settings
        getSettings: () => ipcRenderer.invoke('getSettings'),
        saveSettings: (settings) => ipcRenderer.invoke('saveSettings', settings),
        showOpenDialog: () => ipcRenderer.invoke('showOpenDialog'),
        

    }
);