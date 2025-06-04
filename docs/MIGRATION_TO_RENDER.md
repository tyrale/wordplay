# Migration Guide: Vercel to Render

## When to Migrate
- When making repository private
- When consolidating with other Render projects
- When needing backend services beyond Supabase

## Pre-Migration Checklist

### 1. Document Current Vercel Setup
- [ ] Current domain: https://wordplay-blond.vercel.app/
- [ ] Environment variables (copy from Vercel dashboard)
- [ ] Build settings: `npm run build`
- [ ] Output directory: `dist/`

### 2. Prepare Render Configuration

Create `render.yaml` in project root:
```yaml
services:
  - type: web
    name: wordplay
    env: node
    plan: free
    buildCommand: npm run build
    startCommand: npm run preview
    envVars:
      - key: NODE_ENV
        value: production
      - key: VITE_SUPABASE_URL
        sync: false
      - key: VITE_SUPABASE_ANON_KEY
        sync: false
```

### 3. Update Build Scripts
Add to package.json if needed:
```json
{
  "scripts": {
    "start": "vite preview --host 0.0.0.0 --port $PORT"
  }
}
```

## Migration Steps

### 1. Test on Render
- [ ] Create new Render service
- [ ] Connect GitHub repository
- [ ] Configure environment variables
- [ ] Test deployment

### 2. Domain Migration
- [ ] Update DNS settings
- [ ] Configure custom domain on Render
- [ ] Set up SSL certificates

### 3. Update Documentation
- [ ] Update README.md with new deployment URL
- [ ] Update TASK_PROGRESS.md verification links
- [ ] Update any hardcoded URLs in code

## Post-Migration Verification

### Test All Features
- [ ] Frontend loads correctly
- [ ] Supabase connection works
- [ ] Environment variables are set
- [ ] Build process completes
- [ ] Performance is acceptable

### Update External References
- [ ] GitHub repository description
- [ ] Documentation links
- [ ] Any external services pointing to the old URL

## Rollback Plan
- Keep Vercel deployment active for 30 days
- DNS can be switched back if issues arise
- Environment variables backed up

## Performance Comparison
After migration, compare:
- Page load speeds
- Build times
- Cold start performance
- Overall user experience 