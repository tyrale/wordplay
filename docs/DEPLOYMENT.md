# Deployment Guide

## ✅ **CURRENT DEPLOYMENT STATUS** (Updated 2025-01-22)

**Live Application**: The WordPlay game is deployed and accessible.

**Verification**: Deployment instructions below are accurate and current for the existing Vercel setup.

## Vercel Deployment Setup

### Prerequisites
- GitHub repository with the code
- Vercel account (free tier available)

### Step 1: Vercel Account Setup
1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "Continue with GitHub" to sign up/login
3. Authorize Vercel to access your GitHub repositories

### Step 2: Import Project
1. Click "Add New..." → "Project"
2. Find your `wordplay` repository
3. Click "Import"

### Step 3: Configure Build Settings
Vercel should automatically detect the Vite framework. The project includes a `vercel.json` configuration file with optimized settings:
- **Framework Preset**: Vite (auto-detected)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **Node.js Runtime**: 18.x
- **SPA Rewrites**: All routes redirect to `/index.html`
- **Asset Caching**: 1 year cache for static assets

### Step 4: Environment Variables
In Vercel Dashboard → Project Settings → Environment Variables, add:

For now (development phase):
- `NODE_ENV` = `production`

Later (when connecting to production Supabase):
- `VITE_SUPABASE_URL` = `https://your-project-id.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = `your-production-anon-key`

### Step 5: Deploy
1. Click "Deploy"
2. Wait for build to complete (~1-2 minutes)
3. Get the live URL (e.g., `https://wordplay-xyz.vercel.app`)

### Step 6: Automatic Deployments
- Every push to `main` branch will trigger automatic deployment
- Preview deployments for other branches
- Deployment status in GitHub PRs

### Verification Checklist
- [x] Live URL accessible
- [x] App loads without errors
- [x] Build completes successfully
- [x] Automatic deployment from main branch working
- [x] Single-player game functional
- [x] Challenge mode functional
- [x] Theme system working
- [x] Mobile responsive design

## Troubleshooting

### Build Failures
- Check build logs in Vercel dashboard
- Verify all dependencies in package.json
- Ensure TypeScript compilation succeeds locally

### Environment Variables
- Variables must be prefixed with `VITE_` for client-side access
- Restart deployment after adding environment variables

### Domain Issues
- Check DNS propagation (can take up to 24 hours)
- Verify domain configuration in Vercel settings 