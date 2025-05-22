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
let filesOverTimeChart, fileCategoriesChart, spaceSavedChart;

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




document.addEventListener('DOMContentLoaded', () => {
    // const isFirstTime = !localStorage.getItem('hasOpenedApp');
    // if (isFirstTime) {
        showOnboardingModal();
    //     localStorage.setItem('hasOpenedApp', 'true');
    // }
});


function showOnboardingModal() {
    const modal = document.getElementById('onboardingModal');
    const audio = document.getElementById('onboardingAudio');
    const nextBtn = document.getElementById('nextBtn');
    const skipBtn = document.getElementById('skipBtn');
    const mainContent = document.querySelector('.terminal');
    const loadingBar = document.getElementById('loadingBar');
    const typingText = document.getElementById('typingText');
    const visualizerBars = document.querySelectorAll('.onboarding-audio-visualizer .onboarding-bar');
    typingText.style.width = '0';
    modal.style.display = 'block';
    mainContent.style.filter = 'blur(5px)';
    const messages = [
        "Initializing Terminal File Organizer...",
        "Establishing secure connection...",
        "Loading system protocols...",
        "Scanning filesystem architecture...",
        "Calibrating file detection algorithms...",
        "Optimizing memory allocation...",
        "Verifying integrity of file handlers...",
        "Initializing pattern recognition module...",
        "Setting up real-time monitoring services...",
        "Configuring analytics engine...",
        "Welcome to Terminal File Organizer v1.0!"
    ];
    
    let currentMessageIndex = 0;
    function typeNextMessage() {
        if (currentMessageIndex < messages.length) {
            const message = messages[currentMessageIndex];
            typingText.textContent = "";
            typingText.style.animation = 'none';
            void typingText.offsetWidth;
            typingText.textContent = message;
            typingText.style.animation = `typing 2s steps(${message.length}, end), blink-caret 0.75s step-end infinite`;
            
            currentMessageIndex++;
            if (currentMessageIndex < messages.length) {
                setTimeout(typeNextMessage, 3000);
            }
        }else {
            currentMessageIndex = 0;
            setTimeout(typeNextMessage, 1000);
        }
    }
    typeNextMessage();
    audio.play();
    audio.addEventListener('timeupdate', () => {
        const progress = (audio.currentTime / audio.duration) * 100;
        loadingBar.style.width = `${progress}%`;
    });
    audio.onended = () => {
        nextBtn.disabled = false;
        visualizerBars.forEach(bar => {
            bar.style.animation = 'none';
        });
    };
    function updateVisualizer() {
        if (audio.paused) return;
        visualizerBars.forEach(bar => {
            const height = Math.random() * 100;
            bar.style.height = `${height}%`;
        });
        
        requestAnimationFrame(updateVisualizer);
    }
    
    audio.addEventListener('play', () => {
        updateVisualizer();
    });
    skipBtn.addEventListener('click', closeModal);
    nextBtn.addEventListener('click', closeModal);
    
    function closeModal() {
        audio.pause();
        audio.currentTime = 0;
        modal.style.display = 'none';
        mainContent.style.filter = 'none';
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

function animateNumber(element, start, end, duration) {
    let startTime = null;
    function animation(currentTime) {
        if (!startTime) startTime = currentTime;
        const progress = (currentTime - startTime) / duration;
        const currentNumber = Math.min(Math.floor(progress * (end - start) + start), end);
        element.textContent = currentNumber;
        if (progress < 1) {
            requestAnimationFrame(animation);
        } else {
            element.textContent = end;
        }
    }
    requestAnimationFrame(animation);
}


async function updateAnalytics() {
    const analyticsData = await loadAnalyticsData();
    if (!Object.keys(analyticsData.fileTypes).length && !analyticsData.totalFilesOrganized) {
        analyticsTab.innerHTML = '<div class="no-data">No analytics data available.</div>';
        return;
    }

    // Destroy existing charts to prevent overlap
    [fileTypeChart, fileSizeChart, filesOverTimeChart, fileCategoriesChart, spaceSavedChart]
        .forEach(chart => chart && chart.destroy());

    // Update summary stats with animations
    const totalFilesEl = document.querySelector('.total-files');
    const duplicatesEl = document.querySelector('.duplicates-removed');
    const spaceEl = document.querySelector('.space-saved');
    animateNumber(totalFilesEl, 0, analyticsData.totalFilesOrganized || 0, 1000);
    animateNumber(duplicatesEl, 0, analyticsData.totalDuplicatesRemoved || 0, 1000);
    spaceEl.textContent = formatFileSize(analyticsData.totalSpaceSaved || 0);

    // Cyberpunk Color Palette
    const colors = {
        primary: '#00f5ff',      // Electric cyan
        secondary: '#ff073a',    // Neon red
        tertiary: '#7209b7',     // Deep purple
        accent: '#00ff9f',       // Matrix green
        warning: '#ffb700',      // Electric orange
        dark: '#0a0a0a',         // Deep black
        darkGray: '#1a1a1a',     // Dark gray
        mediumGray: '#2d2d2d',   // Medium gray
        lightGray: '#404040',    // Light gray
        glow: '#00f5ff33'        // Cyan glow (with alpha)
    };

    // Professional gradient colors for charts
    const gradientColors = [
        colors.primary,
        colors.accent,
        colors.tertiary,
        colors.warning,
        colors.secondary,
        '#4cc9f0',  // Light blue
        '#b084cc',  // Lavender
        '#f72585'   // Hot pink
    ];

    // Create gradient backgrounds
    const createGradient = (ctx, color1, color2) => {
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, color1);
        gradient.addColorStop(1, color2);
        return gradient;
    };

    // Chart.js Configuration Options
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            tooltip: {
                backgroundColor: colors.darkGray,
                titleColor: colors.primary,
                bodyColor: '#ffffff',
                borderColor: colors.primary,
                borderWidth: 2,
                cornerRadius: 8,
                titleFont: { family: 'monospace', size: 14, weight: 'bold' },
                bodyFont: { family: 'monospace', size: 12 },
                displayColors: true,
                boxShadow: `0 0 20px ${colors.glow}`
            },
            legend: {
                labels: {
                    color: '#ffffff',
                    font: { family: 'monospace', size: 12, weight: '500' },
                    usePointStyle: true,
                    pointStyle: 'circle',
                    padding: 15
                }
            }
        },
        animation: {
            duration: 2000,
            easing: 'easeOutQuart'
        }
    };

    // 1. Doughnut Chart: File Types Distribution
    const fileTypeCtx = document.getElementById('fileTypeChart').getContext('2d');
    const fileTypeLabels = Object.keys(analyticsData.fileTypes);
    const fileTypeBackgrounds = fileTypeLabels.map((_, index) => {
        const color = gradientColors[index % gradientColors.length];
        return color + '99'; // Add transparency
    });
    const fileTypeBorders = fileTypeLabels.map((_, index) => 
        gradientColors[index % gradientColors.length]
    );

    fileTypeChart = new Chart(fileTypeCtx, {
        type: 'doughnut',
        data: {
            labels: fileTypeLabels,
            datasets: [{
                data: Object.values(analyticsData.fileTypes),
                backgroundColor: fileTypeBackgrounds,
                borderColor: fileTypeBorders,
                borderWidth: 3,
                hoverOffset: 15,
                hoverBorderWidth: 4,
                hoverBorderColor: colors.primary
            }]
        },
        options: {
            ...commonOptions,
            cutout: '65%',
            plugins: {
                ...commonOptions.plugins,
                legend: { 
                    position: 'right',
                    labels: {
                        ...commonOptions.plugins.legend.labels,
                        generateLabels: function(chart) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                return data.labels.map((label, i) => ({
                                    text: label,
                                    fillStyle: data.datasets[0].borderColor[i],
                                    strokeStyle: data.datasets[0].borderColor[i],
                                    lineWidth: 2,
                                    hidden: false,
                                    index: i
                                }));
                            }
                            return [];
                        }
                    }
                }
            }
        }
    });

    // 2. Bar Chart: File Sizes Distribution
    const fileSizeCtx = document.getElementById('fileSizeChart').getContext('2d');
    const sizeGradient = createGradient(fileSizeCtx, colors.primary + '80', colors.accent + '20');
    
    fileSizeChart = new Chart(fileSizeCtx, {
        type: 'bar',
        data: {
            labels: Object.keys(analyticsData.sizeCategories || { '<1MB': 0, '1-10MB': 0, '>10MB': 0 }),
            datasets: [{
                label: 'Files by Size',
                data: Object.values(analyticsData.sizeCategories || { '<1MB': 0, '1-10MB': 0, '>10MB': 0 }),
                backgroundColor: sizeGradient,
                borderColor: colors.primary,
                borderWidth: 2,
                borderRadius: 6,
                borderSkipped: false,
                hoverBackgroundColor: colors.primary + '60',
                hoverBorderColor: colors.accent,
                hoverBorderWidth: 3
            }]
        },
        options: {
            ...commonOptions,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { 
                        color: '#ffffff',
                        font: { family: 'monospace', size: 11 }
                    },
                    grid: { 
                        color: colors.mediumGray,
                        lineWidth: 1
                    },
                    border: { color: colors.lightGray }
                },
                x: {
                    ticks: { 
                        color: '#ffffff',
                        font: { family: 'monospace', size: 11, weight: '500' }
                    },
                    grid: { display: false },
                    border: { color: colors.lightGray }
                }
            },
            plugins: {
                ...commonOptions.plugins,
                legend: { display: false }
            }
        }
    });

    // 3. Line Chart: Files Organized Over Time
    const filesOverTimeCtx = document.getElementById('filesOverTimeChart').getContext('2d');
    const timeData = generateTimeData(analyticsData.totalFilesOrganized);
    const lineGradient = createGradient(filesOverTimeCtx, colors.accent + '60', colors.tertiary + '10');
    
    filesOverTimeChart = new Chart(filesOverTimeCtx, {
        type: 'line',
        data: {
            labels: ['7d ago', '6d ago', '5d ago', '4d ago', '3d ago', '2d ago', 'Today'],
            datasets: [{
                label: 'Files Organized',
                data: timeData,
                borderColor: colors.accent,
                backgroundColor: lineGradient,
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointBackgroundColor: colors.accent,
                pointBorderColor: colors.dark,
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointHoverBackgroundColor: colors.primary,
                pointHoverBorderColor: colors.dark,
                pointHoverBorderWidth: 3
            }]
        },
        options: {
            ...commonOptions,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { 
                        color: '#ffffff',
                        font: { family: 'monospace', size: 11 }
                    },
                    grid: { 
                        color: colors.mediumGray,
                        lineWidth: 1
                    },
                    border: { color: colors.lightGray }
                },
                x: {
                    ticks: { 
                        color: '#ffffff',
                        font: { family: 'monospace', size: 11 }
                    },
                    grid: { 
                        color: colors.mediumGray + '40',
                        lineWidth: 1
                    },
                    border: { color: colors.lightGray }
                }
            },
            plugins: {
                ...commonOptions.plugins,
                legend: { display: false }
            },
            elements: {
                line: {
                    shadowColor: colors.accent + '80',
                    shadowBlur: 10,
                    shadowOffsetX: 0,
                    shadowOffsetY: 0
                }
            }
        }
    });

    // 4. Radar Chart: File Categories Comparison
    const fileCategoriesCtx = document.getElementById('fileCategoriesChart').getContext('2d');
    const categories = ['Documents', 'Images', 'Videos', 'Audio', 'Other'];
    const radarGradient = createGradient(fileCategoriesCtx, colors.tertiary + '40', colors.secondary + '10');
    
    fileCategoriesChart = new Chart(fileCategoriesCtx, {
        type: 'radar',
        data: {
            labels: categories,
            datasets: [{
                label: 'Categories',
                data: categories.map(cat => analyticsData.fileTypes[cat.toLowerCase()] || 0),
                backgroundColor: radarGradient,
                borderColor: colors.tertiary,
                borderWidth: 3,
                pointBackgroundColor: colors.warning,
                pointBorderColor: colors.dark,
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointHoverBackgroundColor: colors.primary,
                pointHoverBorderColor: colors.dark
            }]
        },
        options: {
            ...commonOptions,
            scales: {
                r: {
                    ticks: { 
                        color: '#ffffff',
                        font: { family: 'monospace', size: 10 },
                        backdropColor: 'transparent'
                    },
                    grid: { 
                        color: colors.mediumGray,
                        lineWidth: 1
                    },
                    angleLines: { 
                        color: colors.lightGray,
                        lineWidth: 1
                    },
                    pointLabels: {
                        color: '#ffffff',
                        font: { family: 'monospace', size: 12, weight: '500' }
                    }
                }
            },
            plugins: {
                ...commonOptions.plugins,
                legend: { display: false }
            }
        }
    });

    // 5. Polar Area Chart: Space Saved by Duplicates
    const spaceSavedCtx = document.getElementById('spaceSavedChart').getContext('2d');
    const polarGradient1 = createGradient(spaceSavedCtx, colors.secondary + '80', colors.warning + '40');
    const polarGradient2 = createGradient(spaceSavedCtx, colors.darkGray + '60', colors.mediumGray + '20');
    
    spaceSavedChart = new Chart(spaceSavedCtx, {
        type: 'polarArea',
        data: {
            labels: ['Space Saved', 'Remaining Space'],
            datasets: [{
                data: [analyticsData.totalSpaceSaved || 0, 1000 - (analyticsData.totalSpaceSaved || 0)],
                backgroundColor: [polarGradient1, polarGradient2],
                borderColor: [colors.secondary, colors.mediumGray],
                borderWidth: 2,
                hoverBorderWidth: 4,
                hoverBorderColor: [colors.primary, colors.lightGray]
            }]
        },
        options: {
            ...commonOptions,
            scales: {
                r: {
                    ticks: { 
                        color: '#ffffff',
                        font: { family: 'monospace', size: 10 },
                        backdropColor: 'transparent'
                    },
                    grid: { 
                        color: colors.mediumGray,
                        lineWidth: 1
                    },
                    angleLines: { 
                        color: colors.lightGray,
                        lineWidth: 1
                    }
                }
            },
            plugins: {
                ...commonOptions.plugins,
                legend: { 
                    position: 'bottom',
                    labels: {
                        ...commonOptions.plugins.legend.labels,
                        padding: 20
                    }
                }
            }
        }
    });
}

// Helper Functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function generateTimeData(totalFiles) {
    const data = [];
    for (let i = 6; i >= 0; i--) {
        data.push(Math.floor(totalFiles * (Math.random() * 0.3 + (i / 7))));
    }
    return data;
}

function generateColorPalette(count) {
    const cyberpunkColors = [
        '#00ff9f', // Neon green
        '#00b8ff', // Neon blue
        '#9d00ff', // Neon purple
        '#ff00ff', // Neon pink
        '#ff0057'  // Neon red
    ];
    const colors = [];
    for (let i = 0; i < count; i++) {
        colors.push(cyberpunkColors[i % cyberpunkColors.length]);
    }
    return colors;
}


function generateActivityData(totalFiles) {
    const labels = ['7 days ago', '6 days ago', '5 days ago', '4 days ago', '3 days ago', '2 days ago', 'Today'];
    const values = [];
    const baseValue = totalFiles > 7 ? Math.floor(totalFiles / 7) : 1;
    
    for (let i = 0; i < 7; i++) {
        const variance = Math.floor(baseValue * (Math.random() * 0.6 - 0.3)); 
        const value = Math.max(0, baseValue + variance);
        values.push(value);
    }
    
    return { labels, values };
}
function generateCategoryData(settings, analyticsData) {
    let labels = Object.keys(settings.categories || {});
    if (labels.length === 0) {
        const fileTypes = Object.keys(analyticsData.fileTypes || {});
        labels = groupFileTypesIntoCategories(fileTypes);
    }
    if (labels.length === 0) {
        labels = ['Documents', 'Images', 'Videos', 'Audio', 'Archives', 'Code', 'Other'];
    }
    const values = [];
    const totalFiles = analyticsData.totalFilesOrganized || 0;
    
    labels.forEach(label => {
        if (analyticsData.fileTypes && analyticsData.fileTypes[label.toLowerCase()]) {
            values.push(analyticsData.fileTypes[label.toLowerCase()]);
        } else {
            values.push(Math.floor(totalFiles * Math.random() * 0.3));
        }
    });
    
    return { labels, values };
}


function groupFileTypesIntoCategories(fileTypes) {
    const categoryMap = {
        documents: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'md', 'pages'],
        images: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'svg', 'webp'],
        videos: ['mp4', 'mov', 'avi', 'mkv', 'wmv', 'flv', 'webm'],
        audio: ['mp3', 'wav', 'aac', 'ogg', 'flac', 'm4a'],
        archives: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'],
        code: ['js', 'py', 'java', 'c', 'cpp', 'cs', 'html', 'css', 'php', 'rb']
    };
    
    const categories = {};
    fileTypes.forEach(type => {
        const lowType = type.toLowerCase();
        let assigned = false;
        
        for (const [category, extensions] of Object.entries(categoryMap)) {
            if (extensions.includes(lowType)) {
                categories[category] = (categories[category] || 0) + 1;
                assigned = true;
                break;
            }
        }
        
        if (!assigned) {
            categories['Other'] = (categories['Other'] || 0) + 1;
        }
    });
    
    return Object.keys(categories);
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



const canvas = document.getElementById('matrixCanvas');
const ctx = canvas.getContext('2d');

async function initStats() {
    const analyticsData = await loadAnalyticsData();
    fileCount.textContent = analyticsData.totalFilesOrganized || '0';
    dupCount.textContent = analyticsData.totalDuplicatesRemoved || '0';
    spaceSaved.textContent = formatFileSize(analyticsData.totalSpaceSaved) || '0 KB';
    lastRun.textContent = localStorage.getItem('lastRun') || 'Never';
}



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


function formatFileSize(bytes) {
    if (bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}


const tabContents = {
    main: mainTab,
    stats: statsTab,
    settings: settingsTab,
    help: helpTab,
    analytics: analyticsTab
};

tabs.forEach(tab => {
    tab.addEventListener('click', async () => {
        const tabName = tab.dataset.tab;
        
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        

        Object.values(tabContents).forEach(content => {
            content.style.display = 'none';
            content.classList.remove('active-tab');
        });
        
        const activeTab = tabContents[tabName];
        activeTab.style.display = (tabName === 'main' || tabName === 'stats') ? 'flex' : 'block';
        if (tabName === 'analytics') activeTab.classList.add('active-tab');
        

        output.style.display = tabName === 'main' ? 'block' : 'none';
        if (tabName === 'analytics') await updateAnalytics();
        if (tabName === 'stats') await initStats();
        if (tabName === 'settings') await loadSettings();
        if (tabName === 'help') helpTab.classList.add('active');
        else helpTab.classList.remove('active');
    });
});

// Initialize tabs
mainTab.style.display = 'flex';
statsTab.style.display = 'none';
settingsTab.style.display = 'none';
helpTab.style.display = 'none';
analyticsTab.style.display = 'none';
helpTab.classList.remove('active');
output.style.display = 'block';



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

function initializeHelpTab() {
    const helpSearch = document.getElementById('helpSearch');
    const helpSearchResults = document.getElementById('helpSearchResults');
    const helpCommands = document.getElementById('helpCommands');
    const faqItems = document.querySelectorAll('.faq-item');
    
    // Search functionality
    helpSearch.addEventListener('input', () => {
        const query = helpSearch.value.trim().toLowerCase();
        const commandItems = helpCommands.querySelectorAll('.help-command-item');
        
        helpSearchResults.innerHTML = '';
        
        if (!query) {
            helpSearchResults.style.display = 'none';
            commandItems.forEach(item => item.style.display = 'flex');
            return;
        }
        
        const filtered = Array.from(commandItems).filter(item => 
            item.querySelector('.help-command').textContent.toLowerCase().includes(query)
        );
        
        if (filtered.length) {
            helpSearchResults.innerHTML = filtered.map(item => {
                const commandText = item.querySelector('.help-command').textContent;
                const descText = item.querySelector('.help-description').textContent;
                const highlightedCommand = commandText.replace(
                    new RegExp(query, 'gi'), 
                    match => `<span class="highlight">${match}</span>`
                );
                
                return `<div class="search-result">
                    <span class="help-command">${highlightedCommand}</span>
                    <span class="help-description">${descText}</span>
                </div>`;
            }).join('');
        } else {
            helpSearchResults.innerHTML = '<div class="search-no-results">No commands match your query</div>';
        }
        
        helpSearchResults.style.display = 'block';
    });
    
    // Hide search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!helpSearch.contains(e.target) && !helpSearchResults.contains(e.target)) {
            helpSearchResults.style.display = 'none';
        }
    });
    
    // Click on search result
    helpSearchResults.addEventListener('click', (e) => {
        const searchResult = e.target.closest('.search-result');
        if (searchResult) {
            const commandText = searchResult.querySelector('.help-command').textContent;
            helpSearch.value = '';
            helpSearchResults.style.display = 'none';
            
            // Highlight the command in the main list
            const commandItems = helpCommands.querySelectorAll('.help-command-item');
            commandItems.forEach(item => {
                item.style.display = 'flex';
                if (item.querySelector('.help-command').textContent === commandText) {
                    item.classList.add('highlight-item');
                    item.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setTimeout(() => item.classList.remove('highlight-item'), 2000);
                }
            });
        }
    });
    
    // FAQ accordion functionality
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // Close all other FAQs
            faqItems.forEach(faq => faq.classList.remove('active'));
            
            // Toggle current FAQ
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
    
    // Tutorial buttons
    document.querySelectorAll('.tutorial-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tutorial = btn.dataset.tutorial;
            
            // Add glowing effect to button
            btn.classList.add('tutorial-active');
            setTimeout(() => btn.classList.remove('tutorial-active'), 1000);
            
            // Display notification with terminal-style typing effect
            const notification = document.createElement('div');
            notification.className = 'terminal-notification';
            notification.innerHTML = `<i class="fas fa-info-circle"></i> <span>Initializing ${tutorial} tutorial...</span>`;
            document.getElementById('notifications').appendChild(notification);
            
            // Show in terminal output
            writeToOutput(`[SYSTEM] Loading tutorial: ${tutorial.toUpperCase()}`, 'command');
            setTimeout(() => {
                writeToOutput(`[SYSTEM] Tutorial module "${tutorial}" is currently in development`, 'warning');
            }, 1000);
            
            // Remove notification after delay
            setTimeout(() => {
                notification.classList.add('fadeout');
                setTimeout(() => notification.remove(), 500);
            }, 3000);
        });
    });
    
    // Add typing effect to help tab on first load
    document.querySelector('.terminal-tab[data-tab="help"]').addEventListener('click', function() {
        if (!this.dataset.loaded) {
            this.dataset.loaded = true;
            typeHelpEffects();
        }
    });
    
    // Add keyboard shortcut functionality
    document.addEventListener('keydown', (e) => {
        // F1 for help
        if (e.key === 'F1') {
            e.preventDefault();
            document.querySelector('.terminal-tab[data-tab="help"]').click();
        }
        
        // Detect Ctrl combinations
        if (e.ctrlKey) {
            switch (e.key.toLowerCase()) {
                case 'o': // Ctrl+O for organize
                    e.preventDefault();
                    document.getElementById('organizeBtn').click();
                    break;
                case 's': // Ctrl+S for save settings
                    e.preventDefault();
                    document.getElementById('saveSettingsBtn').click();
                    break;
                case 'f': // Ctrl+F for search focus
                    e.preventDefault();
                    if (document.getElementById('helpTab').style.display !== 'none') {
                        document.getElementById('helpSearch').focus();
                    } else {
                        document.getElementById('searchInput').focus();
                    }
                    break;
            }
        }
    });
}

// Type writing effect for various help elements
function typeHelpEffects() {
    const elements = [
        { selector: '.help-title', delay: 0 },
        { selector: '.section-header h3:first-of-type', delay: 500 },
        { selector: '.section-header h3:nth-of-type(2)', delay: 800 },
        { selector: '.section-header h3:nth-of-type(3)', delay: 1100 }
    ];
    
    elements.forEach(item => {
        setTimeout(() => {
            const element = document.querySelector(item.selector);
            if (!element) return;
            
            const text = element.textContent;
            element.textContent = '';
            element.classList.add('typing');
            
            let i = 0;
            const typeInterval = setInterval(() => {
                if (i < text.length) {
                    element.textContent += text.charAt(i);
                    i++;
                } else {
                    clearInterval(typeInterval);
                    element.classList.remove('typing');
                }
            }, 50);
        }, item.delay);
    });
}

// Call this function to initialize help tab when document is loaded
document.addEventListener('DOMContentLoaded', initializeHelpTab);

// Add to existing renderer.js or include as a separate script
function writeToOutput(text, type = 'normal') {
    const output = document.getElementById('output');
    const line = document.createElement('div');
    line.className = `output-line ${type}`;
    line.textContent = text;
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
}

function showNotification(message, type = 'info') {
    const notifications = document.getElementById('notifications');
    const notification = document.createElement('div');
    notification.className = `terminal-notification ${type}`;
    
    // Add icon based on type
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'warning') icon = 'exclamation-triangle';
    if (type === 'error') icon = 'times-circle';
    
    notification.innerHTML = `<i class="fas fa-${icon}"></i> <span>${message}</span>`;
    notifications.appendChild(notification);
    
    // Auto-remove after delay
    setTimeout(() => {
        notification.classList.add('fadeout');
        setTimeout(() => notification.remove(), 500);
    }, 4000);
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