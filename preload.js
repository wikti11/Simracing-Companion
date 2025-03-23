// preload.js
const { contextBridge, ipcRenderer } = require('electron');
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
    'api', {
        // Car-related methods
        getCars: (carsFolder) => ipcRenderer.invoke('get-car-data', carsFolder),
        openCarFolder: (carId) => ipcRenderer.invoke('open-car-folder', carId),
       
        // Window control methods
        closeWindow: () => ipcRenderer.send('close-window'),
        minimizeWindow: () => ipcRenderer.send('minimize-window'),
        maximizeWindow: () => ipcRenderer.send('maximize-window'),
        
        // Navigation method for sidebar
        navigateTo: (pageName) => ipcRenderer.send('navigate', pageName)
    }
);