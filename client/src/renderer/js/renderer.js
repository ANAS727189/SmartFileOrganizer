const { spawn } = require('child_process');
const { ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs').promises; 
const { fileURLToPath } = require('url');


// DOM Elements
const pathInput = document.getElementById('pathInput');
const modeSelect = document.getElementById('modeSelect');
const removeDuplicates = document.getElementById('removeDuplicates');
const output = document.getElementById('output');
const organizeBtn = document.getElementById('organizeBtn');
const browseBtn = document.getElementById('browseBtn');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const tabs = document.querySelectorAll('.terminal-tab');
const mainTab = document.getElementById('mainTab');
const statsTab = document.getElementById('statsTab');
const helpTab = document.getElementById('helpTab');
const minimizeBtn = document.getElementById('minimizeBtn');
const maximizeBtn = document.getElementById('maximizeBtn');
const closeBtn = document.getElementById('closeBtn');
const startWatcherBtn = document.getElementById('startWatcherBtn');
const stopWatcherBtn = document.getElementById('stopWatcherBtn');
const settingsTab = document.getElementById('settingsTab');
const categoryList = document.getElementById('categoryList');
const categoryName = document.getElementById('categoryName');
const categoryExts = document.getElementById('categoryExts');
const addCategoryBtn = document.getElementById('addCategoryBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const fileListElement = document.getElementById('fileList');
const previewModal = document.getElementById('previewModal');
const previewArea = document.getElementById('previewArea');
const closePreviewBtn = document.getElementById('closePreviewBtn');
const analyticsTab = document.getElementById('analyticsTab');
let fileTypeChart = null;
let fileSizeChart = null;

const analyticsPath = path.join(__dirname, '../../../userData/analytics.json');

async function initializeAnalytics() {
    try {
        await fs.access(analyticsPath);
    } catch {
        const defaultData = {
            fileTypes: {},
            sizeCategories: {
                'Tiny (<100KB)': 0,
                'Small (100KB-1MB)': 0,
                'Medium (1MB-100MB)': 0,
                'Large (100MB-1GB)': 0,
                'Huge (>1GB)': 0
            },
            totalFilesOrganized: 0,
            totalDuplicatesRemoved: 0,
            totalSpaceSaved: 0
        };
        await fs.writeFile(analyticsPath, JSON.stringify(defaultData, null, 2));
    }
}

async function loadAnalyticsData() {
    try {
        const data = await fs.readFile(analyticsPath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error loading analytics data:', err);
        return {
            fileTypes: {},
            sizeCategories: {
                'Tiny (<100KB)': 0,
                'Small (100KB-1MB)': 0,
                'Medium (1MB-100MB)': 0,
                'Large (100MB-1GB)': 0,
                'Huge (>1GB)': 0
            },
            totalFilesOrganized: 0,
            totalDuplicatesRemoved: 0,
            totalSpaceSaved: 0
        };
    }
}

async function updateAnalyticsData(newFiles) {
    try {
        const currentData = await loadAnalyticsData();
        const stats = JSON.parse(newFiles);

        // Update file types and size categories based on current fileList (top-level before organization)
        fileList.forEach(file => {
            const type = file.type || 'unknown';
            currentData.fileTypes[type] = (currentData.fileTypes[type] || 0) + 1;

            if (file.size < 100 * 1024) currentData.sizeCategories['Tiny (<100KB)']++;
            else if (file.size < 1024 * 1024) currentData.sizeCategories['Small (100KB-1MB)']++;
            else if (file.size < 100 * 1024 * 1024) currentData.sizeCategories['Medium (1MB-100MB)']++;
            else if (file.size < 1024 * 1024 * 1024) currentData.sizeCategories['Large (100MB-1GB)']++;
            else currentData.sizeCategories['Huge (>1GB)']++;
        });

        // Update totals from Python script stats
        currentData.totalFilesOrganized += stats.files_organized || 0;
        currentData.totalDuplicatesRemoved += stats.duplicates_removed || 0;
        currentData.totalSpaceSaved += stats.space_saved || 0;

        await fs.writeFile(analyticsPath, JSON.stringify(currentData, null, 2));
    } catch (err) {
        console.error('Error updating analytics data:', err);
        writeToOutput(`Error updating analytics: ${err.message}`, 'error');
    }
}

fileListElement.addEventListener('click', (e) => {
    if (e.target.classList.contains('preview-btn')) {
        const filePath = e.target.dataset.path;
        previewFile(filePath);
    }
});


async function updateAnalytics() {
    const analyticsData = await loadAnalyticsData();
    if (!Object.keys(analyticsData.fileTypes).length && !analyticsData.totalFilesOrganized) {
        analyticsTab.innerHTML = '<div class="no-data">No analytics data available.</div>';
        return;
    }

    if (fileTypeChart) fileTypeChart.destroy();
    if (fileSizeChart) fileSizeChart.destroy();

    analyticsTab.innerHTML = `
        <h2 class="analytics-title">File Analytics</h2>
        <div class="analytics-container">
            <div class="chart-container">
                <canvas id="fileTypeChart"></canvas>
            </div>
            <div class="chart-container">
                <canvas id="fileSizeChart"></canvas>
            </div>
        </div>
    `;

    try {
        const pieCtx = document.getElementById('fileTypeChart').getContext('2d');
        fileTypeChart = new Chart(pieCtx, {
            type: 'pie',
            data: {
                labels: Object.keys(analyticsData.fileTypes),
                datasets: [{
                    data: Object.values(analyticsData.fileTypes),
                    backgroundColor: ['#00FF00', '#00DDFF', '#FFAA00', '#FF3333', '#00FF66', '#FF00FF', '#FFFF00']
                }]
            },
            options: {
                plugins: { legend: { labels: { color: '#00FF00' } } },
                responsive: true,
                maintainAspectRatio: false
            }
        });

        const barCtx = document.getElementById('fileSizeChart').getContext('2d');
        fileSizeChart = new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(analyticsData.sizeCategories),
                datasets: [{
                    label: 'File Sizes',
                    data: Object.values(analyticsData.sizeCategories),
                    backgroundColor: '#00FF00'
                }]
            },
            options: {
                scales: {
                    y: { beginAtZero: true, ticks: { color: '#00FF00' } },
                    x: { ticks: { color: '#00FF00' } }
                },
                plugins: { legend: { labels: { color: '#00FF00' } } },
                responsive: true,
                maintainAspectRatio: false
            }
        });
    } catch (error) {
        console.error('Chart rendering error:', error);
        analyticsTab.innerHTML = `<div class="error">Error rendering charts: ${error.message}</div>`;
    }
}




function renderFileList() {
    if (fileList.length === 0) {
        fileListElement.innerHTML = '<div class="no-files">No files found in this directory.</div>';
    } else {
        fileListElement.innerHTML = fileList.map(f => `
            <div class="file-item">
                <span>${f.name}</span>
                <button class="preview-btn" data-path="${f.path}">Preview</button>
            </div>
        `).join('');
    }
}

async function previewFile(filePath) {
    console.log('Attempting to preview file:', filePath);
        try {
            // Check if file exists
            await fs.access(filePath);
            console.log('File exists');
    
            const ext = path.extname(filePath).toLowerCase();
            previewArea.innerHTML = '';
    
            if (['.jpg', '.png', '.jpeg', '.gif', '.bmp'].includes(ext)) {
                const imageData = await fs.readFile(filePath);
                const blob = new Blob([imageData]);
                const imgUrl = URL.createObjectURL(blob);
                const img = document.createElement('img');
                img.src = imgUrl;
                img.style.maxWidth = '100%';
                img.style.maxHeight = '500px';
                img.onload = () => URL.revokeObjectURL(imgUrl);
                previewArea.appendChild(img);
            } else if (ext === '.pdf') {
            try {
                const pdfjsLib = window.pdfjsLib;
                if (!pdfjsLib) {
                    throw new Error('PDF.js library not loaded');
                }
                
                const data = await fs.readFile(filePath);
                const loadingTask = pdfjsLib.getDocument({ data });
                const pdf = await loadingTask.promise;
                const page = await pdf.getPage(1);
                
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                const viewport = page.getViewport({ scale: 1.5 });
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                await page.render({ canvasContext: context, viewport }).promise;
                previewArea.appendChild(canvas);
            } catch (err) {
                previewArea.innerHTML = `<div class="error">PDF preview error: ${err.message}</div>`;
            }
        } 
        else if (['.txt', '.js', '.html', '.css', '.json', '.md', '.xml', '.csv'].includes(ext)) {
            try {
                const content = await fs.readFile(filePath, 'utf8');
                const formattedContent = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                previewArea.innerHTML = `<pre style="color: var(--text-color); max-height: 500px; overflow: auto;">${formattedContent.slice(0, 5000)}${content.length > 5000 ? '...' : ''}</pre>`;
            } catch (err) {
                previewArea.innerHTML = `<div class="error">Error loading text file: ${err.message}</div>`;
            }
        } else {
            previewArea.innerHTML = `<div style="color: var(--text-color);">Preview not available for ${ext} files</div>`;
        }
    }catch (err) {
        console.error('File error:', err);
        previewArea.innerHTML = `<div class="error">File not found or inaccessible: ${err.message}</div>`;
    }
    
    previewModal.style.display = 'flex';
}

closePreviewBtn.addEventListener('click', () => {
    previewModal.style.display = 'none';
});

pathInput.addEventListener('change', () => {
    if (pathInput.value) {
        loadFileList(pathInput.value).then(renderFileList);
    }
});



let settings = { categories: {} };

async function loadSettings() {
    try {
        settings = await ipcRenderer.invoke('load-settings');
        console.log("Loaded settings:", settings);
        if (!settings || !settings.categories) {
            writeToOutput('Error: Invalid settings format, resetting to defaults', 'error');
            settings = { categories: {} };
        }
        if (!settings.categories) {
            settings.categories = {};
        }
        renderCategories();
    } catch (error) {
        console.error("Error loading settings:", error);
        writeToOutput(`Error loading settings: ${error}`, 'error');
        settings = { categories: {} };
        renderCategories();
    }
}

function renderCategories() {
    if (!settings || !settings.categories) {
        settings = { categories: {} };
    }
    categoryList.innerHTML = Object.entries(settings.categories).map(([name, exts]) => `
        <div class="category-item">
            <span>${name}: ${Array.isArray(exts) ? exts.join(', ') : exts}</span>
            <button class="delete-category-btn" data-name="${name}">Delete</button>
        </div>
    `).join('');

    document.querySelectorAll('.delete-category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            deleteCategory(btn.dataset.name);
        });
    });
}

window.deleteCategory = function(name) {
    delete settings.categories[name];
    renderCategories();
};


addCategoryBtn.addEventListener('click', () => {
    const name = categoryName.value.trim();
    const exts = categoryExts.value.split(',').map(e => e.trim().toLowerCase());
    if (name && exts.length) {
        if (!settings.categories) {
            settings.categories = {};
        }
        settings.categories[name] = exts;
        renderCategories();
        categoryName.value = '';
        categoryExts.value = '';
        writeToOutput(`Added category: ${name}`, 'success');
    }else {
        writeToOutput('Please enter both category name and extensions', 'error');
    }

});

saveSettingsBtn.addEventListener('click', async () => {
    try {
        console.log("Saving settings:", settings);
        if (!settings || !settings.categories) {
            settings = { categories: {} };
        }
        await ipcRenderer.invoke('save-settings', settings);
        writeToOutput('Settings saved successfully', 'success');
    } catch (error) {
        writeToOutput(`Error saving settings: ${error}`, 'error');
    }
});

function deleteCategory(name) {
    delete settings.categories[name];
    renderCategories();
}


// tabs.forEach(tab => {
//     tab.addEventListener('click', () => {
//         const tabName = tab.dataset.tab;
//         tabs.forEach(t => t.classList.remove('active'));
//         tab.classList.add('active');
        
//         // Show/hide panels
//         mainTab.style.display = tabName === 'main' ? 'flex' : 'none';
//         statsTab.style.display = tabName === 'stats' ? 'flex' : 'none';
//         // helpTab.classList.toggle('active', tabName === 'help');
//         helpTab.style.display = tabName === 'help' ? 'block' : 'none';
//         settingsTab.style.display = tabName === 'settings' ? 'block' : 'none';
//         analyticsTab.style.display = tabName === 'analytics' ? 'block' : 'none';
//         if (tabName === 'analytics' && fileList.length) updateAnalytics();
        
//         if (tabName === 'settings') {
//             loadSettings();
//         }
//     });
// });




// Stats elements
const fileCount = document.getElementById('fileCount');
const dupCount = document.getElementById('dupCount');
const spaceSaved = document.getElementById('spaceSaved');
const lastRun = document.getElementById('lastRun');


let fileList = [];
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');


async function loadFileList(directory) {
    try {
        fileList = [];
        const tagsPath = path.join(directory, '.tags.json');
        let tagsMap = new Map();
        if (await fs.access(tagsPath).then(() => true).catch(() => false)) {
            const tagsData = JSON.parse(await fs.readFile(tagsPath, 'utf8'));
            for (const [relPath, tags] of Object.entries(tagsData)) {
                tagsMap.set(relPath, tags);
            }
        }

        const files = await fs.readdir(directory, { withFileTypes: true });
        for (const file of files) {
            if (file.isFile()) {
                const fullPath = path.join(directory, file.name);
                const stats = await fs.stat(fullPath);
                const relPath = path.relative(directory, fullPath);
                fileList.push({
                    name: file.name,
                    path: fullPath,
                    type: path.extname(file.name).slice(1).toLowerCase(),
                    size: stats.size,
                    date: stats.ctime,
                    tags: tagsMap.get(relPath) || []
                });
            }
        }
        writeToOutput(`Loaded ${fileList.length} files from ${directory}`);
    } catch (err) {
        writeToOutput(`Failed to load file list: ${err.message}`, 'error');
        fileList = [];
    }
}

pathInput.addEventListener('change', () => {
    if (pathInput.value) loadFileList(pathInput.value);
});

searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim();
    if (!query) {
        searchResults.style.display = 'none';
        return;
    }

    const [criterion, value] = query.includes(':') ? query.split(':') : ['name', query];
    const filtered = fileList.filter(file => {
        switch (criterion.toLowerCase()) {
            case 'name': return file.name.toLowerCase().includes(value.toLowerCase());
            case 'type': return file.type === value.toLowerCase();
            case 'date': return file.date.toISOString().includes(value);
            case 'size': return file.size > parseSize(value);
            case 'tag': return file.tags.includes(value.toLowerCase());
            default: return file.name.toLowerCase().includes(query.toLowerCase());
        }
    });

    searchResults.innerHTML = filtered.length
    ? filtered.map(f => `<div class="search-result">${f.name} (${formatFileSize(f.size)})</div>`).join(''): '<div class="search-no-results">No files match your query.</div>';
    searchResults.style.display = 'block';
});

function parseSize(value) {
    const units = { 'kb': 1024, 'mb': 1024 * 1024, 'gb': 1024 * 1024 * 1024 };
    const match = value.match(/(\d+)(kb|mb|gb)?/i);
    return match ? parseInt(match[1]) * (units[match[2]?.toLowerCase()] || 1) : 0;
}



// Watcher 
startWatcherBtn.addEventListener('click', () => {
    const path = pathInput.value;
    const mode = modeSelect.value;
    if (!path) {
        writeToOutput('Error: Please enter a directory path', 'error');
        return;
    }
    ipcRenderer.send('start-watcher', { directory: path, mode });
});

stopWatcherBtn.addEventListener('click', () => {
    ipcRenderer.send('stop-watcher');
});

ipcRenderer.on('watcher-output', (event, text) => {
    writeToOutput(text);
});

ipcRenderer.on('watcher-status', (event, message) => {
    writeToOutput(message, message.includes('stopped') ? 'warning' : 'success');
});



// Matrix background effect
const canvas = document.getElementById('matrixCanvas');
const ctx = canvas.getContext('2d');

// Initialize stats from localStorage
async function initStats() {
    const analyticsData = await loadAnalyticsData();
    fileCount.textContent = analyticsData.totalFilesOrganized || '0';
    dupCount.textContent = analyticsData.totalDuplicatesRemoved || '0';
    spaceSaved.textContent = formatFileSize(analyticsData.totalSpaceSaved) || '0 KB';
    lastRun.textContent = localStorage.getItem('lastRun') || 'Never';
}


// Update stats
function updateStats(files, dups, space) {
    localStorage.setItem('fileCount', files);
    localStorage.setItem('dupCount', dups);
    localStorage.setItem('spaceSaved', formatFileSize(space));
    localStorage.setItem('lastRun', new Date().toLocaleString());
    
    fileCount.textContent = files;
    dupCount.textContent = dups;
    spaceSaved.textContent = formatFileSize(space);
    lastRun.textContent = new Date().toLocaleString();
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Tab switching
tabs.forEach(tab => {
    tab.addEventListener('click', async() => {
        const tabName = tab.dataset.tab;
        
        // Update active tab
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Show/hide content
        mainTab.style.display = tabName === 'main' ? 'flex' : 'none';
        statsTab.style.display = tabName === 'stats' ? 'flex' : 'none';
        helpTab.style.display = tabName === 'help' ? 'block' : 'none';
        settingsTab.style.display = tabName === 'settings' ? 'block' : 'none';
        analyticsTab.style.display = tabName === 'analytics' ? 'block' : 'none';
        output.style.display = tabName === 'main' ? 'block' : 'none';
        
        if (tabName === 'analytics') await updateAnalytics();
        if (tabName === 'stats') await initStats();
        if (tabName === 'settings') loadSettings();
        if (tabName === 'help') helpTab.classList.add('active');
        else helpTab.classList.remove('active');
    });
});

// Initialize tabs
mainTab.style.display = 'flex';
statsTab.style.display = 'none';
helpTab.classList.remove('active');
output.style.display = 'block';



// Browse Folder Dialog
browseBtn.addEventListener('click', () => {
    ipcRenderer.invoke('open-folder-dialog').then((result) => {
        if (result && !result.canceled && result.filePaths.length > 0) {
            pathInput.value = result.filePaths[0];
            writeToOutput(`Directory selected: ${result.filePaths[0]}`);
            loadFileList(result.filePaths[0])
                .then(() => renderFileList())
                .catch(err => writeToOutput(`Error loading files: ${err}`, 'error'));
        }
    });
});

// Window control buttons
minimizeBtn.addEventListener('click', () => {
    ipcRenderer.send('minimize-app');
});

maximizeBtn.addEventListener('click', () => {
    ipcRenderer.send('maximize-app');
});

closeBtn.addEventListener('click', () => {
    ipcRenderer.send('close-app');
});



// Organize Button Click
organizeBtn.addEventListener('click', () => {
    organizeFiles();
});

// Path input enter key
pathInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const input = pathInput.value.trim();
        if (input && !input.startsWith('organize ') && !input.startsWith('mode ') && 
        !input.startsWith('duplicates ') && input !== 'stats' && input !== 'help' && 
        input !== 'clear') {
            loadFileList(input)
            .then(() => renderFileList())
            .catch(err => writeToOutput(`Error loading files: ${err}`, 'error'));
            const path = input.substring(9).trim();
            if (path) {
                pathInput.value = path;
                organizeFiles();
            } else {
                writeToOutput('Error: Missing directory path', 'error');
            }
    }
        else if (input.startsWith('mode ')) {
            const mode = input.substring(5).trim();
            if (['type', 'date', 'size'].includes(mode)) {
                modeSelect.value = mode;
                writeToOutput(`Organizing mode set to: ${mode}`);
            } else {
                writeToOutput('Error: Invalid mode. Use type, date, or size', 'error');
            }
        } else if (input.startsWith('duplicates ')) {
            const option = input.substring(11).trim();
            if (option === 'on') {
                removeDuplicates.checked = true;
                writeToOutput('Duplicate removal enabled');
            } else if (option === 'off') {
                removeDuplicates.checked = false;
                writeToOutput('Duplicate removal disabled');
            } else {
                writeToOutput('Error: Use "on" or "off"', 'error');
            }
        } else if (input === 'stats') {
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelector('[data-tab="stats"]').classList.add('active');
            mainTab.style.display = 'none';
            statsTab.style.display = 'flex';
            helpTab.classList.remove('active');
            writeToOutput('Displaying file statistics');
        } else if (input === 'help') {
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelector('[data-tab="help"]').classList.add('active');
            mainTab.style.display = 'flex';
            statsTab.style.display = 'none';
            helpTab.classList.add('active');
            writeToOutput('Displaying help');
        } else if (input === 'clear') {
            output.innerHTML = '';
            writeToOutput('Terminal cleared');
        } else if (input) {
            organizeFiles();
        }
        
        pathInput.value = '';
    }
});

// Organize files function
function organizeFiles() {
    const path = pathInput.value;
    const mode = modeSelect.value;
    const remove = removeDuplicates.checked;

    if (!path) {
        writeToOutput('Error: Please enter a directory path', 'error');
        showNotification('Error: Please enter a directory path', 'error');
        return;
    }

    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const args = ['-m', 'server', path, '--mode', mode];
    if (remove) args.push('--remove-duplicates');

    const pythonProcess = spawn(pythonCmd, args, { cwd: __dirname + '/../../..' });

    writeToOutput(`\n[${new Date().toLocaleTimeString()}] Starting file organization...`);
    writeToOutput(`Directory: ${path}`);
    writeToOutput(`Mode: ${mode}`);
    writeToOutput(`Remove duplicates: ${remove ? 'Yes' : 'No'}`);
    
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';

    let processedFiles = 0;
    let duplicatesRemoved = 0;
    let spaceSavedBytes = 0;
    let newFiles = '';

    pythonProcess.stdout.on('data', (data) => {
        const output = data.toString();
        writeToOutput(output);
        const lines = output.split('\n');
        lines.forEach(line => {
            if (line.trim().startsWith('{') && line.trim().endsWith('}')) {
                try {
                    const stats = JSON.parse(line.trim());
                    processedFiles = stats.files_organized;
                    duplicatesRemoved = stats.duplicates_removed;
                    spaceSavedBytes = stats.space_saved;
                    newFiles = line.trim();
                    writeToOutput(`Report: ${stats.files_organized} files organized, ${stats.duplicates_removed} duplicates removed, ${formatFileSize(stats.space_saved)} saved`, 'success');
                } catch (e) {
                    writeToOutput(`Error parsing stats: ${e.message}`, 'error');
                }
            }
        });
        
        if (output.includes('%')) {
            const match = output.match(/(\d+)%/);
            if (match) progressBar.style.width = `${match[1]}%`;
        }
    });

    pythonProcess.stderr.on('data', (data) => {
        writeToOutput(`Error: ${data.toString()}`, 'error');
    });

    pythonProcess.on('close', async (code) => {
        writeToOutput(`\n[${new Date().toLocaleTimeString()}] Operation completed with code ${code}`);
        
        if (code === 0) {
            writeToOutput('✅ File organization completed successfully!', 'success');
            showNotification('File organization completed successfully!', 'success');
        } else {
            writeToOutput('❌ Operation failed or had errors.', 'error');
            showNotification('Operation failed or had errors.', 'error');
        }

        // Update local stats display
        localStorage.setItem('fileCount', processedFiles);
        localStorage.setItem('dupCount', duplicatesRemoved);
        localStorage.setItem('spaceSaved', formatFileSize(spaceSavedBytes));
        localStorage.setItem('lastRun', new Date().toLocaleString());
        fileCount.textContent = processedFiles;
        dupCount.textContent = duplicatesRemoved;
        spaceSaved.textContent = formatFileSize(spaceSavedBytes);
        lastRun.textContent = new Date().toLocaleString();

        // Update analytics.json
        await updateAnalyticsData(newFiles);

        progressBar.style.width = '100%';
        setTimeout(() => {
            progressContainer.style.display = 'none';
        }, 2000);

        // Reload file list (unchanged for preview)
        loadFileList(pathInput.value).then(() => {
            renderFileList();
            if (fileList.length === 0) {
                writeToOutput('Note: Files have been organized into subdirectories.', 'warning');
            }
        }).catch(err => {
            writeToOutput(`Error reloading file list: ${err.message}`, 'error');
        });
    });
}

// Write to output with color coding
function writeToOutput(text, type = 'normal') {
    const span = document.createElement('div');
    span.textContent = text;
    
    if (type === 'error') {
        span.style.color = 'var(--error-color)';
    } else if (type === 'success') {
        span.style.color = 'var(--success-color)';
    } else if (type === 'warning') {
        span.style.color = 'var(--warning-color)';
    }
    
    output.appendChild(span);
    output.scrollTop = output.scrollHeight;
}

// Show notification
function showNotification(message, type = 'normal') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-notification';
    closeBtn.innerHTML = '×';
    closeBtn.addEventListener('click', () => {
        document.getElementById('notifications').removeChild(notification);
    });
    
    notification.appendChild(closeBtn);
    document.getElementById('notifications').appendChild(notification);
    
    setTimeout(() => {
        try {
            document.getElementById('notifications').removeChild(notification);
        } catch (e) {
            // Notification might have been closed already
        }
    }, 5000);
}

// Matrix background animation
function setupMatrix() {
    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = [];
    
    // Initialize drops
    for (let i = 0; i < columns; i++) {
        drops[i] = Math.floor(Math.random() * canvas.height);
    }
    
    // Matrix characters
    const matrix = '01αβγδεζηθικλμνξπρστυφχψωabcdefghijklmnopqrstuvwxyz';
    
    function draw() {
        // Semi-transparent black to create fade effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#00FF00'; // Green text
        ctx.font = `${fontSize}px monospace`;
        
        // Loop through drops
        for (let i = 0; i < drops.length; i++) {
            // Random character
            const text = matrix[Math.floor(Math.random() * matrix.length)];
            
            // Draw character
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);
            
            // Reset drop if it's at the bottom or randomly
            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            
            // Move drop down
            drops[i]++;
        }
    }
    
    // Run matrix animation
    setInterval(draw, 50);
}

// Window resize event
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});


window.addEventListener('DOMContentLoaded', async () => {
    await initializeAnalytics();
    await initStats();
});


window.addEventListener('DOMContentLoaded', () => {
    // Check if Chart is available
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded!');
        writeToOutput('Warning: Chart.js library not loaded. Analytics functionality may be limited.', 'warning');
    }
});

// initStats();
setupMatrix();
loadSettings();


// Initial welcome
writeToOutput(`Terminal File Organizer initialized at ${new Date().toLocaleString()}`);
writeToOutput('Type "help" for commands or use the GUI controls');