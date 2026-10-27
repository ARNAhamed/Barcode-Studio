# Barcode Designer — Project Context for the Antigravity Agent

> Read this file fully before writing any code. Follow it as the source of truth. If something is unclear, make the simplest reasonable choice and note it in `docs/DECISIONS.md`.

## 0. Existing Setup (IMPORTANT — read first)

Laravel and React (Vite) are **already installed** in this directory.
- Do **NOT** re-create the Laravel project or re-scaffold React/Vite. Do not run `composer create-project` or `npm create vite`.
- First **inspect** the project: check `composer.json`, `package.json`, `vite.config.js`, `routes/`, `resources/` and how React is currently wired (plain React SPA, or Inertia starter kit).
- **Adapt to what exists.** Keep the current setup and only install missing packages. If React is not yet mounted through Laravel's Vite setup, connect it as described in section 1.
- If the existing React setup is a separate folder, tell me before moving anything, and propose the simplest way to end up with one directory.
- Report what you found and what you plan to change before editing files.

## 1. What We Are Building

A web application to **design and create barcodes and QR codes**, linked to a **stock (product) list**.

**Stack (single project, one directory)**
- Backend: Laravel 11 (PHP 8.2+), REST JSON API (`routes/api.php`), MySQL
- Frontend: React 18 inside the same Laravel project (Vite + `laravel-vite-plugin`), React Router, Tailwind CSS, `lucide-react` icons
- One Blade view (`resources/views/app.blade.php`) mounts the React SPA; a catch-all web route serves it for every non-API URL
- Barcode/QR libs (frontend): `jsbarcode`, `qr-code-styling`, `html-to-image`
- Data fetching: `axios` + `@tanstack/react-query`
- Notifications: `react-hot-toast`

**Structure (single directory — do NOT create separate backend/frontend folders)**
```
barcode-designer/
├── app/                 # Laravel models, controllers, requests, resources
├── database/            # migrations, seeders
├── routes/
│   ├── api.php          # /api/* endpoints
│   └── web.php          # catch-all -> app.blade.php (React SPA)
├── resources/
│   ├── views/app.blade.php
│   ├── css/app.css      # Tailwind
│   └── js/              # React app (see section 6)
├── vite.config.js
├── package.json
├── composer.json
└── PROJECT.md
```

**Run locally:** `php artisan serve` + `npm run dev` (two terminals), open http://localhost:8000. Same origin, so no CORS setup is needed.

## 2. Pages (4)

### 2.1 Gallery (`/`) — start page
- Default route when the app opens.
- Shows saved codes as a responsive card grid (1 / 2 / 3 / 4 columns).
- Card: preview image, name, type badge (Barcode / QR), format, created date, actions (Edit, Download PNG, Delete).
- Top bar: search box, filter chips (All / Barcode / QR), "Recycle Bin" button (with count badge, opens `/bin?tab=designs`), "Create New" button.
- Empty state: friendly illustration/icon + text "No codes yet" + button "Design your first code".
- Delete asks for confirmation ("Move to Recycle Bin") and shows a toast with an Undo action after deleting.

### 2.2 Designer (`/designer` and `/designer/:id`)
Two-column layout: **controls (left)**, **live preview (right, sticky/fixed)**.
Controls are grouped into collapsible sections (**Artboard**, **Code Size**, **Colors**, **Label Text**) to keep the panel organized and avoid overcrowding.

- Toggle at top: **Barcode | QR Code**.
- **Source of data**: either type custom text OR pick a product from stock (autocomplete). Picking a product auto-fills the value (SKU / barcode number / URL).
- **Artboard Canvas Controls**:
  - Concept: The artboard is the label, card, or page canvas the code is placed on.
  - Preset dropdown: `Auto` (fit to code, legacy behavior), `Small label 50 x 25 mm`, `Shelf label 60 x 40 mm`, `Product label 100 x 50 mm`, `Shipping label 100 x 150 mm`, `A6 (105 x 148 mm)`, `A5 (148 x 210 mm)`, `A4 (210 x 297 mm)`, `Square 50 x 50 mm`, `Business card 90 x 55 mm`, and `Custom`.
  - Unit selector: `px`, `cm`, `mm`, `inch` (default `px` or active unit).
  - Width and Height manual inputs supporting decimals. Typing a dimension switches preset to `Custom`.
  - Orientation toggle (portrait / landscape) that swaps width and height.
  - Lock aspect ratio toggle.
  - Styling: Artboard background color, optional border (on/off, color, thickness), and corner radius.
  - Validation: No empty, zero, or negative dimensions, with sensible min/max values and inline errors. Warn if the code does not fit inside the artboard.
- **Placing the Code on the Artboard**:
  - 9-position alignment grid: `top-left`, `top-center`, `top-right`, `middle-left`, `center`, `middle-right`, `bottom-left`, `bottom-center`, `bottom-right` (default `center`).
  - Padding/margin input.
  - Fit options: `Original size`, `Fit to artboard` (scale to largest size that fits inside padding while keeping aspect ratio), and `Fill width`.
  - Fine position: X and Y offset inputs, plus interactive drag-and-drop inside the preview (mouse and touch) kept inside artboard bounds. "Reset position" button.
  - Barcode scannability warning if scaling makes bars thinner than minimum scannable threshold (< 1px).
- **Artboard Preview**:
  - Artboard displayed with realistic drop shadow on a neutral gray workspace, scaled to fit the preview panel without overflowing.
  - Zoom controls toolbar: `Fit`, `50%`, `100%`, `200%`, `+` and `-` buttons, and zoom percentage indicator.
  - Size indicator under preview: e.g. `Artboard: 100 x 50 mm (1181 x 591 px at 300 DPI)`.
  - Preview panel stays fixed on desktop while controls scroll independently; sticky on mobile.
- **Code Sizing & Options**:
  - Barcode: Width and height inputs, format (CODE128, EAN13, EAN8, UPC, CODE39, ITF14), line color, background color, show text toggle, font size.
  - QR Code: Single size input (square), error correction (L/M/Q/H), dot style, corner style, foreground and background colors, optional center logo upload.
- **Export & Save**:
  - Export DPI selector: 72, 150, 300, 600 (default 300).
  - PNG and SVG downloads export the whole artboard at chosen DPI/physical units.
  - Checkbox: "Export code only (without artboard)" for legacy behavior.
  - Save artboard settings in `codes.settings`: preset, width, height, unit, orientation, background, border, radius, alignment, padding, fit mode, x/y offset, export_code_only.
  - Reopening `/designer/:id` restores full artboard and code state. Legacy saved codes default to `Auto` preset.
  - Preview saved to Gallery is the artboard; Gallery cards use `object-contain` so various aspect ratios render cleanly without distortion.
- Optional label text under the code (product name, price, or custom label).
- Validation: show a clear inline error if the value is invalid for the chosen format, or if size is non-positive or too small to scan.
- **Automatic Number Generator**:
  - When the selected format requires valid structured digits (EAN13, EAN8, UPC) and the value is empty or invalid, show a "Generate valid number" action.
  - If 12 digits are entered for EAN13, offer a 1-click action to auto-calculate and append the correct GS1 check digit.
- Buttons: **Save to Gallery**, **Download PNG**, **Download SVG**, **Reset**.
- After save, show toast and redirect to Gallery.

### 2.3 Stock Management (`/stock`)
- Table of products with search, sort, pagination (10 per page).
- Columns: Image (optional), Name, SKU, Barcode Number, Category, Price, Quantity, Status (In stock / Low / Out), Actions.
- Actions: Edit, Delete (moves to Recycle Bin with Undo toast), **Generate Code** (opens Designer with the product pre-selected).
- Add/Edit product in a slide-over drawer or modal form.
  - Includes a "Generate" button with a Wand icon next to the Barcode Number field, plus a format selector (`CODE128`, `EAN13`, `EAN8`, `UPC`), auto-filling a valid unique number with correct check digit.
  - Option to auto-generate barcode number on product creation if left blank.
- **Row Selection & Bulk Actions**:
  - Row checkboxes, "Select all on this page" in table header, and live selected count in toolbar (`3 selected`) with a "Clear selection" link.
  - When the current page is fully selected, offer a "Select all {N} products across all pages" link.
  - Selection persists across page changes and searches until cleared or an action succeeds.
  - "Generate missing barcodes" applies to selected products (or all with empty barcodes if none selected).
- **CSV Export & Import**:
  - Header actions: Compact "Import" (`Upload` icon) and "Export" (`Download` icon) buttons next to "Add Product".
  - **Export (`POST /api/products/export`)**: Exports only the selected products. Disabled when 0 products are selected (with tooltip: "Select products to export"). Button displays count, e.g. `Export (3)`. Payload accepts `{ ids: [...], all_matching: boolean, search, category, status }`. Validates IDs and excludes trashed products. Output CSV has UTF-8 BOM, standard columns (`name, sku, barcode_number, category, price, quantity, low_stock_threshold, description`), and date-based filename (e.g. `stock-selected-3-YYYY-MM-DD.csv`). Shows success toast upon completion.
  - **Sample Template (`GET /api/products/import/template`)**: Downloads `products_import_template.csv` with standard headers and 2 example rows.
  - **Import 3-Step Modal**:
    - Built as a structured 3-part flex column: fixed header (shrink-0), scrollable body (flex-1 min-h-0 overflow-y-auto), and fixed bottom footer (shrink-0, border-t, bg-white) so buttons (Back, Cancel, Import) are never cut off.
    - Centered vertically within window at every size with `max-h-[calc(100vh-2rem)]` (or `100dvh`), full-screen on mobile (`390px`).
    - Compact summary counters and options box to maximize preview visibility on 1366x768 and 1920x1080.
    - Zero horizontal scrolling; capped table height (~40vh) with internal vertical scroll, truncated error messages with title tooltips.
    - Step 1: Drag-and-drop CSV upload, 5 MB limit, sample template download.
    - Step 2: Validation preview with color-coded badges (`New`, `Update`, `Error`), mode toggle ("Skip existing" / "Update existing"), and auto-generate missing barcodes toggle. Import button disabled if 0 valid rows.
    - Step 3: Result summary card and auto-refresh of inventory, summary cards, and caches.
- Low stock rule: quantity <= `low_stock_threshold` (default 10) shows an amber badge; 0 shows a red badge.
- Summary cards on top: Total products, Low stock, Out of stock.
- Header includes "Recycle Bin" button with count badge (opens `/bin?tab=products`).

### 2.4 Print Labels (`/print`)
- Layout: Two panes on desktop — controls and settings on the left (scrolls independently), live paper sheet preview on the right (fixed, does not scroll with settings). Stacked on mobile/tablet with the paper preview sticky at the top. Zero horizontal scrollbar at all window sizes.
- **Choose what to print**:
  - Multi-select list of saved designs from Gallery with live search, preview thumbnails, and format/type filter (All / Barcode / QR). Excludes trashed codes.
  - Copies per code selector (default 1) with "Set all to N" batch shortcut.
  - "Add all codes for selected products" quick action; pre-selection via URL query (`/print?code_ids=1,2,3` or `/print?product_ids=4,5`).
- **Sheet settings**:
  - Paper size: A4 (210 x 297 mm) or Letter (215.9 x 279.4 mm), with Portrait / Landscape orientation toggle.
  - Standard label sheet presets (columns x rows, label size in mm):
    - `3x8` (63.5 x 33.9 mm)
    - `2x7` (99.1 x 38.1 mm)
    - `4x12` (48.5 x 25.4 mm)
    - `5x13` (38.1 x 21.2 mm)
    - `Custom`
  - "Match my design size" auto-grid: when all selected designs share identical artboard dimensions, automatically calculates fitting columns and rows for the selected paper size, margins, and gaps.
  - Custom dimension inputs in chosen unit (`mm`, `cm`, `inch`): label width/height, columns, rows, top/left margin, horizontal/vertical gap, and corner radius.
  - Start position: Select which cell on the sheet to start printing from (skips used slots on partly used sheets).
- **Placement & Fitting inside Label Cell**:
  - Fit modes: `Original size`, `Fit to label` (scales down preserving aspect ratio), `Fill label`.
  - Alignment (top-left, center, etc.) and cell padding.
  - Option to toggle artboard background color and border on/off during print.
  - Warning indicators if a design exceeds cell bounds or if downscaling reduces barcode readability below scan thresholds.
- **Live Preview & Controls**:
  - Accurate scaled representation of paper sheets with individual label boundaries and cutting outlines.
  - Toggle: "Show label borders".
  - Zoom controls: `Fit`, `50%`, `100%`.
  - Multi-page pagination navigation when total labels exceed one sheet (e.g. "48 labels, 2 pages").
- **Output & Presets**:
  - **Browser Print**: Print button using `@media print` with exact `@page` paper size and 0 margins, hiding sidebar and controls. Note: "In the print dialog, set Scale to 100% (turn off 'Fit to page') and Margins to None."
  - **Download PDF**: Vectorized PDF generation using `jspdf` at 300 DPI with precise mm coordinates and dimensions matching the sheet layout.
  - **Presets**: Save and manage custom sheet configurations in `print_presets` table (`GET /api/print-presets`, `POST /api/print-presets`, `DELETE /api/print-presets/{id}`).
- **Shortcuts & Integration**:
  - Gallery cards feature a "Print" button opening `/print?code_ids={id}`.
  - Stock page bulk toolbar features "Print labels" for selected products (`/print?product_ids={ids}`).
- **Empty & Error States**:
  - Friendly alerts for empty selection, sheet overflow, or invalid custom dimensions exceeding paper limits.

### 2.5 Recycle Bin (`/bin`)
- Unified Recycle Bin with two tabs: **Products** (`?tab=products`) and **Designs** (`?tab=designs`), each with a live count badge.
- Old `/stock/bin` redirects to `/bin?tab=products`.
- Sidebar navigation includes a "Recycle Bin" item with total trashed count badge (`products + codes`).
- Stock and Gallery headers both include a "Recycle Bin" button (`Trash2` icon, count badge) opening `/bin` on their respective tab.
- **Products tab**: Name, SKU, Category, Price, Quantity, Deleted date, "days left" (30-day retention). Row actions: Restore, Delete permanently (with confirmation modal). Top actions: Restore all, Empty bin.
- **Designs tab**: Preview thumbnail, Name, Type badge (Barcode / QR), Format, Deleted date, "days left" (30-day retention). Row actions: Restore, Delete permanently (with confirmation modal that it cannot be undone). Top actions: Restore all, Empty bin (scoped to active tab).
- Empty states with friendly illustrations & loading skeletons for each tab.
- Permanent delete clears preview images from storage. Auto-purge command permanently deletes items older than 30 days.

## 3. Database Schema

**products**
| column | type | notes |
|---|---|---|
| id | bigint PK | |
| name | string | required |
| sku | string | unique, required |
| barcode_number | string | nullable, unique |
| category | string | nullable |
| price | decimal(10,2) | default 0 |
| quantity | integer | default 0 |
| low_stock_threshold | integer | default 10 |
| description | text | nullable |
| timestamps | | |
| deleted_at | timestamp nullable | soft deletes |

**codes**
| column | type | notes |
|---|---|---|
| id | bigint PK | |
| product_id | FK nullable | `nullOnDelete` |
| name | string | required |
| type | enum(`barcode`,`qr`) | |
| format | string | e.g. CODE128, QR |
| value | text | encoded content |
| settings | json | design options (colors, styles, unit, width, height, dpi, lock_aspect_ratio, artboard: preset, width, height, unit, orientation, background, border, radius, alignment, padding, fit, x_offset, y_offset, export_code_only) |
| preview_path | string nullable | saved PNG in `storage/app/public/previews` |
| timestamps | | |
| deleted_at | timestamp nullable | soft deletes |

**barcode_sequences**
| column | type | notes |
|---|---|---|
| id | bigint PK | |
| format | string | unique (EAN13, EAN8, UPC, CODE128) |
| last_number | bigint unsigned | sequence counter |
| timestamps | | |

**print_presets**
| column | type | notes |
|---|---|---|
| id | bigint PK | |
| name | string | required, e.g. "Avery 3x8" |
| paper_size | string | `a4`, `letter` |
| orientation | enum(`portrait`,`landscape`) | default `portrait` |
| columns | integer | number of columns |
| rows | integer | number of rows |
| label_width | decimal(8,2) | width in mm |
| label_height | decimal(8,2) | height in mm |
| margin_top | decimal(8,2) | top margin in mm |
| margin_left | decimal(8,2) | left margin in mm |
| gap_horizontal | decimal(8,2) | horizontal gap between labels in mm |
| gap_vertical | decimal(8,2) | vertical gap between labels in mm |
| corner_radius | decimal(8,2) | corner radius in mm (default 0) |
| unit | string | preferred display unit (`mm`, `cm`, `inch`) |
| settings | json nullable | additional placement/fit defaults |
| timestamps | | |

## 4. API Endpoints (prefix `/api`)

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/bin/summary` | recycle bin counts: `{ products, codes, total }` |
| GET | `/codes` | list active codes (query: `search`, `type`) |
| POST | `/codes` | create (multipart: fields + `preview` image) |
| GET | `/codes/{id}` | show |
| PUT | `/codes/{id}` | update |
| DELETE | `/codes/{id}` | soft delete (move to recycle bin) |
| GET | `/codes/trash` | list trashed codes (query: `search`, `type`, `page`) |
| POST | `/codes/{id}/restore` | restore single trashed code |
| DELETE | `/codes/{id}/force` | permanently delete single code & unlink preview |
| POST | `/codes/trash/restore-all` | restore all trashed codes |
| DELETE | `/codes/trash/empty` | permanently delete all trashed codes & preview files |
| GET | `/products` | list active products (query: `search`, `sort`, `page`) |
| GET | `/products/summary` | totals (total, low, out, trash) excluding trashed |
| GET | `/products/lookup?q=` | autocomplete (max 10) excluding trashed |
| GET | `/products/trash` | list trashed products (query: `search`, `sort`, `page`) |
| POST | `/products` | create |
| PUT | `/products/{id}` | update |
| DELETE | `/products/{id}` | soft delete (move to recycle bin) |
| POST | `/products/{id}/restore` | restore single trashed product |
| DELETE | `/products/{id}/force` | permanently delete single product |
| POST | `/products/trash/restore-all` | restore all trashed products |
| DELETE | `/products/trash/empty` | permanently delete all trashed products |
| POST | `/products/bulk-generate-barcodes` | bulk auto-generate barcodes for products with empty numbers |
| POST | `/products/export` | export selected products as CSV with UTF-8 BOM (`{ ids: [], all_matching: boolean, search, category, status }`) |
| GET | `/products/import/template` | download sample CSV template with standard headers & example rows |
| POST | `/products/import/preview` | parse and validate CSV file (checks duplicates, trashed items, formats) |
| POST | `/products/import/commit` | commit import `{ mode: skip_existing|update_existing, auto_generate_barcodes }` |
| POST | `/barcodes/generate` | generate unique valid barcode number `{ format }` |
| POST | `/barcodes/validate` | validate format and check digit `{ format, number }` |
| GET | `/print-presets` | list saved sheet print presets |
| POST | `/print-presets` | save new sheet print preset |
| DELETE | `/print-presets/{id}` | delete saved sheet print preset |

Backend rules: use Form Requests for validation, API Resources for responses, consistent JSON errors, run `php artisan storage:link`. React calls the API at the relative path `/api` (same origin, no CORS needed).

## 5. UI / UX Design System

**Principles:** simple, clean, lots of whitespace, one primary action per screen, instant feedback.

**Colors (Tailwind config extend)**
| role | hex |
|---|---|
| Primary | `#4F46E5` (indigo-600) |
| Primary hover | `#4338CA` |
| Accent | `#14B8A6` (teal) |
| Background | `#F8FAFC` |
| Surface (cards) | `#FFFFFF` |
| Border | `#E2E8F0` |
| Text | `#0F172A` / muted `#64748B` |
| Success | `#22C55E` |
| Warning | `#F59E0B` |
| Danger | `#EF4444` |

**Typography:** Inter (Google Fonts). Headings semibold, body regular.
**Shape:** cards `rounded-2xl`, inputs/buttons `rounded-xl`, soft shadows (`shadow-sm`), 150ms transitions.
**Icons (lucide-react):** `LayoutGrid` (Gallery), `PenTool` (Designer), `Package` (Stock), `Printer` (Print Labels), `QrCode`, `Barcode`, `Download`, `Trash2`, `Pencil`, `Plus`, `Search`, `AlertTriangle`.
**Layout:** left sidebar (collapses to bottom/hamburger on mobile) with the 4 nav items + app logo. Active item highlighted in primary color.
**States required everywhere:** loading skeletons, empty states, error toasts, success toasts, disabled buttons while saving.
**Responsive:** mobile-first; designer stacks controls above preview on small screens.
**Accessibility:** labels on all inputs, visible focus rings, sufficient contrast.

## 6. Frontend Folder Structure (inside `resources/js/`)
```
resources/js/
├── api/            # axios instance + endpoint helpers
├── components/     # Sidebar, Button, Modal, Drawer, Badge, EmptyState, Skeleton
├── features/
│   ├── gallery/    # CodeCard, CodeGrid, Filters
│   ├── designer/   # BarcodeControls, QrControls, PreviewPanel, ProductPicker
│   └── stock/      # ProductTable, ProductForm, SummaryCards
├── pages/          # GalleryPage, DesignerPage, StockPage
├── hooks/
├── utils/          # validators, download helpers
├── App.jsx         # routes
└── app.jsx         # entry point (createRoot, QueryClientProvider, BrowserRouter)
```

## 7. Definition of Done
- [ ] App opens on Gallery and shows saved codes or the empty state
- [ ] Barcode and QR can be designed with live preview and saved
- [ ] Product picked from stock auto-fills the designer
- [ ] Stock CRUD works with search, sort, pagination, status badges
- [ ] PNG (and SVG for barcodes) download works
- [ ] Format validation errors are clear
- [ ] Responsive on mobile and desktop
- [ ] README with setup steps (single-project run instructions); seeders create ~15 sample products

## 8. Working Rules for the Agent
1. Build in small steps; run and verify after each step.
2. Do not add features outside this document without asking.
3. Keep code clean and commented only where needed.
4. After each phase, summarize what was done and what is next.
5. Never commit `.env` or secrets.
