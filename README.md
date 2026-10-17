# TimeGrid — Academic Timetable Management Platform

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-v4.19-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-v6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)

An enterprise-grade, conflict-free academic scheduling and timetable generation platform built with the **MERN Stack** (MongoDB Atlas, Express.js, React 19, Node.js) and TypeScript.

---

## 🌟 Key Highlights

- **Constraint-Based Schedule Solver**: Automatically arranges 2-hour lab sessions, multi-period lectures, faculty max-hour caps, and free-study blocks (`PRJ` & `SDA`).
- **Zero-Latency Fallback Architecture**: Resilient in-memory dataset keeps all features operational even if MongoDB Atlas undergoes network drops or IP whitelist changes.
- **Interactive Multi-Division Timetable Matrix**: Visual weekly grids with drag/swap placement, instant conflict warning tags, and live cell inspector.
- **Institutional Quality Scoring**: Automatically evaluates timetables on a 0–100 scale across load balancing, teacher balance, and subject distribution.
- **Noticeboard & Print-Ready Export**: Formatted printable timetables for Divisions, Faculty, Classrooms, and Laboratories with university headers.
- **Monochrome Minimalist Landing Page**: Pure black & white (`#000000` / `#ffffff`) high-converting product showcase with interactive schedule sandbox and ROI telemetry.

---

## 🏛️ System Architecture

```
mern_timetable/
├── backend/                       # Node.js + Express.js API Server
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js              # MongoDB Atlas connection with fast timeout failover
│   │   │   └── initDns.js         # DNS resolvers (8.8.8.8, 1.1.1.1) for Atlas SRV records
│   │   ├── data/
│   │   │   └── inMemoryStore.js   # Fast offline fallback store (38 subjects, 32 teachers, 24 rooms)
│   │   ├── models/                # Mongoose schemas (Teacher, Room, Subject, ClassGroup, etc.)
│   │   ├── routes/                # Express API routes (/timetable, /analytics, /hierarchy, CRUD)
│   │   └── services/
│   │       ├── timetableSolver.js # Heuristic conflict-free schedule solver
│   │       └── qualityScorer.js   # Academic spread and balance quality scorer
│   ├── seedAtlas.js               # Database seeder for MongoDB Atlas
│   ├── server.js                  # Main server entrypoint (Port 5000)
│   ├── package.json
│   └── .env.example
│
├── frontend/                      # React 19 + TypeScript + Vite Application
│   ├── src/
│   │   ├── components/            # TopBar, Sidebar, BrandLogo, CommandPalette, Modals
│   │   ├── pages/                 # LandingPage, TimetablePage, ExportPage, CRUD setups
│   │   └── services/
│   │       └── api.ts             # Axios client with resilient timeout handling
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.example
│
├── .gitignore                     # Repository git ignore rules
└── README.md                      # Documentation
```

---

## 🚀 Local Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [MongoDB Atlas Account](https://www.mongodb.com/atlas) or local MongoDB instance

---

### Step 1: Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd mern_timetable/backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create your `.env` file from the template:
   ```bash
   cp .env.example .env
   ```
4. Update `MONGODB_URI` in `.env` with your MongoDB connection string:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/timegrid?retryWrites=true&w=majority
   ```
   *(Note: If MongoDB is offline, the backend automatically uses the built-in fallback store without failing!)*

5. (Optional) Seed initial college curriculum into MongoDB Atlas:
   ```bash
   npm run seed
   ```

6. Start the backend server:
   ```bash
   npm run dev
   ```
   Backend will run on **`http://localhost:5000`** with APIs mounted at `/api/v1/*`.

---

### Step 2: Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd mern_timetable/frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env` file:
   ```bash
   cp .env.example .env
   ```
   Contents:
   ```env
   VITE_API_URL=http://localhost:5000/api/v1
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
   Frontend will open at **`http://localhost:3000`** (or port displayed by Vite).

---

## 🌐 Production Deployment Guide

### A. Deploy Frontend on Vercel

1. Push this repository to GitHub.
2. Log in to [Vercel](https://vercel.com/) and click **Add New...** → **Project**.
3. Import your GitHub repository.
4. In the project configuration:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `mern_timetable/frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Under **Environment Variables**, add:
   - `VITE_API_URL`: `https://your-backend-domain.com/api/v1`
6. Click **Deploy**. Vercel will provide a live HTTPS URL (e.g. `https://timegrid.vercel.app`).

---

### B. Deploy Backend on Render / Railway

#### Using Render (Recommended for Express & Node.js):
1. Log in to [Render](https://render.com/) and click **New +** → **Web Service**.
2. Connect your GitHub repository.
3. Configure the service settings:
   - **Root Directory**: `mern_timetable/backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
4. Add Environment Variables:
   - `PORT`: `5000`
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: `mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/timegrid?retryWrites=true&w=majority`
5. Click **Create Web Service**.
6. Copy your service URL (e.g. `https://timegrid-backend.onrender.com`) and paste it as `VITE_API_URL` on your Vercel frontend.

---

### C. MongoDB Atlas Whitelisting for Cloud Providers

1. Open [MongoDB Atlas](https://cloud.mongodb.com/).
2. In the left navigation, click **Network Access**.
3. Click **Add IP Address**.
4. Choose **Allow Access from Anywhere (`0.0.0.0/0`)** so serverless containers on Render/Vercel can connect without connection drops.
5. Click **Confirm**.

---

## 📊 Core API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/timetable/auto-generate` | Generate conflict-free timetable across multiple divisions |
| `GET` | `/api/v1/timetable/presets` | Retrieve all generated presets with quality telemetry |
| `GET` | `/api/v1/timetable/presets/:id` | Fetch full timetable grid for a specific preset |
| `GET` | `/api/v1/timetable/faculty-workload` | Real-time faculty workload breakdown & status |
| `GET` | `/api/v1/timetable/room-availability` | Room and laboratory occupancy schedules |
| `GET` | `/api/v1/subjects` | Full subjects list with branch and hours data |
| `GET` | `/api/v1/teachers` | Faculty members with designations & max workload |
| `GET` | `/api/v1/rooms` | Classrooms and specialized departmental labs |
| `GET` | `/api/v1/class-groups` | Division student sections |

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
