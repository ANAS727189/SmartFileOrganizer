import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { spawn } from 'child_process';

let watcherProcess = null;

// Create the main window
function createWindow() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // Set up user data directory and settings file path
    const userDataPath = path.join(__dirname, '../..', 'userData');
    const settingsPath = path.join(userDataPath, 'settings.json');
    
    // Ensure userData directory exists
    fs.mkdir(userDataPath, { recursive: true }).catch(err => {
        console.error(`Error creating userData directory: ${err.message}`);
    });
    
    // Store settings path for later use
    process.env.SETTINGS_PATH = settingsPath;
    
    // Ensure settings.json exists with valid JSON
    fs.access(settingsPath)
        .catch(() => {
            // If file doesn't exist, create it with default empty object
            return fs.writeFile(settingsPath, JSON.stringify({ categories: {} }, null, 2));
        })
        .catch(err => {
            console.error(`Error initializing settings.json: ${err.message}`);
        });
    
    const win = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        title: "Terminal File Organizer",
        frame: false, // Frameless window for a more terminal-like appearance
        backgroundColor: '#0C0C0C',
        icon: path.join(__dirname, 'assets/icon.png')
    });

    // Load the index.html file
    win.loadFile('./src/renderer/index.html');

    // Handle folder dialog
    ipcMain.handle('open-folder-dialog', async (event) => {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory'],
            title: 'Select Directory to Organize'
        });
        return result;
    });

    // Settings handling
    ipcMain.handle('save-settings', async (event, settings) => {
        try {
            await fs.writeFile(process.env.SETTINGS_PATH, JSON.stringify(settings, null, 2));
            console.log(`Settings saved to ${process.env.SETTINGS_PATH}`);
            return 'Settings saved';
        } catch (err) {
            console.error(`Error saving settings: ${err.message}`);
            throw err;
        }
    });
    
    ipcMain.handle('load-settings', async () => {
        const settingsPath = process.env.SETTINGS_PATH;
        
        // Try to load settings.json if exists
        if (settingsPath) {
            try {
                const settingsContent = await fs.readFile(settingsPath, 'utf8');
                // Handle empty file case
                if (settingsContent.trim() === '') {
                    // Initialize with empty categories object
                    const defaultSettings = { categories: {} };
                    await fs.writeFile(settingsPath, JSON.stringify(defaultSettings, null, 2));
                    return defaultSettings;
                }
                return JSON.parse(settingsContent);
            } catch (err) {
                console.error(`Error reading settings.json: ${err.message}`);
                // If file doesn't exist or has JSON error, create a new one
                if (err.code === 'ENOENT' || err instanceof SyntaxError) {
                    // Fallback to config.json
                    try {
                        const __filename = fileURLToPath(import.meta.url);
                        const __dirname = path.dirname(__filename);
                        const configPath = path.resolve(__dirname, '../../server/config.json');
                        const configContent = await fs.readFile(configPath, 'utf-8');
                        const configData = JSON.parse(configContent);
                        const defaultSettings = { categories: configData.DEFAULT_CATEGORIES };
                        
                        // Write the default settings to settings.json
                        await fs.writeFile(settingsPath, JSON.stringify(defaultSettings, null, 2));
                        return defaultSettings;
                    } catch (configErr) {
                        console.error(`Error reading config.json: ${configErr.message}`);
                        const defaultSettings = { categories: {} };
                        await fs.writeFile(settingsPath, JSON.stringify(defaultSettings, null, 2));
                        return defaultSettings;
                    }
                }
                // For other errors, return empty categories
                return { categories: {} };
            }
        }
        
        // If settingsPath is undefined, return empty categories
        return { categories: {} };
    });

    // Handle window controls
    ipcMain.on('close-app', () => {
        win.close();
    });

    ipcMain.on('minimize-app', () => {
        win.minimize();
    });

    ipcMain.on('maximize-app', () => {
        if (win.isMaximized()) {
            win.unmaximize();
        } else {
            win.maximize();
        }
    });

    ipcMain.on('start-watcher', (event, { directory, mode }) => {
        if (watcherProcess) {
            event.reply('watcher-status', 'Watcher already running');
            return;
        }
        const projectRoot = path.resolve(__dirname, '..', '..'); // adjust based on main.js location

        console.log('Python cwd will be:', projectRoot);
        
        watcherProcess = spawn('python3', ['-m', 'server.watcher', directory, mode], {
            cwd: projectRoot,
            env: {
                ...process.env,           // inherit existing env vars
                PYTHONPATH: projectRoot   // explicitly set PYTHONPATH
            },
            stdio: ['inherit', 'pipe', 'pipe']
        });
        watcherProcess.stdout.on('data', (data) => {
            event.reply('watcher-output', data.toString());
        });
        watcherProcess.stderr.on('data', (data) => {
            event.reply('watcher-output', `Error: ${data.toString()}`);
        });
        watcherProcess.on('close', (code) => {
            console.log(`Watcher process exited with code ${code}`);
            watcherProcess = null;
            event.reply('watcher-status', 'Watcher stopped');
        });
    
        event.reply('watcher-status', 'Watcher started');
    });
    
    ipcMain.on('stop-watcher', (event) => {
        if (watcherProcess) {
            watcherProcess.kill();
            watcherProcess = null;
            event.reply('watcher-status', 'Watcher stopped');
        } else {
            event.reply('watcher-status', 'No watcher running');
        }
    });

    // Dev tools in development mode
    if (process.env.NODE_ENV === 'development') {
        win.webContents.openDevTools();
    }
}

// Initialize the app
app.whenReady().then(() => {
    createWindow();

    // On macOS, create a new window when the app is activated
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Handle any uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    dialog.showErrorBox('Error', `An unexpected error occurred: ${error.message}`);
});