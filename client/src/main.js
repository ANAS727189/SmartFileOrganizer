import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { spawn } from 'child_process';

let watcherProcess = null;
let mainWindow = null; // Store the main window globally

function createWindow() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    const userDataPath = path.join(__dirname, '../..', 'userData');
    const settingsPath = path.join(userDataPath, 'settings.json');
    fs.mkdir(userDataPath, { recursive: true }).catch(err => {
        console.error(`Error creating userData directory: ${err.message}`);
    });
    process.env.SETTINGS_PATH = settingsPath;
    
    fs.access(settingsPath)
        .catch(() => {
            return fs.writeFile(settingsPath, JSON.stringify({ categories: {} }, null, 2));
        })
        .catch(err => {
            console.error(`Error initializing settings.json: ${err.message}`);
        });
    
    mainWindow = new BrowserWindow({ // Store the window in the global variable
        width: 1000,
        height: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        title: "Terminal File Organizer",
        frame: false,
        backgroundColor: '#0C0C0C',
        icon: path.join(__dirname, 'assets/icon.png')
    });
    mainWindow.loadFile('./src/renderer/index.html');

    // Handle the open-folder-dialog IPC call
    ipcMain.handle('open-folder-dialog', async (event) => {
        const result = await dialog.showOpenDialog(mainWindow, { // Pass mainWindow as the parent
            properties: ['openDirectory'],
            title: 'Select Directory to Organize'
        });
        return result;
    });

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
        if (settingsPath) {
            try {
                const settingsContent = await fs.readFile(settingsPath, 'utf8');
                if (settingsContent.trim() === '') {
                    const defaultSettings = { categories: {} };
                    await fs.writeFile(settingsPath, JSON.stringify(defaultSettings, null, 2));
                    return defaultSettings;
                }
                return JSON.parse(settingsContent);
            } catch (err) {
                console.error(`Error reading settings.json: ${err.message}`);
                if (err.code === 'ENOENT' || err instanceof SyntaxError) {
                    try {
                        const __filename = fileURLToPath(import.meta.url);
                        const __dirname = path.dirname(__filename);
                        const configPath = path.resolve(__dirname, '../../server/config.json');
                        const configContent = await fs.readFile(configPath, 'utf-8');
                        const configData = JSON.parse(configContent);
                        const defaultSettings = { categories: configData.DEFAULT_CATEGORIES };
                    
                        await fs.writeFile(settingsPath, JSON.stringify(defaultSettings, null, 2));
                        return defaultSettings;
                    } catch (configErr) {
                        console.error(`Error reading config.json: ${configErr.message}`);
                        const defaultSettings = { categories: {} };
                        await fs.writeFile(settingsPath, JSON.stringify(defaultSettings, null, 2));
                        return defaultSettings;
                    }
                }
                return { categories: {} };
            }
        }
        return { categories: {} };
    });

    ipcMain.on('close-app', () => {
        mainWindow.close();
    });

    ipcMain.on('minimize-app', () => {
        mainWindow.minimize();
    });

    ipcMain.on('maximize-app', () => {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    });

    ipcMain.on('start-watcher', (event, { directory, mode }) => {
        if (watcherProcess) {
            event.reply('watcher-status', 'Watcher already running');
            return;
        }
        const projectRoot = path.resolve(__dirname, '..', '..'); 
        console.log('Python cwd will be:', projectRoot);
        
        watcherProcess = spawn('python3', ['-m', 'server.watcher', directory, mode], {
            cwd: projectRoot,
            env: {
                ...process.env,          
                PYTHONPATH: projectRoot   
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

    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }
}

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    dialog.showErrorBox('Error', `An unexpected error occurred: ${error.message}`);
});