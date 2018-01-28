const {app, BrowserWindow} = require('electron');
const path = require('path');
const url = require('url')

let win;
let width = 1400;
let height = 900;

function createWindow() {
    // Create the main window
    win = new BrowserWindow({
        width: width,
        height: height,
    });

    win.setMenu(null)

    win.loadURL(url.format({
        pathname: path.join(__dirname, '/monitor-app/main/monitor.html'),
        protocol: 'file:',
        slashes: true
    }));

    win.webContents.openDevTools();
    win.on('closed', () => {
        win = null;
    })
}

app.on('ready', () => {
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (win === null) {
        createWindow();
    }
});