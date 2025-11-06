## Quick orientation (what this project is)

- This is a Card Master Tools Suite built with Electron. The main process is in `Main.js` and manages navigation between different tools. Each tool lives in its own subdirectory under `tools/` with specialized functionality.
- Start the app with: run `npm install` once, then `npm start` (package.json script runs `electron .`).

## Important files

- `Main.js` — Electron entry (creates BrowserWindow, handles navigation between tools via IPC). The BrowserWindow uses `preload: path.join(__dirname, 'preload.js')`.
- `preload.js` — Exposes navigation API via `contextBridge` for secure tool switching.
- `index.html` — Homepage with tool selection interface.
- `tools/defect-finder/` — Defect marking tool with magnification and export capabilities.
- `tools/image-crop/` — 3D card creator with intelligent background removal and GLB export.
- `package.json` — project metadata and `start` script. Note `electron` is a devDependency (v32) so `npm install` is required before `npm start`.

## Available Tools

### Defect Finder Tool (`tools/defect-finder/`)
- **Purpose**: Mark up to 8 defects on card images with rotation and magnification
- **Key features**: Magnifying glass, rotation alignment, defect circles, export with overlays
- **Main file**: `defect-finder-tool.js`

### 3D Card Creator (`tools/image-crop/`)
- **Purpose**: Create 3D models from front/back card images
- **Key features**: Background removal, flood fill cropping, texture mapping, GLB export
- **Main file**: `image-crop-3d.js` (ES6 module with Three.js integration)

## Navigation Pattern

- Tools are loaded via `ipcMain.handle('navigate-to-tool')` in `Main.js`
- From homepage: `window.electronAPI.navigateToTool('tool-name')`
- Supported tools: `'image-crop'`, `'defect-finder'`, `'homepage'`

## Key runtime / data-flow patterns

- **Multi-tool architecture**: Each tool is self-contained with its own HTML/JS files
- **IPC navigation**: Tools communicate with main process for navigation only
- **Canvas-based UI**: Both tools use HTML5 Canvas for image manipulation
- **Export capabilities**: Both tools can export processed images/models

## Tool-Specific Patterns

### Defect Finder
- **State management**: Tracks rotation points, defect points, and magnifications
- **Canvas interaction**: Handles mouse events for rotation setup and defect marking
- **Export**: Generates marked images and composite reports

### 3D Card Creator  
- **Image processing**: Front/back alignment, background removal, cropping
- **Three.js integration**: Creates 3D models with texture mapping
- **Export formats**: GLB (recommended) and OBJ formats

## DOM and Component Structure

- Each tool follows consistent patterns: canvas container, control panels, status messages
- Tools use similar zoom/pan controls but implement them independently
- Magnifier components are present in both tools with similar APIs

## Project-specific conventions

- **ES6 modules**: 3D Card Creator uses modern module imports (Three.js)
- **Self-contained tools**: Each tool directory contains all necessary assets
- **Consistent styling**: All tools use Tailwind CSS for UI consistency
- **Export naming**: Generated files include timestamps for uniqueness

## Development Workflow

1. `npm install` (first time only)
2. `npm start` to launch Electron app  
3. Navigate between tools from homepage
4. Each tool can be developed/tested independently

## Adding New Tools

1. Create new directory under `tools/new-tool-name/`
2. Add `index.html` and tool-specific JS file
3. Update `Main.js` navigation handler
4. Add tool card to homepage `index.html`

## What NOT to change carelessly

- Navigation IPC handlers in `Main.js` — other tools depend on this structure
- Canvas drawing patterns — both tools have optimized rendering loops
- Three.js import maps in 3D Card Creator — required for ES6 module loading
- Export file naming patterns — users depend on timestamp-based naming

## Questions / missing info

- Additional export formats needed? (Currently supports PNG images and GLB/OBJ models)
- Performance optimization priorities? (Both tools handle large images well)
- Additional tool requirements? (Current focus is on defect analysis and 3D modeling)
