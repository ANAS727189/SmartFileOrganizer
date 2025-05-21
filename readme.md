# Terminal File Organizer

![Terminal File Organizer Screenshot](assets/screenshot.png)

**Terminal File Organizer** is a cross-platform desktop application built with Electron and Python that automates file organization, removes duplicates, and provides analytics. Featuring a cyberpunk-inspired terminal UI, it offers a powerful yet user-friendly way to manage files efficiently.

## Features

- **File Organization** - Organize files by type, date, or size into categorized folders with customizable rules
- **Duplicate Removal** - Identify and remove duplicate files to save disk space with parallel processing for optimal performance
- **Real-Time File Watcher** - Automatically organize new files in monitored directories using the watchdog library
- **Analytics Dashboard** - Visualize file distributions and storage efficiency with interactive Chart.js-powered charts
- **File Preview** - Preview images, PDFs, and text files directly within the application
- **Customizable Categories** - Define and modify custom file categories through the Settings tab
- **Interactive Help** - Access comprehensive help with searchable commands, tutorials, and FAQs
- **Cyberpunk UI** - Terminal-style interface with matrix background, neon colors, and engaging onboarding animation

## Tech Stack

### Frontend
- **Electron** - Cross-platform desktop framework
- **HTML/CSS/JavaScript** - Core web technologies
- **Chart.js** - Data visualization library
- **pdf.js** - PDF rendering engine

### Backend
- **Python 3.8+** - Core processing logic
- **watchdog** - File system monitoring
- **tqdm** - Progress bar visualization
- **colorama** - Terminal color formatting
- **shutil/pathlib** - File operations and path management

### Integration
- **Node.js** - JavaScript runtime
- **IPC** - Electron-Python communication
- **JSON** - Configuration and data storage

## Installation

### Prerequisites
- Node.js (v16 or higher)
- Python (3.8 or higher)
- npm or yarn
- Git

### Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/terminal-file-organizer.git
   cd terminal-file-organizer
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the application:
   ```bash
   npm start
   ```

### Python Dependencies
Create a `requirements.txt` file with the following dependencies:
```
colorama==0.4.6
tqdm==4.66.1
watchdog==3.0.0
```

## Usage

### Basic Operations
1. **Select Directory** - Use the "Browse" button or enter a path to choose a directory
2. **Choose Organization Mode** - Select from Type, Date, or Size in the dropdown menu
3. **Configure Duplicate Handling** - Check the "Remove Duplicates" option if desired
4. **Run Organization** - Click "Organize Files" to start the process
5. **Monitor Directories** - Use "Start Watcher" to automatically organize new files in real-time

### Advanced Features
- **Analytics** - Visit the Analytics tab to view file distribution charts and storage insights
- **Settings** - Customize file categories and organization rules in the Settings tab
- **Help System** - Access the Help tab or type `help` for commands and tutorials
- **File Preview** - Select any file to preview its contents within the application

## Screenshots

### Main Interface
![Main Interface](assets/main-interface.png)

### Analytics Dashboard
![Analytics Dashboard](assets/analytics-dashboard.png)

## Project Structure

```
terminal-file-organizer/
├── client/
│   ├── src/
│   │   ├── renderer/
│   │   │   ├── index.html        # Main application HTML
│   │   │   ├── styles.css        # Application styling
│   │   │   ├── js/              
│   │   │       ├── renderer.js   # Main renderer process
│   │   │       
│   │   │       
│   │   │       
│   ├── main.js                   # Electron main process
│   ├── assets/                   # Images and UI assets
|   |── package.json              # Project metadata and dependencies
├── server/
│   ├── __main__.py               # Python entry point
│   ├── config.py                 # Configuration handling
│   ├── duplicate_remover.py      # Duplicate file detection/removal
│   ├── organizers.py             # File organization algorithms
│   ├── ui.py                     # Terminal UI components
│   ├── utils.py                  # Utility functions
│   ├── watcher.py                # Real-time file monitoring
├── userData/
│   ├── settings.json             # User settings
│   ├── analytics.json            # Analytics data
├── requirements.txt              # Python dependencies
└── README.md                     # Documentation
```

## Key Technical Contributions

This project demonstrates several technical achievements:

- **Hybrid Architecture** - Seamlessly integrates Electron's UI capabilities with Python's powerful file processing through efficient IPC communication
- **Parallel Processing** - Implements multi-threading for duplicate detection and file operations, significantly improving performance on large directories
- **Reactive UI** - Provides real-time feedback during operations with progress bars and status updates
- **Data Visualization** - Uses Chart.js to transform file analysis into actionable insights
- **Persistent Configuration** - Maintains user preferences and custom rules across sessions

## Future Improvements

- **Testing Framework** - Add comprehensive unit tests using Jest for frontend and pytest for backend
- **Plugin System** - Implement a plugin architecture for custom organization modes and extensions
- **Accessibility** - Enhance the UI with ARIA attributes and keyboard navigation support
- **Performance Optimization** - Implement batch processing for very large directories (100,000+ files)
- **Cloud Integration** - Add support for cloud storage services like Dropbox, Google Drive, and OneDrive

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request