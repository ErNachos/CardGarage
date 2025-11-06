## Quick orientation (what this project is)

- This is a small Electron renderer-heavy app. The Electron main process is in `Main.js` (creates a BrowserWindow and points to `preload.js`). The UI and application logic live inline in `index.html` (canvas-based image measurement tool).
- Start the app with: run `npm install` once, then `npm start` (package.json script runs `electron .`).

## Important files

- `Main.js` — Electron entry (creates BrowserWindow, sets `preload` to `preload.js`). Example: the BrowserWindow uses `preload: path.join(__dirname, 'preload.js')`.
- `preload.js` — currently empty; use it to expose safe IPC via `contextBridge` if you add native/Node functionality to the renderer.
- `index.html` — All renderer code (DOM, canvas drawing, measurement logic) is inline in a single <script>. This is the primary file to edit for UI/behavior.
- `package.json` — project metadata and `start` script. Note `electron` is a devDependency (v32) so `npm install` is required before `npm start`.

## Key runtime / data-flow patterns to know

- Single-process UI: The measurement app runs mostly in the renderer. The main process only opens the window. There is currently no IPC across processes.
- Image/measurement flow (see `index.html`):
  - Image loaded via the hidden `<input id="imageLoader">` → `handleImageUpload` reads it into an `Image()` object.
  - Calibration uses `points[0]` and `points[1]` (two clicks). The `calculateScale()` function computes `pixelsPerMm` from these points and `#realWidth` input.
  - Measurement points are stored at `points[2..]` (8 clicks expected). `updateMeasurements()` reads those and fills the results UI (`#resLeft`, `#resRight`, `#resTop`, `#resBottom`).
  - Coordinate transform helper: `screenToWorld(clientX, clientY)` converts screen coordinates to image coordinates using `pan` and `zoom` state.

## DOM IDs and programmatic hooks (use these when editing)

- Inputs and buttons: `#imageLoader`, `#realWidth`, `#calibrateButton`, `#measureButton`, `#resetPointsButton`, `#zoomSlider`
- Result elements: `#resLeft`, `#resRight`, `#resTop`, `#resBottom`, `#resHPercent`, `#resVPercent`, `#resPoints`, `#statusMessage`
- Canvas area: `#canvasContainer`, `#imageCanvas` — all drawing occurs on `imageCanvas` with transforms applied via `pan` and `zoom`.

## Project-specific conventions and gotchas

- Inline renderer logic: Most app logic is embedded directly inside `index.html`. Search and edit the inline <script> when changing behavior — there is no separate bundler or renderer JS file.
- File name case: repository has `Main.js` (capital M) but `package.json` `main` field references `main.js` (lowercase). On Windows this is OK, but be careful when running or packaging for case-sensitive systems.
- No tests / no build step: There are no test scripts or bundlers configured. The canonical developer workflow is `npm install` then `npm start` (Electron). Do not expect `npm test` or automated linting unless added.

## If you add native integration or IPC

- Use `preload.js` to expose only the safe API via `contextBridge.exposeInMainWorld(...)`.
- In `Main.js` use `ipcMain` handlers to perform privileged tasks and keep UI logic in the renderer.
- Keep the renderer free of Node globals (currently it is browser-only), unless you intentionally add NodeIntegration.

## Small examples (copy-paste safe patterns)

- Convert a click to world coords (use the existing helper):
  const world = screenToWorld(e.clientX, e.clientY);

- Read measured left distance (mm):
  // after calibration and points set
  const leftMm = measurements.left; // shown in `#resLeft`

## What NOT to change carelessly

- Avoid moving the core canvas drawing logic out-of-context without updating the DOM IDs — many UI controls assume specific IDs.
- Don't enable NodeIntegration in BrowserWindow; prefer `preload.js` + `contextBridge` for safety.

## Questions / missing info (please confirm)

- Preferred packaging/target platforms? (Windows-only vs cross-platform packaging) — affects how Main.js and filenames are treated.
- Any CI steps or custom start scripts missing from `package.json` we should include?

If anything here is unclear or you'd like different focal points (packaging, tests, splitting renderer code), tell me which area to expand and I will iterate.
