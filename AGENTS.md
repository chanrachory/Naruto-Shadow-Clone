# AGENTS

## Purpose

This file helps AI coding agents understand the structure, runtime behavior, and development conventions of the Naruto Shadow Clone project.

## Project Overview

- Single-page browser app using webcam input, MediaPipe, and TensorFlow.js for a shadow clone gesture effect.
- Includes a separate trainer page for recording hand sign examples and training a custom gesture model.
- No Node.js backend or build system is included; this is a static web app served locally.

## Key files

- `index.html` — main app page with clone rendering and webcam feed.
- `script.js` — clone effect, gesture detection, smoke rendering, and MediaPipe setup.
- `trainer.html` — model training UI and sample capture interface.
- `trainer.js` — gesture sample collection, TensorFlow.js model training, and prediction logic.
- `styles.css` / `trainer.css` — styling for main app and trainer page.
- `assets/` — smoke sprite folders used by the clone effect.
- `README.md` — primary user-facing instructions and local server setup.

## Development notes

- The app is intended to run from a local HTTP server because webcam access requires it.
- Recommended dev command: `npx serve -p 3000`.
- The project uses CDN-hosted dependencies for TensorFlow.js and MediaPipe; there is no `package.json` or package install step required for the browser code.
- Model files are not included in the repo. The trainer flow outputs `gesture-model.json` and `gesture-model.weights.bin`, which should be placed in the repo root to enable inference.

## What agents should do

- Prefer editing or extending `script.js` and `trainer.js` rather than creating a backend.
- Use `README.md` for user-facing instructions and link back to it when updating setup guidance.
- Keep changes aligned with the static web app nature: no server-side frameworks, no build pipeline.
- For UI behavior changes, update the relevant HTML/CSS plus JavaScript in the existing files.

## Notes for future agent customizations

- If this repo expands to include a build process or test harness, add a dedicated `.github/copilot-instructions.md` or a second agent section for build/test conventions.
- If gesture/model training complexity increases, consider a separate skill for model training and data collection patterns.
