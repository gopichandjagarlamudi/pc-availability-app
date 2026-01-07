# Deployment Guide

## Pre-Deployment Checklist

- [ ] Google Sheet created and configured
- [ ] Apps Script installed and tested
- [ ] Google Sheets API enabled
- [ ] API key created and restricted
- [ ] Sheet made publicly viewable
- [ ] Rep names updated in `src/App.jsx`
- [ ] Manager code changed (optional)
- [ ] Tested locally with `npm run dev`
- [ ] Tested offline functionality
- [ ] Tested CSV export

## Deployment Options

### Option 1: Netlify (Recommended)

**Why Netlify?**
- Free tier is generous
- Easy environment variable management
- Automatic HTTPS
- Good performance
- Simple continuous deployment

**Steps:**

1. **Prepare the build**:
   ```bash
   npm run build
   ```

2. **Deploy via Netlify CLI** (Recommended):
   ```bash
   # Install Netlify CLI
   npm install -g netlify-cli

   # Login to Netlify
   netlify login

   # Deploy
   netlify deploy --prod
   ```

3. **Or deploy via Netlify UI**:
   - Go to https://app.netlify.com
   - Click "Add new site"
   - Choose "Deploy manually"
   - Drag and drop the `dist` folder

4. **Add environment variables**:
   - Go to Site settings > Environment variables
   - Add the variables for your chosen backend:
     ```
     VITE_SPREADSHEET_ID=your_spreadsheet_id
     VITE_GOOGLE_API_KEY=your_api_key
     ```
     Or (Supabase mode):
     ```
     VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```
   - (Optional) Manager XLSX export templates:
     ```
     EXPORT_REP_TEMPLATE_PATH=/absolute/path/to/rep_table_v4_hours.xlsx
     EXPORT_AVAIL_TEMPLATE_PATH=/absolute/path/to/availability_v4_forced_6h.xlsx
     ```
   - (Optional) Rep geocoding (address → lat/lng):
     ```
     GEOCODER_BASE_URL=https://nominatim.openstreetmap.org
     GEOCODER_USER_AGENT=pc-availability-app/1.0
     ```

5. **Redeploy** to apply environment variables:
   ```bash
   netlify deploy --prod
   ```

6. **Configure custom domain** (optional):
   - Go to Domain settings
   - Add your custom domain
   - Update DNS records as instructed

### Option 2: Vercel

**Why Vercel?**
- Excellent performance
- Great for React apps
- Easy GitHub integration
- Free tier available

**Steps:**

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```

3. **Follow prompts**:
   - Link to existing project or create new
   - Confirm project settings
   - Wait for deployment

4. **Add environment variables**:
   - Go to project settings on Vercel dashboard
   - Navigate to Environment Variables
   - Add the variables for your chosen backend:
     ```
     VITE_SPREADSHEET_ID=your_spreadsheet_id
     VITE_GOOGLE_API_KEY=your_api_key
     ```
     Or (Supabase mode):
     ```
     VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```
   - (Optional) Manager XLSX export templates:
     ```
     EXPORT_REP_TEMPLATE_PATH=/absolute/path/to/rep_table_v4_hours.xlsx
     EXPORT_AVAIL_TEMPLATE_PATH=/absolute/path/to/availability_v4_forced_6h.xlsx
     ```
   - (Optional) Rep geocoding (address → lat/lng):
     ```
     GEOCODER_BASE_URL=https://nominatim.openstreetmap.org
     GEOCODER_USER_AGENT=pc-availability-app/1.0
     ```

5. **Redeploy**:
   ```bash
   vercel --prod
   ```

### Option 3: GitHub Pages

**Why GitHub Pages?**
- Completely free
- Simple setup
- Good for static sites

**Steps:**

1. **Install gh-pages**:
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Update package.json**:
   ```json
   {
     "homepage": "https://yourusername.github.io/pc-availability-app",
     "scripts": {
       "predeploy": "npm run build",
       "deploy": "gh-pages -d dist"
     }
   }
   ```

3. **Update vite.config.js**:
   ```javascript
   export default defineConfig({
     base: '/pc-availability-app/',
     // ... rest of config
   })
   ```

4. **Deploy**:
   ```bash
   npm run deploy
   ```

5. **Configure environment variables**:
   - GitHub Pages doesn't support server-side env vars
   - You'll need to hardcode them (not recommended for production)
   - Or use a backend proxy

### Option 4: Self-Hosted (VPS/Server)

**Requirements:**
- Server with Node.js installed
- Web server (nginx/Apache)
- SSL certificate (Let's Encrypt)

**Steps:**

1. **Build the app**:
   ```bash
   npm run build
   ```

2. **Copy dist folder to server**:
   ```bash
   scp -r dist/* user@your-server:/var/www/pc-availability
   ```

3. **Configure nginx**:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       root /var/www/pc-availability;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```

4. **Enable HTTPS**:
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

## Post-Deployment

### 1. Test the Production App

- [ ] Open the deployed URL
- [ ] Test rep submission
- [ ] Test manager dashboard
- [ ] Test CSV download
- [ ] Test offline mode
- [ ] Test on mobile device
- [ ] Install as PWA

### 2. Configure CORS (if needed)

If you get CORS errors:

1. **Google Sheets API**:
   - Go to Google Cloud Console
   - API & Services > Credentials
   - Edit your API key
   - Add your domain to "Website restrictions"

### 3. Monitor Performance

Use these tools:
- Google Lighthouse (in Chrome DevTools)
- PageSpeed Insights
- WebPageTest

Target scores:
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 90+
- PWA: ✓ (all checks)

### 4. Setup Analytics (Optional)

Add Google Analytics:

1. Create GA4 property
2. Add to `index.html`:
   ```html
   <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
   <script>
     window.dataLayer = window.dataLayer || [];
     function gtag(){dataLayer.push(arguments);}
     gtag('js', new Date());
     gtag('config', 'G-XXXXXXXXXX');
   </script>
   ```

### 5. Share with Team

**For Reps:**
- Share the URL
- Instructions for installing PWA
- Show how to use the form

**For Managers:**
- Share the access code
- Show how to access dashboard
- Demonstrate CSV export

## Continuous Deployment

### Setup with GitHub

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/pc-availability-app.git
   git push -u origin main
   ```

2. **Connect to Netlify/Vercel**:
   - Link GitHub repository
   - Configure build settings
   - Add environment variables
   - Enable automatic deployments

Now every push to main will auto-deploy!

## Environment Variables Reference

```bash
# Required
VITE_SPREADSHEET_ID=1a2b3c4d5e6f7g8h9i0j  # From Google Sheet URL
VITE_GOOGLE_API_KEY=AIzaSyXXXXXXXXXXXXXXX  # From Google Cloud Console

# Optional
VITE_MANAGER_CODE=1234  # If you want to configure via env var
```

## Rollback Plan

If something goes wrong:

### Netlify
```bash
# List deployments
netlify deploy --list

# Restore previous deployment
netlify deploy --restore <deploy-id>
```

### Vercel
- Go to Deployments tab
- Click on working deployment
- Click "Promote to Production"

## Security Checklist

- [ ] API key restricted to Google Sheets API only
- [ ] API key restricted to your domain(s)
- [ ] Google Sheet is view-only (not edit)
- [ ] HTTPS enforced
- [ ] Environment variables not in source code
- [ ] Manager code changed from default
- [ ] No sensitive data in localStorage
- [ ] CSP headers configured (optional)

## Performance Optimization

### 1. Enable Compression
Netlify/Vercel do this automatically.

For self-hosted, enable gzip in nginx:
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
```

### 2. Cache Static Assets
Add to `netlify.toml`:
```toml
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### 3. Optimize Images
Use WebP format for icons:
```bash
cwebp -q 80 icon.png -o icon.webp
```

## Monitoring

### Uptime Monitoring
Use free services:
- UptimeRobot (50 monitors free)
- StatusCake (10 monitors free)
- Pingdom (50 checks free)

### Error Tracking
Consider adding:
- Sentry (free tier available)
- LogRocket (sessions tracking)
- Google Analytics (free)

## Backup Strategy

1. **Google Sheet**:
   - Automatic Google Drive backups
   - Manual: File > Make a copy (weekly)

2. **Code**:
   - GitHub repository
   - Local git backup

3. **Environment Variables**:
   - Save securely (password manager)
   - Document separately

## Troubleshooting Deployment

### Build Fails
```bash
# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Environment Variables Not Working
- Check variable names start with `VITE_`
- Redeploy after adding variables
- Check for typos

### PWA Not Installing
- Ensure HTTPS is enabled
- Check manifest.json is accessible
- Verify service worker registration
- Test with Lighthouse PWA audit

### Slow Load Times
- Check image sizes
- Enable compression
- Use CDN (Netlify/Vercel include)
- Optimize bundle size

## Cost Estimates

### Free Tier Limits

**Netlify Free:**
- 100 GB bandwidth/month
- 300 build minutes/month
- Unlimited sites

**Vercel Free:**
- 100 GB bandwidth/month
- 100 deployments/day
- Unlimited sites

**Google Sheets API Free:**
- 500 requests/100 seconds/user
- More than enough for this use case

**Expected Usage:**
- 100 reps × 2 submissions/month = 200 writes
- Manager checks: ~50 reads/month
- Well within free limits

## Production Checklist

Before going live:

- [ ] All tests passing
- [ ] Rep names updated
- [ ] Manager code changed
- [ ] Environment variables set
- [ ] Google Sheet configured
- [ ] Apps Script installed
- [ ] Test submission end-to-end
- [ ] Test CSV export
- [ ] Test offline mode
- [ ] Test on iOS and Android
- [ ] Performance score > 90
- [ ] PWA installable
- [ ] Monitoring setup
- [ ] Backup strategy in place
- [ ] Team training completed
- [ ] Documentation shared

## Launch Day

1. Share URL with reps via email/Slack
2. Post installation instructions
3. Monitor submissions
4. Be available for questions
5. Check Google Sheet periodically
6. Export first CSV successfully
7. Gather feedback

## Post-Launch

Week 1:
- Monitor daily submissions
- Address any issues quickly
- Collect user feedback
- Make minor adjustments

Week 2-4:
- Review submission patterns
- Optimize based on usage
- Add requested features
- Document lessons learned

---

You're ready to deploy! Choose your platform and follow the steps above.
