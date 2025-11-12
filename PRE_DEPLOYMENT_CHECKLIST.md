# ✅ Pre-Deployment Checklist

Run through this checklist before deploying to ensure smooth deployment.

---

## 📋 Code Preparation

### Git & Version Control
- [ ] Git initialized in project root
- [ ] All changes committed
- [ ] `.gitignore` files present (root, client, server)
- [ ] `node_modules/` excluded from Git
- [ ] `.env` files excluded from Git
- [ ] Sensitive data removed from code

### Dependencies
- [ ] All dependencies in `package.json`
- [ ] `npm install` works in both `/client` and `/server`
- [ ] No missing dependencies
- [ ] Lock files present (`package-lock.json`)

---

## 🗄️ Database

### Prisma Setup
- [ ] `schema.prisma` configured for PostgreSQL
- [ ] Migrations created and tested
- [ ] `npx prisma generate` runs successfully
- [ ] `npx prisma migrate deploy` tested

### Data
- [ ] Test data available (or production data ready)
- [ ] No hardcoded development database URLs

---

## 🔧 Configuration

### Environment Variables
- [ ] `env.example` files created
- [ ] Required variables documented:
  - `DATABASE_URL`
  - `PORT`
  - `NODE_ENV`
  - `FRONTEND_URL` (for CORS)
- [ ] No `.env` files committed to Git

### Server Configuration
- [ ] CORS configured for production domains
- [ ] Port configurable via environment variable
- [ ] File upload paths configurable
- [ ] Error handling in place

### Client Configuration
- [ ] API URL configurable (`VITE_API_URL`)
- [ ] Build command works: `npm run build`
- [ ] Production build tested: `npm run preview`

---

## 🧪 Testing

### Local Testing
- [ ] Server starts successfully (`npm start`)
- [ ] Client starts successfully (`npm run dev`)
- [ ] Database connection works
- [ ] API endpoints respond correctly
- [ ] File uploads work
- [ ] CRUD operations tested:
  - [ ] Create project
  - [ ] View projects (all lists)
  - [ ] Update project
  - [ ] Delete project
  - [ ] Add/delete assignments
  - [ ] Add/delete contacts
  - [ ] Upload/download/delete files

### Production Build Testing
- [ ] Client builds without errors: `cd client && npm run build`
- [ ] Preview build works: `npm run preview`
- [ ] Server runs in production mode
- [ ] All features work in production build

---

## 📁 File Structure

### Required Files Present
- [ ] `client/package.json`
- [ ] `server/package.json`
- [ ] `server/prisma/schema.prisma`
- [ ] `DEPLOYMENT.md` (deployment guide)
- [ ] `README.md` (optional but recommended)

### Uploads Directory
- [ ] `/server/uploads/` exists
- [ ] Directory in `.gitignore`
- [ ] Plan for production storage (Railway volume or cloud)

---

## 🔐 Security

### Sensitive Data
- [ ] No API keys hardcoded
- [ ] No database credentials in code
- [ ] No passwords in code
- [ ] `.env` files in `.gitignore`

### CORS
- [ ] CORS configured (not `*` in production)
- [ ] Frontend URL whitelisted
- [ ] API endpoints protected if needed

---

## 📦 Deployment Platform

### Platform Account
- [ ] Account created (Railway/Vercel/Render)
- [ ] GitHub account connected
- [ ] Payment method added (if required)

### Repository
- [ ] Code pushed to GitHub
- [ ] Repository is public or platform has access
- [ ] Main branch up to date

---

## 🚀 Deployment Steps

### Pre-Deploy
- [ ] Read `DEPLOYMENT.md` guide
- [ ] Choose deployment platform (Railway recommended)
- [ ] Plan for file storage in production

### Deploy
- [ ] Connect repository to platform
- [ ] Configure build settings
- [ ] Add environment variables
- [ ] Add PostgreSQL database
- [ ] Deploy both frontend and backend

### Post-Deploy
- [ ] Run database migrations
- [ ] Test all features on production
- [ ] Check file upload/download works
- [ ] Verify all lists display correctly
- [ ] Test search functionality
- [ ] Test mobile responsiveness

---

## 📊 Monitoring

### After Deployment
- [ ] Check deployment logs for errors
- [ ] Monitor database connections
- [ ] Watch for CORS errors
- [ ] Test API response times
- [ ] Verify file uploads working

---

## 📝 Documentation

### For Your Team
- [ ] Document production URLs
- [ ] Document admin access (if any)
- [ ] Create user guide (optional)
- [ ] Document any limitations
- [ ] Share deployment access with team

---

## ✅ Final Checks

### Before Going Live
- [ ] All features tested end-to-end
- [ ] No console errors in browser
- [ ] No server errors in logs
- [ ] Database persists data correctly
- [ ] Files upload and download correctly
- [ ] Mobile/responsive design works
- [ ] Hebrew text displays correctly
- [ ] Color-coded urgency system works

### Launch!
- [ ] Share URL with team
- [ ] Provide instructions for use
- [ ] Set up monitoring/alerts (optional)
- [ ] Plan for backups
- [ ] Document any known issues

---

## 🎉 You're Ready!

If all checkboxes are ✅, you're ready to deploy!

Follow the guide in `QUICKSTART_DEPLOYMENT.md` or `DEPLOYMENT.md`.

**Good luck! 🚀**

