# 💎 GeM Certificate Generator (Enterprise Edition)

A high-performance, professional certificate generation suite designed for GeM (Government e-Marketplace) training programs. Built with a modern tech stack for seamless automated workflows and premium PDF output.

## 🚀 Deployment Status
[![Deployed to Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://gem-certification.vercel.app)

## ✨ Core Features
- **Smart Prefixing**: Automatic gender detection (Mr./Ms.) based on input data.
- **Bulk Processing**: Generate hundreds of certificates simultaneously from an Excel file.
- **Direct Save**: Support for the File System Access API to save certificates directly to a local folder.
- **Enterprise Aesthetics**: Sleek dark-mode UI with glassmorphism and smooth Framer Motion animations.
- **High Fidelity**: Professional typography using Alegreya SC and Aleo fonts.

## 🛠️ Tech Stack
- **Frontend**: React 19, Vite, Framer Motion, Lucide React.
- **Backend**: Python (Flask), PyPDF2, ReportLab.
- **Deployment**: Vercel (Serverless Functions).

## 📦 Installation & Local Development

### 1. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python app.py
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## 🌐 Vercel Deployment Config
The project is pre-configured with `vercel.json` to handle the dual-stack architecture (Node.js + Python). The API is routed through the `/api` prefix.

---
**Developed by Bhargav Ram Potluri**
