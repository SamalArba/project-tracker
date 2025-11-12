# 🚀 Project Tracker - Deployment Guide

## Recommended: Railway Deployment (Easiest)

Railway is the simplest way to deploy your full-stack application with PostgreSQL database.

---

## 📦 Option 1: Railway (All-in-One) - RECOMMENDED

### Prerequisites
- GitHub account
- Railway account (sign up at https://railway.app)

### Step 1: Push to GitHub

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Project Tracker"

# Create GitHub repository and push
# (Follow GitHub's instructions to create a new repository)
git remote add origin https://github.com/YOUR_USERNAME/project-tracker.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy on Railway

1. **Go to https://railway.app and sign in with GitHub**

2. **Click "New Project" → "Deploy from GitHub repo"**
   - Select your `project-tracker` repository
   - Railway will detect it's a monorepo

3. **Add PostgreSQL Database**
   - Click "New" → "Database" → "Add PostgreSQL"
   - Railway automatically creates `DATABASE_URL` environment variable

4. **Configure Services**

   **Backend Service:**
   - Root Directory: `/server`
   - Build Command: `npm install && npx prisma generate && npx prisma migrate deploy`
   - Start Command: `npm start`
   - Environment Variables:
     - `DATABASE_URL` (auto-set by Railway)
     - `PORT` = `4000`
     - `NODE_ENV` = `production`

   **Frontend Service:**
   - Root Directory: `/client`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run preview`
   - Environment Variables:
     - `VITE_API_URL` = (your backend Railway URL)

5. **Deploy**
   - Railway auto-deploys on every git push to main
   - Get your public URLs from Railway dashboard

### Step 3: Update CORS Settings

In `server/src/index.ts`, update CORS to allow your frontend domain:

```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}))
```

---

## 📦 Option 2: Split Deployment (More Control)

### Frontend: Vercel

1. **Go to https://vercel.com**
2. **Import your GitHub repository**
3. **Configure:**
   - Framework Preset: Vite
   - Root Directory: `client`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. **Add Environment Variable:**
   - `VITE_API_URL` = your backend URL

### Backend: Render

1. **Go to https://render.com**
2. **New → Web Service**
3. **Connect GitHub repository**
4. **Configure:**
   - Root Directory: `server`
   - Build Command: `npm install && npx prisma generate && npx prisma migrate deploy`
   - Start Command: `npm start`
   - Add PostgreSQL database
5. **Environment Variables:**
   - `DATABASE_URL` (from Render PostgreSQL)
   - `PORT` = `10000` (Render default)
   - `NODE_ENV` = `production`
   - `FRONTEND_URL` = your Vercel URL

---

## 🗄️ Database Migrations

After deployment, run migrations:

```bash
# SSH into your server or use Railway CLI
npx prisma migrate deploy
```

---

## 📁 File Upload in Production

### Current Setup (Local Storage)
Files are stored in `server/uploads/` - this works but files are lost on server restart.

### Production Solutions:

#### Option A: Railway Volumes (Recommended for Railway)
```bash
# In Railway dashboard
# Add a Volume to your backend service
# Mount path: /app/uploads
```

#### Option B: Cloud Storage (Best for Scale)
Use AWS S3, Cloudinary, or similar for file storage.

**Quick Setup with Cloudinary:**
1. Sign up at https://cloudinary.com
2. Install: `npm install cloudinary multer-storage-cloudinary`
3. Update `server/src/middleware/upload.ts`

---

## 🔐 Environment Variables Checklist

### Backend (.env)
```
DATABASE_URL=postgresql://...
PORT=4000
NODE_ENV=production
FRONTEND_URL=https://your-frontend.vercel.app
```

### Frontend (.env)
```
VITE_API_URL=https://your-backend.railway.app/api
```

---

## ✅ Pre-Deployment Checklist

- [ ] All code committed to Git
- [ ] `.gitignore` properly configured
- [ ] `node_modules/` not in Git
- [ ] Environment variables documented
- [ ] Database migrations tested
- [ ] CORS configured for production domains
- [ ] Build commands tested locally
- [ ] File upload directory configured

---

## 🧪 Test Deployment Locally

### Build Production Version

**Frontend:**
```bash
cd client
npm run build
npm run preview  # Test production build
```

**Backend:**
```bash
cd server
npm run build  # If you have a build script
npm start
```

---

## 🚨 Troubleshooting

### Issue: Database connection fails
- Check `DATABASE_URL` is set correctly
- Ensure Prisma migrations are run: `npx prisma migrate deploy`

### Issue: CORS errors
- Add your frontend URL to CORS whitelist in `server/src/index.ts`

### Issue: Files not uploading
- Check uploads directory exists
- Consider using cloud storage (Cloudinary, S3)

### Issue: Build fails
- Check all dependencies are in `package.json`
- Run `npm install` locally to verify

---

## 📞 Support

- Railway Docs: https://docs.railway.app
- Vercel Docs: https://vercel.com/docs
- Render Docs: https://render.com/docs

---

## 🎉 Success!

Once deployed, your project tracker will be accessible via:
- **Frontend:** https://your-app.railway.app
- **Backend API:** https://your-app-backend.railway.app/api

Share the frontend URL with your team! 🚀

