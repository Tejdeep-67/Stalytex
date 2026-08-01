# Stalytex

Stalytex is a browser-first analytics studio that allows you to upload, inspect, clean, visualize, and query datasets (CSV, XLSX) entirely in your browser without any backend dependencies.

## Features

- **Dataset Editor:** Sort, filter, search, and update table values. Add or delete rows and columns dynamically.
- **Visualizations:** Build charts (Bar, Line, Area, Pie, Scatter, Histogram) from your dataset in real-time. Map columns to X and Y axes and customize colors.
- **SQL Compiler:** Run SQL queries directly against your uploaded data using a browser-side SQLite engine (`sql.js`).
- **Statistics:** View column-level analytics, such as min/max, average, unique values, and empty cells.
- **Exporting:** Download the cleaned dataset as CSV or XLSX, and export your visualizations as PNG images.

## Setup

This project uses [Vite](https://vitejs.dev/) with React and TypeScript.

### Installation

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:4173/` (or the port provided in the terminal).

## Tech Stack

- React 18
- TypeScript
- Vite
- Recharts (Charting)
- PapaParse (CSV Parsing)
- XLSX (Excel Parsing)
- SQL.js (In-browser SQL)
- html2canvas (Image Export)

## License
MIT
