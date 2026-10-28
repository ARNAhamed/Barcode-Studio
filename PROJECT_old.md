# Barcode Designer ΓÇö Project Context for the Antigravity Agent

> Read this file fully before writing any code. Follow it as the source of truth. If something is unclear, make the simplest reasonable choice and note it in `docs/DECISIONS.md`.

## 0. Existing Setup (IMPORTANT ΓÇö read first)

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

**Structure (single directory ΓÇö do NOT create separate backend/frontend folders)**
```
barcode-designer/
Γö£ΓöÇΓöÇ app/                 # Laravel models, controllers, requests, resources
Γö£ΓöÇΓöÇ database/            # migrations, seeders
Γö£ΓöÇΓöÇ routes/
Γöé   Γö£ΓöÇΓöÇ api.php          # /api/* endpoints
Γöé   ΓööΓöÇΓöÇ web.php          # catch-all -> app.blade.php (React SPA)
Γö£ΓöÇΓöÇ resources/
Γöé   Γö£ΓöÇΓöÇ views/app.blade.php
Γöé   Γö£ΓöÇΓöÇ css/app.css      # Tailwind
Γöé   ΓööΓöÇΓöÇ js/              # React app (see section 6)
Γö£ΓöÇΓöÇ vite.config.js
Γö£ΓöÇΓöÇ package.json
Γö£ΓöÇΓöÇ composer.json
ΓööΓöÇΓöÇ PROJECT.md
```

**Run locally:** `php artisan serve` + `npm run dev` (two terminals), open http://localhost:8000. Same origin, so no CORS setup is needed.

## 2. Pages (4)

### 2.1 Gallery (`/`) ΓÇö start page
- Default route when the app opens.
- Shows saved codes as a responsive card grid (1 / 2 / 3 / 4 columns).
- Card: preview image, name, type badge (Barcode / QR), format, created date, actions (Edit, Download PNG, Delete). Shows a small "Template: <name>" line if created from a template, and a subtle batch label for codes generated in bulk.
- Top bar: search box, filter chips (All / Barcode / QR / Last bulk run), "Recycle Bin" button (with count badge, opens `/bin?tab=designs`), "Create New" button.
- Empty state: friendly illustration/icon + text "No codes yet" + button "Design your first code".
- Delete asks for confirmation ("Move to Recycle Bin") and shows a toast with an Undo action after deleting.

### 2.2 Designer (`/designer` and `/designer/:id`)
Two-pane layout: **live preview (left, ~65-70% width, fixed in place)** and **editor controls (right, ~30-35% width, clamped min 340px to max 440px, scrolls independently)**.
At 1024px and above, the page body and main content area do NOT scroll: height is strictly tied to the visible window (`height: calc(100dvh - <top header height>)` with `overflow: hidden`).
The left pane is a flex column: header bar (`shrink-0`), canvas (`flex-1 min-h-0 overflow-hidden`, centered content), and footer (`shrink-0`).
The right pane (editor) has its own `overflow-y-auto` with a thin scrollbar and `overscroll-behavior: contain`, so scrolling the editor never scrolls the page or preview, and scrolling over the preview never scrolls the editor.
Below 1024px, panes stack with the preview sticky at top (compact, max 40vh) and the editor underneath.

- **Preview Pane (Left)**: Built as a 3-part flex column:
  - **Header Bar (shrink-0)**: Left: "Live Preview" on one line (`whitespace-nowrap`) with format badge (e.g. `CODE128`). Right: compact zoom controls (Fit, 50%, 100%, 200%, `-`, `+`, and real zoom % label). Flex-wrap with `gap-2` so nothing is clipped on narrow panels.
### 2.2 Barcode & QR Designer (`/designer` and `/designer/:id`)
- **Philosophy**: Simple by default, advanced on request. A new user should be able to create and save a code in under 30 seconds without reading instructions.
- **Two-Pane Layout**:
  - **Left Pane (~65-70% width)**: Real-time interactive artboard preview, fixed in place, with floating zoom controls, size chip, and clean action footer.
  - **Right Pane (~30-35% width, clamped 340ΓÇô440px)**: Independent vertical scrolling (`overscroll-behavior: contain`), displaying concise essential controls by default.
- **Editor Structure (Right Pane)**:
  - **Top Row**: Mode switch (**Barcode | QR Code**), followed by a single row containing a **Template** dropdown and a **Product** picker.
  - **"Design" Group (Always Visible, Everyday Controls)**:
    - **Value**: Text input. When a product is picked, auto-fills the product value or product page URL in QR mode (with a compact "Link to product page" switch beside it).
    - **Format**: (Barcode mode only) Compact format selector (`CODE128`, `EAN13`, `EAN8`, `UPC`, `CODE39`, `ITF14`).
    - **Label Text**: Single-line input or compact textarea with a small **Insert** button that opens a scrollable, viewport-aware popover menu.
      - **Insert Menu**: Header note *"Fills in automatically from the selected product"*. Each placeholder shows live sample values (e.g., `Name  Wireless Headphones`). Grouped into Product and Supplier sections, with a `Supplier & Mobile` preset button at the bottom. Inserts at cursor position.
      - **Product Auto-Fill & Live Preview**: When a product is picked, auto-fills the label pattern (template's pattern, last used pattern, or default `{name} ΓÇó {price}`) if the field is empty, keeping any previously typed pattern intact. The preview canvas and subtle *"Preview:"* line under the field resolve the pattern against the selected product live (falling back to muted raw/sample placeholders when unlinked). Saves pattern with templates and resolved text with codes.
      - **Quick Size & Gap Row**: Directly below label text, compact row with **Size** (pt with `-` and `+` buttons, keyboard arrow navigation, Shift+arrow step 10) and **Gap** (selected unit with `-` and `+` buttons, step 1px equivalent, min 0). Kept in live two-way sync with Advanced > Text style.
    - **Size (Controls Code Dimensions)**:
      - **Unit Switch**: Small segmented control (`mm`, `cm`, `inch`, `px`) positioned at the top right of the "Size" title row. Globally controls all length fields in the Designer (code dimensions, artboard dimensions, gap, and offsets).
      - **Code Size Chips**: Sets the physical dimension of the barcode or QR code itself:
        - Barcode presets: `Small` (30 ├ù 10 mm), `Medium` (45 ├ù 15 mm), `Large` (60 ├ù 20 mm).
        - QR presets: `Small` (15 mm), `Medium` (25 mm), `Large` (40 mm).
        - `Auto`: Fits largest code size inside fixed artboard with padding, or defaults to Medium when artboard is "Fit to code".
        - `Custom`: Displays code Width & Height (single Size field for QR) with number inputs, `-`/`+` buttons, aspect ratio lock (barcode), and live validation. Editing any dimension switches chip to `Custom`.
    - **Artboard (Integrated Row within Size Block)**:
      - Compact select dropdown directly below code sizing: `Fit to code` (default, artboard tightly wraps code + label + margin), `Small label (50 ├ù 25 mm)`, `Shelf label (60 ├ù 40 mm)`, `Product label (100 ├ù 50 mm)`, `Shipping label (100 ├ù 150 mm)`, `Square (50 ├ù 50 mm)`, `A6`, `A5`, `A4`, `Business card (90 ├ù 55 mm)`, and `Custom`.
      - Selecting a preset displays dimensions and orientation swap button. Selecting `Custom` displays Width and Height inputs with swap button.
      - Warning banner appears if code + label exceed artboard with quick "Shrink code to fit" or "Enlarge artboard" actions.
    - **Colors**: Two small color swatches (Code color and Background) with compact pickers and a **Swap** icon button.
  - **"Advanced" Accordion (Collapsed by Default, Remembers Open/Closed State)**:
    - Vertical accordion list of full-width rows with only ONE group open at a time:
      1. **Artboard Style**: Card border (toggle, color, width), corner radius, and background color palette (size & presets moved to main Size block).
      2. **Placement**: 3x3 alignment grid, padding, fit mode (`original`, `fit`, `fill-width`), fine X/Y offsets, reset position.
      3. **Code Style**: Margin, show-number toggle; QR error correction (L/M/Q/H), dot style, corner style, and logo upload.
      4. **Text Style**: Font size (with `-`/`+` buttons and unit toggle), gap (with `-`/`+` buttons), font weight (`Regular` / `Bold`), text alignment (`Left`, `Center`, `Right`).
      5. **Export**: Export DPI (`72`, `150`, `300`, `600`), lock aspect ratio, "Export code only" checkbox.
    - **"Reset advanced settings"** link to restore default styling options.
    - Bottom padding on editor pane so all controls and links remain fully visible and reachable inside the window without clipping.
- **Canvas & Preview Enhancements**:
  - **Direct Canvas Interactions**:
    - Click label text directly in the preview to edit or focus the field.
    - Click & drag code to position it on artboard; double-click code to reset position.
    - Thin selection outline on hover.
  - **Floating Indicators**:
    - Artboard size chip on the canvas (e.g. "60 x 40 mm").
    - **Full-featured Floating Zoom Control**: `-` and `+` buttons with fixed steps (`25%`, `50%`, `75%`, `100%`, `150%`, `200%`, `300%`, `400%`), clickable percentage dropdown, and `Fit` button with auto re-fit on pane/window resize. Supports `Ctrl` + mouse wheel zoom, touchscreen pinch zoom, and keyboard shortcuts (`+`, `-`, `0` for Fit). Canvas drag-to-pan when zoomed in beyond viewport with no page scroll. Zoom is purely display-only.
    - Friendly sample code preview with a gentle hint when fields are empty: "Pick a template or a product to begin".
  - **Single Status Line**:
    - Replaces scattered warnings with one concise line under the preview: green dot + "Ready to scan" when valid, or a single amber message with an auto-action "Fix" button when an automated remedy exists.
- **Clean Action Footer**:
  - Primary **Save** button with subtle status text ("Saved" / "Unsaved changes").
  - **Download** button with a compact popover menu: **PNG** and **SVG** with embedded DPI selector (defaults to 300).
  - More actions (**...**) menu: Reset, Duplicate as new, and Export code only toggle. All footer buttons fully fit without clipping.
- **Smart Defaults & Persistent Memory**:
  - New designs default unit to `mm` and start with the default template (or Medium 60x40 mm). Existing saved designs preserve their saved parameters.
  - Remembers last used template, colors, and Advanced accordion state in `localStorage`.
  - Hides units and raw pixels in default view unless Custom or Advanced is opened.
- **Full Backward Compatibility**:
  - Preserves all saved code data formats, template schemas, multi-line label rendering, supplier placeholders, product links, and print label compatibility.

### 2.3 Products (`/products`)
- **Navigation & Routing**:
  - Sidebar: "Products" is an expandable group with two sub-items: **Items** (`/products/items`) and **Suppliers** (`/products/suppliers`). Expanded automatically when any products route is active, with sensible compact behavior on narrow sidebars, and sub-navigation on mobile.
  - Route `/products` redirects to `/products/items`.
  - Legacy redirects: old `/stock` and `/stock/*` redirect to `/products/items` and `/bin?tab=products` so previous bookmarks keep working seamlessly.
  - **Shared Tab Switcher**: Small tab switcher (`Items` | `Suppliers`) rendered directly under the page header on both pages so they feel like one cohesive section.

#### 2.3.1 Items (`/products/items`)
- Current products inventory page (formerly Stock Management). One-line description: "Manage items and suppliers."
- **Row & Table Density**: Compact rows (40-44px height, `py-1.5` to `py-2` on cells), text 14px, secondary text 11-12px, table header 36-40px (`h-9` or `h-9.5`), 1px dividers, subtle hover. Checkbox, text, and action icon buttons centered vertically. Zero horizontal scrollbar at all screen sizes.
- **Table Structure & Columns (`table-fixed`)**:
  - `table-fixed` layout with explicit column widths. Product column minimum 220px, largest share (28-30%).
  - **Sort by Name**: Product header sorts by Product Name cleanly without distracting subheadings.
  - **Remaining Columns**:
    - Checkbox: `36px` (`w-[36px] min-w-[36px]`)
    - Product: `min-w-[220px]` (28-30% share)
    - Barcode: `120px` (`w-[120px]`)
    - Category: `110px` (`w-[110px]`, truncated with tooltip)
    - Supplier: `130px` (`w-[130px]`, truncated with tooltip)
    - Price: `88px` (`w-[88px] min-w-[88px]`)
    - Qty: `56px` (`w-[56px] min-w-[56px]`)
    - Status: `100px` (`w-[100px] min-w-[100px]`)
    - Actions: `108px` (`w-[108px] min-w-[108px]`)
  - **Responsive Priority**:
    - When width is tight, columns hide in this order: Category first (`hidden xl:table-cell`), then Supplier second (`hidden lg:table-cell`), then Barcode third (`hidden lg:table-cell`). Product, Price, Qty, Status, and Actions ALWAYS stay visible.
    - Below 768px: Stacked cards view where the Product Name is the title.
- Actions: Edit, Delete (moves to Recycle Bin with Undo toast), **Generate Code** (opens Designer with product pre-selected).
- **Supplier Filter**: Filter dropdown placed next to search box (All suppliers, each supplier, No supplier). Search placeholder: "Search by name, item code, barcode...".
- **Add / Edit Product Modal**:
  - Centered modal fitting window (`max-h-[calc(100dvh-2rem)]`, width ~560-640px `max-w-xl`, full-screen on mobile, 16-20px padding).
  - Fixed header (title + close icon), scrollable body, fixed footer with Cancel (secondary) and Save (primary). Touch targets >= 36px.
  - Clean two-column grid on desktop: Name full width, Item Code and Barcode with "Generate" Wand button side by side, **Supplier** searchable dropdown (with "+ New supplier" shortcut) and Category side by side, Price and Quantity side by side, Low stock threshold, Description full width. One column on mobile.
  - Inline validation messages ("Item Code is required."), autofocus first field, close on Escape, confirm before closing if unsaved changes.
- **Header Actions on ONE Row**:
  - Order: **Import** (secondary), **Export** (secondary), **Generate codes** (secondary, active when items selected), **Add Product** (primary, last). "Public Page" button and modal settings removed.
  - Placed on one row, right-aligned, `gap-2`, 36px height (`h-9`), `whitespace-nowrap`, never wrapping.
  - Below 768px: Import and Export display as icon-only buttons with tooltips while Add Product keeps its label.
- **Row Selection & Bulk Actions**:
  - Row checkboxes, "Select all on this page" in table header, and live selected count in toolbar (`3 selected`) with a "Clear selection" link.
  - When the current page is fully selected, offer a "Select all {N} products across all pages" link.
  - Selection persists across page changes and searches until cleared or an action succeeds.
  - "Generate missing barcodes" applies to selected products (or all with empty barcodes if none selected).
  - **Generate Codes (Bulk Generation)**:
    - Button in the selection toolbar next to Export: "Generate codes". Disabled when nothing is selected.
    - Limits single run to 500 products (with clear alert message if > 500 selected).
    - Opens **Bulk Generate Modal** (3 steps, fits window `max-h-[calc(100dvh-2rem)]`, fixed header, scrollable body, fixed footer, responsive, full screen on mobile, 16-20px padding):
      - Step 1: Settings (template selection, value source including Item Code, label text pattern override, missing barcode resolution, invalid format auto-fix, existing code resolution, naming pattern).
      - Step 2: Preview (compact table, live thumbnails of first 3 items, summary counters, filter for problems only, generate disabled if 0 ready items).
      - Step 3: Generate (in-browser rendering matching Designer, batch upload to `POST /codes/bulk`, progress bar, cancel, retry failed, results screen with View in Gallery, Print labels, and Close).
- **CSV Export & Import**:
  - **Export (`POST /api/products/export`)**: Exports only selected products (or all matching). Disabled when 0 selected. Output CSV has UTF-8 BOM, standard headers (`name, item_code, barcode_number, category, supplier, price, quantity, low_stock_threshold, description`), and date-based filename (e.g. `products-selected-3-YYYY-MM-DD.csv`). Shows success toast upon completion.
  - **Sample Template (`GET /api/products/import/template`)**: Downloads `products_import_template.csv` with standard headers using `item_code` and example rows.
  - **Import 3-Step Modal**:
    - Accepts both new `item_code` header and legacy `sku` header.
    - Matches supplier name to existing suppliers (case-insensitive); flags unknown supplier names as a warning; includes toggle "Create missing suppliers".
    - Structured 3-part flex column: fixed header, scrollable body, fixed bottom footer.
    - Validation preview with color-coded badges (`New`, `Update`, `Error`), mode toggle ("Skip existing" / "Update existing"), and auto-generate missing barcodes toggle.
- Low stock rule: quantity <= `low_stock_threshold` (default 10) shows amber badge; 0 shows red badge.
- Summary cards on top: Total products, Low stock, Out of stock (compact padding 12-14px, 12px gap, one short helper line).
- Header includes "Recycle Bin" button with count badge (opens `/bin?tab=products`).

#### 2.3.2 Suppliers (`/products/suppliers`)
- Dedicated Suppliers management page matching Items visual style and layout.
- **Page Header**: Title "Suppliers", one-line description, and actions: "Export" (for selected suppliers), "Add Supplier" (primary).
- **Summary Cards**: Total Suppliers, Active Suppliers, Products without a Supplier (compact padding 12-14px, 12px gap).
- **Compact Table**:
  - Search input, status filter (All, Active, Inactive), sorting, pagination, row selection.
  - Columns: Name (with contact person under it), Mobile, Email, City, Products (count badge linking to `/products/items?supplier_id={id}`), Status (Active / Inactive dot + text), Actions.
  - Responsive column visibility: Hide Email and City below 1280px; keep only Name, Mobile, Products, and Actions below 1024px; stacked cards below 768px. Zero horizontal scroll.
- **Add / Edit Supplier Modal**:
  - Centered modal fitting window (`max-h-[calc(100dvh-2rem)]`, `max-w-xl`, full-screen on mobile, 16-20px padding).
  - Two-column grid on desktop, one column on mobile. Fixed header, scrollable body, fixed footer. Touch targets >= 36px.
  - Fields: Supplier name (required, unique), Contact person, Mobile number (required, Sri Lankan formats accepted, e.g. `0771234567` or `+94771234567`), Phone number, Email, Address line 1, Address line 2, City, Postal code, Country (default "Sri Lanka"), Website, Payment terms (e.g. "30 days"), Notes, Status (`Active` / `Inactive`, default `Active`).
  - Inline validation, Escape to close, unsaved changes confirmation.
- **View Supplier Drawer / Modal**:
  - Clean card layout with quick contact links: tap-to-call (`tel:`), email (`mailto:`), and map link generated from address.
  - Payment terms, website link, and notes.
  - Compact list of linked products: Product Name with Item Code underneath (table-fixed, Product name wraps up to 2 lines, price, quantity) with link to view each in Items.
- **Delete & Recycle Bin**:
  - Delete soft-deletes supplier to Recycle Bin with undo toast.
  - Products linked to trashed supplier keep link and display "Supplier (deleted)" in muted text.
  - Permanent delete sets `supplier_id` to null on those products.
  - Empty states, loading skeletons, and toasts.

### 2.4 Print Labels (`/print`)
- **Layout**: Swapped two-pane layout on desktop ΓÇö **live paper sheet preview on the LEFT (~65-70% width, fixed in place)** and **settings on the RIGHT (~30-35% width, clamped min 340px to max 440px, scrolls independently)**.
  - At 1024px and above, the page body and main content area do NOT scroll: height is strictly tied to the visible window (`height: calc(100dvh - <top header height>)` with `overflow: hidden`).
  - Three-part preview structure: header bar (`shrink-0`), canvas (`flex-1 min-h-0 overflow-hidden`, paper auto-scaled to fit via ResizeObserver in width and height), and fixed footer with sheet size info and page navigation.
  - Right pane (editor/settings) has independent `overflow-y-auto` with thin scrollbar and `overscroll-behavior: contain`. Scrolling settings never scrolls preview or page.
  - Stacked on mobile/tablet below 1024px with paper preview sticky at the top (compact, max 40vh) and settings underneath.
  - Zero horizontal scrollbar at all window sizes.
- **Choose what to print**:
  - Multi-select list of saved designs from Gallery with live search, preview thumbnails, and format/type filter (All / Barcode / QR). Excludes trashed codes.
  - Copies per code selector (default 1) with "Set all to N" batch shortcut.
  - "Add all codes for selected products" quick action; pre-selection via URL query (`/print?code_ids=1,2,3` or `/print?product_ids=4,5`).
- **Sheet settings**:
  - **Paper size options**:
    - `A4` (210 x 297 mm, default)
    - `Letter` (215.9 x 279.4 mm / 8.5 x 11 in)
    - `A3` (297 x 420 mm)
    - `A5` (148 x 210 mm)
    - `A6` (105 x 148 mm)
    - `Legal` (215.9 x 355.6 mm / 8.5 x 14 in)
    - `4 x 6 inch` (101.6 x 152.4 mm, shipping label roll)
    - `Custom`: Displays manual Width and Height inputs in selected unit (`mm`, `cm`, `inch`) supporting decimals.
  - Orientation toggle (Portrait / Landscape) that swaps width and height.
  - **Validation for Custom Paper**: Minimum 20 mm, maximum 1000 mm (or unit equivalent) on each side; no empty, zero, or negative numbers; inline validation error. Displays final calculated size beneath input, e.g. "Paper: 210 x 297 mm".
  - **Custom Size Integration**:
    - Live preview paper auto-scales to fit canvas in both width and height via ResizeObserver.
    - Grid calculation ("Match my design size" and label-per-page count), margins, and page counts respect the exact custom paper dimensions.
    - Browser print stylesheet sets exact `@page { size: <w>mm <h>mm; margin: 0; }`.
    - PDF export creates pages with exact custom dimensions in mm.
    - Note under Print button when custom paper is used: "Choose the same paper size in the print dialog and set the scale to 100%."
    - Warning alert if grid and margins do not fit on the custom paper size.
    - Saved in `print_presets` table and restored when preset is loaded.
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
- Unified Recycle Bin with three tabs: **Items** (`?tab=products` / `?tab=items`), **Suppliers** (`?tab=suppliers`), and **Designs** (`?tab=designs`), each with a live count badge.
- Old `/stock/bin` redirects to `/bin?tab=products`.
- Sidebar navigation includes a "Recycle Bin" item with total trashed count badge (`products + suppliers + codes`).
- Products, Suppliers, and Gallery headers include a "Recycle Bin" button (`Trash2` icon, count badge) opening `/bin` on their respective tab.
- **Items tab**: Product Name (up to 2 lines) with Item Code under it in muted monospace text, Category, Price, Quantity, Deleted date, "days left" (30-day retention). Table-fixed layout with responsive priority matching Items page. Row actions: Restore, Delete permanently (with confirmation modal). Top actions: Restore all, Empty bin.
- **Suppliers tab**: Name, Contact person, Mobile, City, Deleted date, "days left" (30-day retention). Row actions: Restore, Delete permanently (with confirmation modal). Top actions: Restore all, Empty bin.
- **Designs tab**: Preview thumbnail, Name, Type badge (Barcode / QR), Format, Deleted date, "days left" (30-day retention). Row actions: Restore, Delete permanently (with confirmation modal that it cannot be undone). Top actions: Restore all, Empty bin (scoped to active tab).
- Empty states with friendly illustrations & loading skeletons for each tab.
- ### 2.6 Design Templates
- Concept: A template stores the **DESIGN** of a code (dimensions, unit, DPI, artboard styles, alignment, padding, fit mode, offsets, colors, QR styles, label typography and label text pattern) ΓÇö everything except the encoded value itself.
- New codes can start from a template in one click.
- **Starter Templates** (seeded on install):
  - "Shelf label" (CODE128, 60 x 40 mm)
  - "Small product label" (EAN13, 50 x 25 mm)
  - "Box label" (CODE128, 100 x 50 mm)
  - "Simple QR" (square, 50 x 50 mm)
- **Template Manager Modal**:
  - Fits the window (`max-h-[calc(100dvh-2rem)]`), structured flex column with fixed header, scrollable body, and fixed footer.
  - Search box and type filter chips (`All`, `Barcode`, `QR`).
  - List / grid items display: thumbnail image, name, type badge, dimensions/format, default star indicator, last updated date.
  - Actions per template: Apply (loads design into designer), Rename, Duplicate, Set as default (only one default per type), Delete (with confirmation modal).
- **Non-destructive Deletion**: Soft deleting or permanently deleting a template must never alter or break existing codes created from it.
- **Gallery Integration**: Codes created from a template store `template_id` as a foreign key (`nullOnDelete`) plus the template name in settings, displaying "Template: <name>" on their gallery card.

### 2.7 Public Product Page (`/p/:token`)
- **Concept**: Public mobile-first product page accessible via QR code scan or direct link. Always enabled; always returns complete item and supplier details.
- **Layout & Aesthetic**:
  - Served on route `/p/:token` with a minimal layout: no sidebar or app navigation, only a sleek top header with the app brand.
  - Mobile-first, clean whitespace, large readable typography, zero clutter, no horizontal scroll.
  - Supports light and dark modes according to system/app theme.
  - Open Graph title and description meta tags for rich link previews in messaging apps and browsers.
- **Content Cards**:
  - **Item Card**: Product name as title, category as small muted label, followed by clear label/value rows for Barcode Number, Item Code, Price (formatted consistently), and Availability with a semantic status dot (`In stock`, `Low stock`, `Out of stock`).
  - **Supplier Card**: Supplier name, contact person, mobile (tap-to-call `tel:`), landline, email (tap-to-email `mailto:`), address (tap to open in Google Maps), and payment terms if present.
    - If the product has no supplier assigned: shows a muted "No supplier information".
    - If the supplier is soft-deleted: shows "Supplier unavailable".
- **Security & Privacy**:
  - Rate-limited endpoint (`throttle:60,1`).
  - Never exposes internal database IDs, cost prices, or internal notes.
  - Trashed products return 404.

## 3. Database Schema

**suppliers**
| column | type | notes |
|---|---|---|
| id | bigint PK | |
| name | string | required, unique among non-deleted (case-insensitive), indexed |
| contact_person | string nullable | contact name |
| mobile | string | required, indexed |
| phone | string nullable | landline or secondary phone |
| email | string nullable | valid email format |
| address_line1 | string nullable | street address line 1 |
| address_line2 | string nullable | street address line 2 |
| city | string nullable | city |
| postal_code | string nullable | postal code |
| country | string | default 'Sri Lanka' |
| website | string nullable | URL format |
| payment_terms | string nullable | e.g. "30 days" |
| notes | text nullable | internal notes |
| status | enum(`active`,`inactive`) | default `active` |
| timestamps | | |
| deleted_at | timestamp nullable | soft deletes, indexed |

**products**
| column | type | notes |
|---|---|---|
| id | bigint PK | |
| supplier_id | FK nullable | `nullOnDelete`, indexed |
| public_token | string(32) | unique, indexed, random 12+ chars alphanumeric for public URL `/p/{token}` |
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

**settings**
| column | type | notes |
|---|---|---|
| key | string PK | unique setting key (`public_page_enabled`, `public_page_show_supplier`) |
| value | text nullable | setting value serialized or boolean string |
| timestamps | | |

**codes**
| column | type | notes |
|---|---|---|
| id | bigint PK | |
| product_id | FK nullable | `nullOnDelete` |
| template_id | FK nullable | `nullOnDelete` |
| batch_id | uuid nullable | indexed, bulk run grouping |
| name | string | required |
| type | enum(`barcode`,`qr`) | |
| format | string | e.g. CODE128, QR |
| value | text | encoded content |
| settings | json | design options (colors, styles, unit, width, height, dpi, lock_aspect_ratio, artboard: preset, width, height, unit, orientation, background, border, radius, alignment, padding, fit, x_offset, y_offset, export_code_only; label: text, font_size, font_unit, gap, weight, alignment; template_name) |
| preview_path | string nullable | saved PNG in `storage/app/public/previews` |
| generated_at | timestamp nullable | bulk generation timestamp |
| timestamps | | |
| deleted_at | timestamp nullable | soft deletes |

**templates**
| column | type | notes |
|---|---|---|
| id | bigint PK | |
| name | string | required, unique per type |
| type | enum(`barcode`,`qr`) | required |
| description | text | nullable |
| settings | json | design options (format, unit, width, height, dpi, artboard: preset, width, height, orientation, background, border, radius, alignment, padding, fit, x_offset, y_offset, colors, QR options: dot style, corner style, error correction, logo reference, label text options: font size, gap, weight, alignment, label text pattern; no encoded value) |
| thumbnail_path | string nullable | saved PNG in `storage/app/public/templates` |
| is_default | boolean | default false, max one default per type |
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
| paper_size | string | `a4`, `letter`, `a3`, `a5`, `a6`, `legal`, `4x6`, `custom` |
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
| GET | `/bin/summary` | recycle bin counts: `{ products, codes, suppliers, total }` |
| GET | `/codes` | list active codes (query: `search`, `type`, `filter`, `batch_id`) |
| POST | `/codes` | create (multipart: fields + `preview` image) |
| POST | `/codes/bulk` | bulk create codes (up to 25 items per request, multipart or json payload with previews) |
| GET | `/codes/{id}` | show |
| PUT | `/codes/{id}` | update |
| DELETE | `/codes/{id}` | soft delete (move to recycle bin) |
| GET | `/codes/trash` | list trashed codes (query: `search`, `type`, `page`) |
| POST | `/codes/{id}/restore` | restore single trashed code |
| DELETE | `/codes/{id}/force` | permanently delete single code & unlink preview |
| POST | `/codes/trash/restore-all` | restore all trashed codes |
| DELETE | `/codes/trash/empty` | permanently delete all trashed codes & preview files |
| GET | `/templates` | list active templates (query: `search`, `type`) |
| POST | `/templates` | create template (multipart: fields + `thumbnail` image) |
| GET | `/templates/{id}` | show template |
| PUT | `/templates/{id}` | update template |
| DELETE | `/templates/{id}` | soft delete template |
| POST | `/templates/{id}/duplicate` | duplicate template |
| POST | `/templates/{id}/set-default` | set default template for type |
| GET | `/products` | list active products (query: `search`, `supplier_id`, `no_supplier`, `sort`, `page`) |
| GET | `/products/summary` | totals (total, low, out, trash) excluding trashed |
| GET | `/products/lookup?q=` | autocomplete (max 10) excluding trashed |
| GET | `/products/trash` | list trashed products (query: `search`, `sort`, `page`) |
| POST | `/products` | create product (supports `supplier_id`) |
| PUT | `/products/{id}` | update product (supports `supplier_id`) |
| DELETE | `/products/{id}` | soft delete (move to recycle bin) |
| POST | `/products/{id}/restore` | restore single trashed product |
| DELETE | `/products/{id}/force` | permanently delete single product |
| POST | `/products/trash/restore-all` | restore all trashed products |
| DELETE | `/products/trash/empty` | permanently delete all trashed products |
| POST | `/products/bulk-generate-barcodes` | bulk auto-generate barcodes for products with empty numbers |
| POST | `/products/export` | export selected products as CSV with UTF-8 BOM (`{ ids: [], all_matching: boolean, search, category, status, supplier_id }`) |
| GET | `/products/import/template` | download sample CSV template with standard headers (`supplier` included) & example rows |
| POST | `/products/import/preview` | parse and validate CSV file (checks duplicates, trashed items, formats, supplier matches) |
| POST | `/products/import/commit` | commit import `{ mode: skip_existing|update_existing, auto_generate_barcodes, create_missing_suppliers }` |
| GET | `/suppliers` | list active suppliers (query: `search`, `status`, `sort`, `page`) |
| GET | `/suppliers/summary` | supplier summary counts `{ total, active, no_supplier_products }` |
| GET | `/suppliers/lookup?q=` | active suppliers lookup (max 10) for dropdown |
| GET | `/suppliers/{id}` | show supplier with linked products list |
| POST | `/suppliers` | create supplier |
| PUT | `/suppliers/{id}` | update supplier |
| DELETE | `/suppliers/{id}` | soft delete (move to recycle bin) |
| GET | `/suppliers/trash` | list trashed suppliers (query: `search`, `sort`, `page`) |
| POST | `/suppliers/{id}/restore` | restore single trashed supplier |
| DELETE | `/suppliers/{id}/force` | permanently delete supplier (sets `supplier_id` null on products) |
| POST | `/suppliers/trash/restore-all` | restore all trashed suppliers |
| DELETE | `/suppliers/trash/empty` | permanently delete all trashed suppliers |
| POST | `/suppliers/export` | export selected suppliers as CSV with UTF-8 BOM (`{ ids: [], all_matching: boolean, search, status }`) |
| POST | `/barcodes/generate` | generate unique valid barcode number `{ format }` |
| POST | `/barcodes/validate` | validate format and check digit `{ format, number }` |
| GET | `/print-presets` | list saved sheet print presets |
| POST | `/print-presets` | save new sheet print preset |
| DELETE | `/print-presets/{id}` | delete saved sheet print preset |
| GET | `/public/products/{token}` | public rate-limited view endpoint: always returns sanitized product & supplier details |

Backend rules: use Form Requests for validation, API Resources for responses, consistent JSON errors, run `php artisan storage:link`. React calls the API at the relative path `/api` (same origin, no CORS needed).

## 5. UI / UX Design System

**Aesthetic:** Calm, minimalistic, flat interface. Fewer colors, zero decorations, generous whitespace, clear hierarchy. No gradients, glows, colored shadows, decorative blobs, heavy borders, or unnecessary animations. 150ms transitions on color and background only.

**Spacing System & Tokens:**
- **Page Padding**: 16ΓÇô20px (`p-4 sm:p-5`), at most 24px on large desktop (`lg:p-6`).
- **Page Header**: Bottom margin 12px (`pb-3 mb-3 border-b border-gray-200`).
- **Section Gaps**: 12px gap (`space-y-3` / `gap-3`) between tab switcher, summary cards, toolbar, and table.
- **Summary Cards**: Smaller padding 12ΓÇô14px (`p-3 sm:p-3.5`), 12px gap between cards (`gap-3`), one short helper line.
- **Table Card**: Toolbar padding 10ΓÇô12px (`p-2.5 sm:p-3`), zero extra margin between toolbar and table header, table header height 36ΓÇô40px (`h-9` or `h-9.5`), row height 40ΓÇô44px, pagination padding 8ΓÇô12px (`p-2 sm:p-2.5`).
- **Modals & Drawers**: 16ΓÇô20px padding (`p-4 sm:p-5`), touch targets at least 36px (`h-9`).

**Design Tokens**
| Token | Value | Usage |
|---|---|---|
| Page Background | `#FAFAFA` (`bg-neutral-50` / `var(--color-background)`) | App backdrop |
| Workspace / Canvas | `#F4F4F5` (`bg-zinc-100`) | Preview panels for Designer & Print |
| Surface (Cards, Sheets) | `#FFFFFF` (`bg-white`) | Cards, tables, sheets, modals |
| Border | `#E5E7EB` (`border-gray-200`) | 1px hairline dividers and cards |
| Strong Border | `#D1D5DB` (`border-gray-300`) | Input fields and interactive controls |
| Text Primary | `#111827` (`text-gray-900`) | Headings, body text, data values |
| Text Secondary | `#6B7280` (`text-gray-500`) | Labels, descriptions, secondary metadata |
| Text Disabled / Placeholder | `#9CA3AF` (`text-gray-400`) | Placeholders, inactive hints |
| Accent (Single Color) | `#4F46E5` (hover `#4338CA`) | Primary buttons, active nav, focus rings, links |
| Status: Success | `#16A34A` | Small indicator dot + plain text |
| Status: Warning | `#D97706` | Small indicator dot + plain text |
| Status: Danger | `#DC2626` | Destructive confirm, error text, dot + text |

**Typography:**
- Font: Inter (`var(--font-sans)`).
- Page titles: 20px semibold (`text-xl font-semibold text-gray-900`).
- Section titles: 14px semibold (`text-sm font-semibold text-gray-900`).
- Body text: 14px regular (`text-sm text-gray-700`).
- Small & helper text: 12ΓÇô13px (`text-xs text-gray-500`).
- No all-caps tracking-wide labels, except small table header labels (`text-xs font-medium text-gray-500`).

**Shape & Elevation:**
- Radius: `rounded-lg` (8px) for buttons, inputs, cards, and modals. No pill shapes except small count badges.
- Shadows: None on cards and tables (`shadow-none`). Soft shadow only on modals, drawers, dropdowns, and toasts (`shadow-md` / `shadow-lg`).

**Icons:**
- `lucide-react`, standard size 16px (18px max), stroke width 1.5, neutral gray by default (`text-gray-400` / `text-gray-500`).
- No colored icon tiles, colored boxes, or decorative backgrounds behind icons.

**Component Guidelines:**
1. **Buttons (3 variants only):**
   - **Primary:** solid accent (`bg-indigo-600 hover:bg-indigo-700 text-white`), height 32ΓÇô36px (`h-8` / `h-9`), text 14px, rounded-lg, no shadows.
   - **Secondary:** white with 1px border (`bg-white border border-gray-300 text-gray-700 hover:bg-gray-50`), height 32ΓÇô36px, rounded-lg.
   - **Ghost:** borderless (`text-gray-600 hover:text-gray-900 hover:bg-gray-100`), height 32ΓÇô36px, rounded-lg.
   - **Danger:** secondary button with red text (`border-gray-300 text-red-600 hover:bg-red-50`), solid red (`bg-red-600 text-white`) only in the final confirmation step of destructive actions.
2. **Inputs, Selects, Textareas:**
   - White surface, 1px border (`border-gray-300`), 8px radius (`rounded-lg`), 36px height (`h-9`), accent focus ring (`focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600`).
   - Plain labels above fields, helper and error text under them.
3. **Cards:**
   - White surface, 1px border (`border-gray-200`), no shadow, no colored left borders, no gradients, compact padding (`p-4` or `p-5`).
4. **Tables:**
   - Compact rows (40ΓÇô44px height, `py-1.5` to `py-2` on cells), text 14px, secondary text 11ΓÇô12px, header 36ΓÇô40px without heavy background. 1px row dividers (`divide-y divide-gray-100`), subtle row hover (`hover:bg-gray-50/75`), no zebra striping. Checkbox, text, and action icons (28ΓÇô32px) vertically centered. Tight two-line cells with reduced gap.
   - **Column Alignment**: The Product column and its checkbox are left-aligned (`text-left`). All other columns (Barcode / EAN, Category, Price, Qty, Status, and Actions) have **center-aligned header labels and center-aligned cell contents** (`text-center`). Sort arrows sit beside centered header labels in an inline-flex container (`inline-flex items-center justify-center gap-1`) without shifting the label text off-center.
5. **Badges:**
   - Neutral gray background with dark gray text (`bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded`).
   - Semantic status badges use a small colored dot plus plain text (`text-gray-700`), not filled pills.
6. **Navigation Sidebar:**
   - White surface, 1px right border (`border-gray-200`), width ~224px (`w-56`).
   - Small logo mark + app name (no oversized promo/upgrade tiles).
   - Nav items are 36px high (`h-9`) with 16px icons. Active item: light gray background (`bg-gray-100 text-indigo-600 font-medium`), inactive item: `text-gray-600 hover:text-gray-900 hover:bg-gray-50`.
   - Recycle Bin count is small, plain gray text (`text-xs text-gray-400`), not a red pill.
7. **Page Headers:**
   - Shared flex row across all pages: title (`text-xl font-semibold text-gray-900`) and one-line description (max-width ~640px, text 13-14px gray, truncated or neatly wrapped) on left.
   - Action buttons right-aligned, vertically aligned with title's line.
   - Uniform height, padding, and bottom margin (`mb-3 pb-3`) across all pages. On narrow screens actions wrap neatly under the title, left-aligned.
8. **Summary Cards (Stock):**
   - Plain bordered white cards with small gray label, large number (`text-2xl font-semibold text-gray-900`), and optional muted helper text. Compact padding 12ΓÇô14px (`p-3.5`), 12px gap (`gap-3`). Low stock number amber and out-of-stock red only if > 0.
9. **Gallery Cards:**
   - Code preview centered on neutral light gray background (`bg-zinc-100`), name and metadata below, actions as ghost icon buttons (visible on hover on desktop, always visible on touch).
10. **Workspaces (Designer & Print):**
    - Neutral light gray canvas (`bg-zinc-100`), white artboard/paper sheet with hairline border (`border-gray-200`) and subtle boundary, without heavy drop shadows.
    - Two-pane independent scrolling at 1024px and above: Page body and root container do NOT scroll (`overflow: hidden`, `height: calc(100dvh - <header height>)`). Left pane (preview) is fixed with auto-fit content; right pane (editor/settings) has independent `overflow-y-auto` with thin scrollbar and `overscroll-behavior: contain`. Scrolling over one pane never moves the other pane or the outer window. Below 1024px, preview is sticky at top with controls scrolling underneath. List pages (Gallery, Stock, Bin) retain standard vertical document scrolling.
11. **Modals & Drawers:**
    - White surface, 12px radius (`rounded-xl`), dim blurred overlay (`bg-gray-900/40 backdrop-blur-xs`), clean header with title and close icon, compact padding (16ΓÇô20px), fixed footer with secondary and primary buttons aligned right. Touch targets at least 36px.
    - Fits window (`max-h-[calc(100dvh-2rem)]`), scrollable body, full-screen on mobile (`390px`).
    - Form layouts use clean 2-column grid on desktop, single column on mobile, inline validation, autofocus first field, close on Escape, unsaved changes confirmation.
12. **Toasts:**
    - Small white surface, 1px border (`border-gray-200`), soft shadow, small colored icon, clean text.
13. **Empty States:**
    - One simple outline icon in gray (stroke 1.5), short title, one-line gray description, single action button. No colored illustrations or graphic blobs.
14. **Skeletons:**
    - Flat light gray blocks (`bg-gray-200/75 animate-pulse rounded-lg`).

## 6. Frontend Folder Structure (inside `resources/js/`)
```
resources/js/
Γö£ΓöÇΓöÇ api/            # axios instance + endpoint helpers
Γö£ΓöÇΓöÇ components/     # Sidebar, Button, Modal, Drawer, Badge, EmptyState, Skeleton
Γö£ΓöÇΓöÇ features/
Γöé   Γö£ΓöÇΓöÇ gallery/    # CodeCard, CodeGrid, Filters
Γöé   Γö£ΓöÇΓöÇ designer/   # BarcodeControls, QrControls, PreviewPanel, ProductPicker
Γöé   ΓööΓöÇΓöÇ stock/      # ProductTable, ProductForm, SummaryCards
Γö£ΓöÇΓöÇ pages/          # GalleryPage, DesignerPage, StockPage
Γö£ΓöÇΓöÇ hooks/
Γö£ΓöÇΓöÇ utils/          # validators, download helpers
Γö£ΓöÇΓöÇ App.jsx         # routes
ΓööΓöÇΓöÇ app.jsx         # entry point (createRoot, QueryClientProvider, BrowserRouter)
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
