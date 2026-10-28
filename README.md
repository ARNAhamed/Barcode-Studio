# Barcode & QR Designer (Barcode Studio)

A web application to **design and create barcodes and QR codes**, linked directly to a live **stock (product) catalog**.

Built as a **single project, unified Laravel + React SPA** running on the same origin (no CORS configuration needed).

---

## Features

* **Code Gallery (`/` - Start Page):**
  * Responsive card grid (1, 2, 3, 4 columns) displaying saved barcodes and QR codes.
  * Instant search by code title, value, or symbology format.
  * Filter chips: **All Codes**, **Barcodes**, **QR Codes** with live count badges.
  * Card actions: direct **Download PNG**, **Edit in Designer**, and **Delete** with confirmation modal.
  * Friendly illustration empty states for zero-data and zero-search results.

* **Barcode & QR Designer (`/designer` and `/designer/:id`):**
  * Two-column split layout with controls on the left and sticky real-time preview on the right.
  * **Barcode Symbologies:** `CODE128`, `EAN-13`, `EAN-8`, `UPC-A`, `CODE39`, `ITF-14` powered by `jsbarcode`.
  * **QR Code Styling:** Customizable dot styles (square, dots, rounded, extra-rounded, classy), corner styles, custom colors, error correction levels (L, M, Q, H), and center logo upload powered by `qr-code-styling`.
  * **Stock Product Sync:** Search autocomplete (`/api/products/lookup`) that auto-fills SKU, barcode number, price, and customizable label.
  * **Instant Validation:** Live validation for symbology-specific rules (e.g. 12–13 digits for EAN-13).
  * **Export Options:** **Save to Gallery** (stores high-res PNG in `storage/app/public/previews` via `html-to-image`), **Download PNG**, **Download SVG** (barcodes), and **Reset Settings**.

* **Products (`/products` - Items & Suppliers):**
  * Sub-navigation with tab switcher: **Items** (`/products/items`) and **Suppliers** (`/products/suppliers`).
  * **Items**: Inventory overview cards (**Total Products**, **Low Stock Alert**, **Out of Stock**), searchable table, supplier assignment and filter, CSV import/export, bulk barcode generation with design templates.
  * **Suppliers**: Full supplier directory with contact details (mobile, email, phone, city, Sri Lanka country default), linked products counter, quick tap-to-call / email / map actions, and supplier modal.
  * Status badges: **In stock** (green), **Low stock** (amber, triggered when `quantity <= low_stock_threshold`), and **Out of stock** (red).
  * **Generate Code** button per product that opens the Designer with the product pre-selected.

* **Public Product Page (`/p/{token}`)**:
  * Clean, mobile-first product page accessible by scanning generated QR codes or via direct link.
  * Displays item details (name, category, barcode number, SKU, price, stock availability) and supplier information (name, contact person, tap-to-call mobile, tap-to-email, address with Google Maps link, and payment terms).
  * Admin controls on Products > Items menu to toggle public page availability and supplier detail visibility.

* **Supplier Info on Barcode Labels & Multi-line Labels**:
  * Label text supports up to 3 lines under the code with font size, gap, weight, and alignment controls.
  * Extended dynamic placeholders: `{name}`, `{sku}`, `{price}`, `{category}`, `{barcode}`, `{quantity}`, `{supplier}`, `{supplier_contact}`, `{supplier_mobile}`, `{supplier_phone}`, `{supplier_email}`, `{supplier_city}`.
  * Automatic pruning of empty lines and dangling separators (`•`, `-`, `|`).
  * Instant preset: `{supplier} • {supplier_mobile}`.

---

## Tech Stack

* **Backend:** Laravel 11/12, REST API (`routes/api.php`), MySQL (`barcode_designer`), Form Requests, API Resources, Eloquent Models.
* **Frontend:** React 19, Vite + `@tailwindcss/vite` (Tailwind CSS v4), React Router, `@tanstack/react-query`, `lucide-react`, `react-hot-toast`.
* **Libraries:** `jsbarcode`, `qr-code-styling`, `html-to-image`, `axios`.

---

## Local Setup Instructions

### 1. Requirements
* PHP 8.2+
* Composer
* Node.js & npm
* MySQL / MariaDB

### 2. Configure Environment
Ensure your `.env` file points to your MySQL database:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=barcode_designer
DB_USERNAME=root
DB_PASSWORD=
APP_URL=http://localhost:8000
```

### 3. Install Dependencies
```bash
# Install PHP dependencies
composer install

# Install NPM dependencies
npm install
```

### 4. Database Migrations, Seeding & Storage Link
```bash
# Run migrations and seed ~15 realistic products
php artisan migrate --seed

# Link public storage for preview images
php artisan storage:link
```

### 5. Running the Application
Run both the Laravel backend server and Vite frontend dev server in separate terminal windows:

**Terminal 1 (Backend):**
```bash
php artisan serve
```

**Terminal 2 (Frontend):**
```bash
npm run dev
```

Open **http://localhost:8000** in your web browser. The application opens directly to the **Code Gallery**.

---

## Mobile Phone QR Code Scanning & Network Access

When scanning generated QR codes with a smartphone, the phone must be able to reach your web server:

1. **Same Wi-Fi Network (Local Development):**
   - Find your computer's local IP address (e.g. `192.168.1.150` via `ipconfig` on Windows).
   - In your `.env` file, update `APP_URL`:
     ```env
     APP_URL=http://192.168.1.150:8000
     ```
   - Start Laravel listening on all interfaces:
     ```bash
     php artisan serve --host=0.0.0.0 --port=8000
     ```
   - Now any phone on the same Wi-Fi can scan the QR code and open the public product page at `http://192.168.1.150:8000/p/{token}`.
   - Note: `localhost` only works when tested in a browser on the same computer.

2. **Production / Real Use:**
   - Deploy to a web server with a public domain and HTTPS (e.g. `https://your-domain.com`), and set `APP_URL=https://your-domain.com`.
