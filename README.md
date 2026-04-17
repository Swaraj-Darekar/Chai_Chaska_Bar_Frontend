# Chai Chaska Bar - Management System

A modern, full-stack management system for Chai Chaska Bar, featuring a customer menu, admin dashboard, and wallet-based commission system.

## 🚀 Deployment Guide

### 1. Backend (Render / Railway)
The backend is a FastAPI application that connects to Supabase.

- **Deployment URL**: [Your Backend URL]
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Environment Variables**:
  - `SUPABASE_URL`: Your Supabase project URL.
  - `SUPABASE_KEY`: Your Supabase project service role or anon key.
  - `ALLOWED_ORIGINS`: Your frontend URL (e.g., `https://your-app.vercel.app`). Use `*` for initial testing.

### 2. Frontend (Vercel / Netlify)
The frontend is a Vite + React application.

- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**:
  - `VITE_API_BASE_URL`: The URL of your deployed backend (e.g., `https://your-api.onrender.com`).

### 3. Database (Supabase)
1. Create a new Supabase project.
2. Go to the **SQL Editor**.
3. Copy the contents of `backend/supabase_schema.sql` and run it.
4. Ensure all tables are created and RLS is disabled (as specified in the schema for this stage).

## 🛠️ Local Development

### Backend
```bash
cd backend
pip install -r requirements.txt
python main.py
```
*(Uses SQLite automatically if no Supabase environment variables are found in `.env`)*

### Frontend
```bash
npm install
npm run dev
```

## 📜 Database Schema
The database schema is defined in `backend/supabase_schema.sql`. It includes:
- `categories`: Menu categories.
- `items`: Menu items.
- `orders`: Customer orders.
- `order_items`: Items within each order.
- `expenses`: Cafe expenses.
- `monthly_settlements`: Financial records.
- `cafe_wallet`: Wallet for platform commissions.
- `system_settings`: Global settings (e.g., commission rate).
