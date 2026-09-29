# BhuMap - Geospatial Cadastral Mapping

A high-precision cadastral mapping and registry interface built for the SVAMITVA scheme, designed to align drone orthomosaics with verified vector parcels.

## Origin
This project was conceptualized and developed during the **Smart India Hackathon**, aiming to solve the challenge of accurately mapping and maintaining high-resolution drone-surveyed rural land parcels for the Government of India's SVAMITVA scheme.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Vite
- **Mapping Engine**: React-Leaflet (Leaflet.js)
- **Backend/API**: FastAPI
- **Database**: PostGIS (PostgreSQL)
- **AI Feature Extraction**: YOLOv8
- **Photogrammetry Engine**: WebODM

## Features
- **High-Precision Orthomosaic Overlays**: Precisely aligned `.tif`/`.png` mesh overlays onto base maps using strictly calibrated geographic bounds.
- **Dynamic Cadastral Vectors**: Superimposition of interactive vector GeoJSON parcels linked to actual property records.
- **Glassmorphism SaaS UI**: A premium, "VisionOS-inspired" responsive UI architecture designed for extensive GIS data analysis.
- **Property Title Cards**: On-demand generated cadastral certificates and ownership validation modals per parcel.
- **Real-time Pipeline Tracking**: WebSocket-based tracking of the drone ingestion and feature extraction pipeline.

## Installation and Setup

### 1. Clone the repository
```bash
git clone https://github.com/your-username/bhumap.git
cd bhumap
```

### 2. Frontend Setup
Make sure you have Node.js (v18+) installed.
```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

### 3. Backend Setup (FastAPI & WebODM)
Ensure Python 3.9+ is installed.
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`

# Install dependencies
pip install -r requirements.txt

# Run the API server
uvicorn main:app --reload
```

## Environment Variables
Create a `.env` file in the root of the project with the required keys (DO NOT commit actual keys to version control).

```env
# Example .env format
VITE_API_BASE_URL=http://localhost:8000
VITE_MAP_TILES_KEY=your_mapbox_or_maptiler_key_here
POSTGRES_DB_URL=postgresql://user:password@localhost:5432/bhumap_gis
WEBODM_API_URL=http://localhost:3000
```
