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

// Onboarding Modal Logic
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
    
    // Typing animation setup
    typingText.style.width = '0';
    
    // Show modal and blur background
    modal.style.display = 'block';
    mainContent.style.filter = 'blur(5px)';
    
    // Terminal messages to display sequentially
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
    
    // Function to simulate typing effect
    function typeNextMessage() {
        if (currentMessageIndex < messages.length) {
            const message = messages[currentMessageIndex];
            typingText.textContent = "";
            typingText.style.animation = 'none';
            
            // Trigger reflow
            void typingText.offsetWidth;
            
            typingText.textContent = message;
            typingText.style.animation = `typing 2s steps(${message.length}, end), blink-caret 0.75s step-end infinite`;
            
            currentMessageIndex++;
            
            // Schedule next message
            if (currentMessageIndex < messages.length) {
                setTimeout(typeNextMessage, 3000);
            }
        }else {
            currentMessageIndex = 0; // Loop again
            setTimeout(typeNextMessage, 1000);
        }
    }
    
    // Start the typing animation
    typeNextMessage();
    
    // Play audio with visualizer animation
    audio.play();
    
    // Animate loading bar based on audio duration
    audio.addEventListener('timeupdate', () => {
        const progress = (audio.currentTime / audio.duration) * 100;
        loadingBar.style.width = `${progress}%`;
    });
    
    // Enable next button when audio ends
    audio.onended = () => {
        nextBtn.disabled = false;
        visualizerBars.forEach(bar => {
            bar.style.animation = 'none';
        });
    };
    
    // Add audio visualization
    function updateVisualizer() {
        if (audio.paused) return;
        
        // In an actual implementation, we would analyze audio data using Web Audio API
        // For the demo, we're just creating a random visualization
        visualizerBars.forEach(bar => {
            const height = Math.random() * 100;
            bar.style.height = `${height}%`;
        });
        
        requestAnimationFrame(updateVisualizer);
    }
    
    audio.addEventListener('play', () => {
        updateVisualizer();
    });
    
    // Close modal on skip or next button click
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


async function updateAnalytics() {
    const analyticsData = await loadAnalyticsData();
    if (!Object.keys(analyticsData.fileTypes).length && !analyticsData.totalFilesOrganized) {
        analyticsTab.innerHTML = '<div class="no-data">No analytics data available.</div>';
        return;
    }

    if (fileTypeChart) fileTypeChart.destroy();
    if (fileSizeChart) fileSizeChart.destroy();

    analyticsTab.innerHTML = `
    <h2 class="analytics-title">File Analytics Dashboard</h2>
    
    <div class="analytics-summary">
        <div class="summary-card">
            <div class="summary-icon"><i class="fas fa-file-alt"></i></div>
            <div class="summary-data">
                <div class="summary-value">${analyticsData.totalFilesOrganized || 0}</div>
                <div class="summary-label">Files Organized</div>
            </div>
        </div>
        <div class="summary-card">
            <div class="summary-icon"><i class="fas fa-copy"></i></div>
            <div class="summary-data">
                <div class="summary-value">${analyticsData.totalDuplicatesRemoved || 0}</div>
                <div class="summary-label">Duplicates Removed</div>
            </div>
        </div>
        <div class="summary-card">
            <div class="summary-icon"><i class="fas fa-save"></i></div>
            <div class="summary-data">
                <div class="summary-value">${formatFileSize(analyticsData.totalSpaceSaved || 0)}</div>
                <div class="summary-label">Space Saved</div>
            </div>
        </div>
    </div>
    
    <div class="analytics-grid">
        <div class="chart-container">
            <h3 class="chart-title">File Types Distribution</h3>
            <canvas id="fileTypeChart"></canvas>
        </div>
        <div class="chart-container">
            <h3 class="chart-title">File Sizes</h3>
            <canvas id="fileSizeChart"></canvas>
        </div>
        <div class="chart-container">
            <h3 class="chart-title">Storage Efficiency</h3>
            <canvas id="efficiencyChart"></canvas>
        </div>
        <div class="chart-container">
            <h3 class="chart-title">File Activity</h3>
            <canvas id="fileActivityChart"></canvas>
        </div>
        <div class="chart-container wide">
            <h3 class="chart-title">Category Distribution</h3>
            <canvas id="categoryDistributionChart"></canvas>
        </div>
    </div>
`;

try {
    // Enhanced Pie Chart for File Types
    const pieCtx = document.getElementById('fileTypeChart').getContext('2d');
    const fileTypes = Object.keys(analyticsData.fileTypes);
    const fileTypeCounts = Object.values(analyticsData.fileTypes);
    
    // Generate a nicer gradient color palette
    const colorPalette = generateColorPalette(fileTypes.length);
    
    fileTypeChart = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
            labels: fileTypes,
            datasets: [{
                data: fileTypeCounts,
                backgroundColor: colorPalette,
                borderColor: 'rgba(0, 10, 0, 0.1)',
                borderWidth: 1,
                hoverOffset: 15
            }]
        },
        options: {
            plugins: {
                legend: {
                    position: 'right',
                    labels: { 
                        color: '#00FF00',
                        font: {
                            family: 'monospace',
                            size: 11
                        },
                        boxWidth: 15,
                        padding: 10
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#00FF00',
                    bodyColor: '#00FF00',
                    borderColor: '#00FF00',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw;
                            const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '60%',
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                animateRotate: true,
                animateScale: true,
                duration: 1500,
                easing: 'easeOutQuart'
            }
        }
    });

    // Enhanced Bar Chart for File Sizes
    const barCtx = document.getElementById('fileSizeChart').getContext('2d');
    const sizeCategories = Object.keys(analyticsData.sizeCategories);
    const sizeCounts = Object.values(analyticsData.sizeCategories);
    
    fileSizeChart = new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: sizeCategories,
            datasets: [{
                label: 'File Count by Size',
                data: sizeCounts,
                backgroundColor: 'rgba(0, 255, 0, 0.7)',
                borderColor: 'rgba(0, 255, 0, 1)',
                borderWidth: 1,
                borderRadius: 5,
                barPercentage: 0.7,
                categoryPercentage: 0.7
            }]
        },
        options: {
            scales: {
                y: { 
                    beginAtZero: true,
                    ticks: { 
                        color: '#00FF00',
                        font: {
                            family: 'monospace'
                        }
                    },
                    grid: {
                        color: 'rgba(0, 255, 0, 0.1)'
                    }
                },
                x: { 
                    ticks: { 
                        color: '#00FF00',
                        font: {
                            family: 'monospace'
                        },
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: { 
                    display: false 
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#00FF00',
                    bodyColor: '#00FF00',
                    borderColor: '#00FF00',
                    borderWidth: 1
                }
            },
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1500,
                easing: 'easeOutQuart'
            }
        }
    });

    // New Chart: Efficiency Gauge Chart
    const efficiencyCtx = document.getElementById('efficiencyChart').getContext('2d');
    const totalFilesBeforeOpt = analyticsData.totalFilesOrganized + analyticsData.totalDuplicatesRemoved;
    const efficiencyPercentage = totalFilesBeforeOpt > 0 
        ? Math.round((analyticsData.totalDuplicatesRemoved / totalFilesBeforeOpt) * 100) 
        : 0;
    
    window.efficiencyChart = new Chart(efficiencyCtx, {
        type: 'doughnut',
        data: {
            labels: ['Space Saved', 'Current Space'],
            datasets: [{
                data: [efficiencyPercentage, 100 - efficiencyPercentage],
                backgroundColor: [
                    'rgba(0, 255, 0, 0.9)',
                    'rgba(0, 40, 0, 0.2)'
                ],
                borderWidth: 0,
                circumference: 180,
                rotation: 270
            }]
        },
        options: {
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            },
            cutout: '75%',
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // Add efficiency percentage text in the center
    const efficiency = efficiencyPercentage;
    const centerText = {
        id: 'centerText',
        afterDatasetsDraw(chart, args, pluginOptions) {
            const { ctx, data } = chart;
            const centerX = chart.getDatasetMeta(0).data[0].x;
            const centerY = chart.getDatasetMeta(0).data[0].y + 20;

            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 24px monospace';
            ctx.fillStyle = '#00FF00';
            ctx.fillText(`${efficiency}%`, centerX, centerY);
            
            ctx.font = '12px monospace';
            ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
            ctx.fillText('Efficiency', centerX, centerY + 25);
            ctx.restore();
        }
    };
    
    Chart.register(centerText);

    // New Chart: File Activity Line Chart (simulated data based on total files)
    const fileActivityCtx = document.getElementById('fileActivityChart').getContext('2d');
    // Generate some activity data based on total files
    const activityData = generateActivityData(analyticsData.totalFilesOrganized || 0);
    
    window.fileActivityChart = new Chart(fileActivityCtx, {
        type: 'line',
        data: {
            labels: activityData.labels,
            datasets: [{
                label: 'Files Processed',
                data: activityData.values,
                borderColor: '#00FF00',
                backgroundColor: 'rgba(0, 255, 0, 0.1)',
                borderWidth: 2,
                pointBackgroundColor: '#00FF00',
                pointBorderColor: 'rgba(0, 0, 0, 0.6)',
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#00FF00' },
                    grid: { color: 'rgba(0, 255, 0, 0.1)' }
                },
                x: {
                    ticks: { color: '#00FF00' },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false }
            },
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // New Chart: Category Distribution Radar Chart
    const catDistCtx = document.getElementById('categoryDistributionChart').getContext('2d');
    // Generate category data from settings and analytics
    const categoryData = generateCategoryData(settings, analyticsData);
    
    window.categoryDistributionChart = new Chart(catDistCtx, {
        type: 'radar',
        data: {
            labels: categoryData.labels,
            datasets: [{
                label: 'File Distribution',
                data: categoryData.values,
                backgroundColor: 'rgba(0, 255, 0, 0.2)',
                borderColor: '#00FF00',
                borderWidth: 2,
                pointBackgroundColor: '#00FF00',
                pointBorderColor: '#000',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#00FF00',
                pointRadius: 4
            }]
        },
        options: {
            scales: {
                r: {
                    beginAtZero: true,
                    angleLines: { color: 'rgba(0, 255, 0, 0.2)' },
                    grid: { color: 'rgba(0, 255, 0, 0.2)' },
                    pointLabels: { 
                        color: '#00FF00',
                        font: { family: 'monospace' } 
                    },
                    ticks: { 
                        backdropColor: 'transparent',
                        color: 'rgba(0, 255, 0, 0.7)',
                        showLabelBackdrop: false
                    }
                }
            },
            plugins: {
                legend: { display: false }
            },
            responsive: true,
            maintainAspectRatio: false
        }
    });

} catch (error) {
    console.error('Chart rendering error:', error);
    analyticsTab.innerHTML = `<div class="error">Error rendering charts: ${error.message}</div>`;
}

}

function generateColorPalette(count) {
    const colors = [];
    for (let i = 0; i < count; i++) {
        // Create variations of green with different brightness and saturation
        const hue = 120; // Green hue
        const saturation = 80 + Math.random() * 20; // 80-100%
        const lightness = 30 + (i * 40 / count); // Distribute lightness
        colors.push(`hsla(${hue}, ${saturation}%, ${lightness}%, 0.9)`);
    }
    return colors;
}

// Helper function to generate simulated activity data
function generateActivityData(totalFiles) {
    const labels = ['7 days ago', '6 days ago', '5 days ago', '4 days ago', '3 days ago', '2 days ago', 'Today'];
    const values = [];
    const baseValue = totalFiles > 7 ? Math.floor(totalFiles / 7) : 1;
    
    for (let i = 0; i < 7; i++) {
        // Simulate some variance in the daily numbers
        const variance = Math.floor(baseValue * (Math.random() * 0.6 - 0.3)); // ±30%
        const value = Math.max(0, baseValue + variance);
        values.push(value);
    }
    
    return { labels, values };
}
function generateCategoryData(settings, analyticsData) {
    // First, use categories from settings
    let labels = Object.keys(settings.categories || {});
    
    // If no settings categories exist, create default categories based on file types
    if (labels.length === 0) {
        const fileTypes = Object.keys(analyticsData.fileTypes || {});
        labels = groupFileTypesIntoCategories(fileTypes);
    }
    
    // Ensure we have at least some categories for the visualization
    if (labels.length === 0) {
        labels = ['Documents', 'Images', 'Videos', 'Audio', 'Archives', 'Code', 'Other'];
    }
    
    // Generate distribution values based on file types or make up reasonable data
    const values = [];
    const totalFiles = analyticsData.totalFilesOrganized || 0;
    
    labels.forEach(label => {
        // Try to match label with file types or use a generated value
        if (analyticsData.fileTypes && analyticsData.fileTypes[label.toLowerCase()]) {
            values.push(analyticsData.fileTypes[label.toLowerCase()]);
        } else {
            // Generate a reasonable value based on total files
            values.push(Math.floor(totalFiles * Math.random() * 0.3));
        }
    });
    
    return { labels, values };
}

// Helper function to group file types into logical categories
function groupFileTypesIntoCategories(fileTypes) {
    const categoryMap = {
        documents: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'md', 'pages'],
        images: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'svg', 'webp'],
        videos: ['mp4', 'mov', 'avi', 'mkv', 'wmv', 'flv', 'webm'],
        audio: ['mp3', 'wav', 'aac', 'ogg', 'flac', 'm4a'],
        archives: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'],
        code: ['js', 'py', 'java', 'c', 'cpp', 'cs', 'html', 'css', 'php', 'rb']
    };
    
    // Count file types per category
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
        
        // Update active tab button
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Manage tab content display and active-tab class
        Object.values(tabContents).forEach(content => {
            content.style.display = 'none';
            content.classList.remove('active-tab');
        });
        
        const activeTab = tabContents[tabName];
        activeTab.style.display = (tabName === 'main' || tabName === 'stats') ? 'flex' : 'block';
        if (tabName === 'analytics') activeTab.classList.add('active-tab');
        
        // Tab-specific actions
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