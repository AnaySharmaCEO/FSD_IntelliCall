# IntelliCall — Deployment & Hosting Guide

> **Official Deployment Reference**  
> **Platform:** IntelliCall (Powered by Resonology AI)

---

## 🌐 1. Live Production Deployment

* **Live URL:** [https://intellicall.pages.dev](https://intellicall.pages.dev)
* **Hosting Platform:** **Cloudflare Pages** (Global Edge CDN)
* **Deployed & Maintained By:** **Anay Sharma**
* **Frontend Build Pipeline:** Automated GitHub repository CI/CD trigger to Cloudflare Pages on branch releases (`main`).

---

## 🖥️ 2. Application Architecture in Production

```
 [ Client Browser / Mobile ] ──► Cloudflare Edge (intellicall.pages.dev)
                                      │
                                      ▼
                        [ Express.js API Backend ]
                                      │
                                      ▼
                      [ Supabase PostgreSQL & Auth ]
```

---

## ⚙️ 3. Local Development Setup

### Backend Setup (Express.js)
```bash
cd backend
cp .env.example .env
# Configure SUPABASE_URL, SUPABASE_ANON_KEY, and GEMINI_API_KEY
npm install
npm run dev
# Server runs on http://localhost:5000
```

### Frontend Setup (Vite / React 19)
```bash
cd frontend
cp .env.example .env
# Set VITE_API_URL=http://localhost:5000/api/v1
npm install
npm run dev
# Client runs on http://localhost:5173
```
