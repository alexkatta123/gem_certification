# GeM Certificate Generator
**By Bhargav Ram Potluri**

A premium web-based tool for generating GeM Training Certificates with automated gender-based prefixes and professional PDF rendering.

## Quick Start

### 1. Setup Backend (Python)
Ensure you have Python installed.
```bash
cd backend
pip install -r requirements.txt
python app.py
```

### 2. Setup Frontend (Node.js)
Ensure you have Node.js installed.
```bash
cd frontend
npm install
npm run dev
```

## Features
- **Multi-Template Support**: Choose between "Direct Purchase", "Intro", and "Tender" training templates.
- **Smart Prefix**: Automatically detects gender (M -> Mr., F -> Ms.) for name formatting.
- **Premium UI**: Sleek, glassmorphic design with dark mode aesthetics.
- **High Fidelity**: Uses high-quality fonts (Alegreya SC & Aleo) for professional-grade certificates.
- **Real-time Generation**: Instant PDF generation and download.

## Vercel Deployment Note
If you are deploying to Vercel, ensure that the `backend/templates` and `backend/*.ttf` files are included in your project structure. The backend is designed to look for templates in the `templates/` subdirectory relative to `app.py`.

