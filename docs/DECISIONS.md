# Project Architectural Decisions

## 1. MainApp Component Naming
* **Context:** Windows filesystems (NTFS) are case-insensitive. Having both `app.jsx` (the Vite entry point) and `App.jsx` (the root React component) in `resources/js/` would collide and overwrite each other.
* **Decision:** Keep `resources/js/app.jsx` as the entry point (matching `vite.config.js` and Blade `@vite`) and name the top-level route/layout component `MainApp.jsx` in `resources/js/MainApp.jsx`.
