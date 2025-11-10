# Frontend Deployment Guide

Your React frontend is ready to deploy! Choose your preferred platform:

## 🚀 Option 1: Deploy to Vercel (Recommended)

### Step-by-Step Guide

1. **Install Vercel CLI (Optional)**
   ```bash
   npm install -g vercel
   ```

2. **Push your code to GitHub** (if not already done)
   ```bash
   git add .
   git commit -m "Prepare frontend for deployment"
   git push origin main
   ```

3. **Deploy via Vercel Dashboard**
   - Go to [https://vercel.com](https://vercel.com)
   - Click **"Add New Project"**
   - Import your GitHub repository
   - Select the `frontend` directory as the **Root Directory**
   - Vercel will auto-detect Create React App settings:
     - **Framework Preset**: Create React App
     - **Build Command**: `npm run build` (auto-detected)
     - **Output Directory**: `build` (auto-detected)
     - **Install Command**: `npm install` (auto-detected)

4. **Add Environment Variable**
   
   In Vercel Project Settings → Environment Variables:
   
   | Name | Value |
   |------|-------|
   | `REACT_APP_WS_HOST` | `your-backend.onrender.com` |
   
   **Replace `your-backend.onrender.com` with your actual Render backend URL** (without `https://` or `wss://`)

5. **Deploy!**
   - Click **"Deploy"**
   - Wait 2-3 minutes
   - Your app will be live at: `https://your-app.vercel.app`

### Alternative: Deploy via CLI

```bash
cd frontend
vercel
```

Follow the prompts and add your environment variable when asked.

---

## 🚀 Option 2: Deploy to Netlify

### Step-by-Step Guide

1. **Push code to GitHub** (if not already)
   ```bash
   git add .
   git commit -m "Prepare frontend for deployment"
   git push origin main
   ```

2. **Deploy via Netlify Dashboard**
   - Go to [https://app.netlify.com](https://app.netlify.com)
   - Click **"Add new site"** → **"Import an existing project"**
   - Connect to GitHub and select your repository
   - Configure build settings:
     - **Base directory**: `frontend`
     - **Build command**: `npm run build`
     - **Publish directory**: `frontend/build`

3. **Add Environment Variable**
   
   In Netlify Site Settings → Environment variables:
   
   | Key | Value |
   |-----|-------|
   | `REACT_APP_WS_HOST` | `your-backend.onrender.com` |

4. **Deploy!**
   - Click **"Deploy site"**
   - Your app will be live at: `https://your-app.netlify.app`

### Alternative: Deploy via CLI

```bash
npm install -g netlify-cli
cd frontend
netlify deploy --prod
```

---

## 🚀 Option 3: Deploy to Render (Static Site)

### Step-by-Step Guide

1. **Create render.yaml for frontend**
   
   Already provided below (see `render.yaml` section)

2. **Deploy via Render Dashboard**
   - Go to [https://render.com](https://render.com)
   - Click **"New"** → **"Static Site"**
   - Connect your GitHub repository
   - Configure:
     - **Name**: `xiaoka-frontend`
     - **Root Directory**: `frontend`
     - **Build Command**: `npm run build`
     - **Publish Directory**: `build`

3. **Add Environment Variable**
   
   | Key | Value |
   |-----|-------|
   | `REACT_APP_WS_HOST` | `your-backend.onrender.com` |

4. **Deploy!**

---

## 📝 Environment Variable Setup

### Required Environment Variable

Your frontend needs to know where your backend is deployed:

```bash
REACT_APP_WS_HOST=your-backend-url.onrender.com
```

**Example:**
```bash
REACT_APP_WS_HOST=xiaoka-backend.onrender.com
```

⚠️ **Important:**
- Do NOT include `https://` or `wss://` 
- Do NOT include `/ws` path
- Just the hostname (and port if custom)

### How It Works

Your `useWebSocketConnection.js` automatically:
- Detects if running on HTTPS → uses `wss://`
- Detects if running on HTTP → uses `ws://`
- Appends `/ws` path automatically
- Falls back to same host if `REACT_APP_WS_HOST` not set

**Local Development:**
```javascript
// No env var needed for localhost
ws://localhost:8000/ws
```

**Production:**
```javascript
// With REACT_APP_WS_HOST=your-backend.onrender.com
wss://your-backend.onrender.com/ws
```

---

## 🧪 Testing Your Deployment

### 1. Check if frontend loads
Visit your deployed URL (e.g., `https://your-app.vercel.app`)

### 2. Open Browser Console (F12)
Look for WebSocket connection logs:
```
[WebSocket] Connecting to: wss://your-backend.onrender.com/ws
[WebSocket] Connected
```

### 3. Test Voice Interaction
- Click to enable microphone
- Say "Hello XiaoKa"
- Should receive AI response

### 4. Check Connection Status
Top-right corner should show:
- 🟢 **Connected** (green dot)

---

## 🔧 Troubleshooting

### Issue: WebSocket connection fails

**Solution 1:** Check environment variable
```bash
# In your deployment platform, verify:
REACT_APP_WS_HOST=your-backend.onrender.com
```

**Solution 2:** Check backend CORS settings
Your backend `main.py` should have:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Solution 3:** Check browser console
- F12 → Console tab
- Look for WebSocket connection errors
- Verify the URL being used

### Issue: "Mixed Content" error (HTTP/HTTPS)

**Cause:** Frontend on HTTPS trying to connect to HTTP backend

**Solution:** Ensure backend is also deployed on HTTPS (Render provides this automatically)

### Issue: Audio doesn't play

**Solution:** Enable microphone permissions and user interaction
- Browser requires user gesture before playing audio
- Click anywhere on the page first
- Check browser console for audio errors

---

## 🎯 Recommended Platform

**For this project, we recommend Vercel:**
- ✅ Fastest deployment (< 2 minutes)
- ✅ Automatic HTTPS
- ✅ Great React support
- ✅ Easy environment variable management
- ✅ Free tier is generous
- ✅ Automatic redeployment on git push

---

## 📱 Custom Domain (Optional)

### Vercel
1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

### Netlify
1. Go to Domain Settings → Add custom domain
2. Configure DNS records

---

## 🔄 Continuous Deployment

All three platforms support automatic redeployment:

**Vercel/Netlify:**
- Push to `main` branch → Auto-deploy
- Push to other branches → Preview deployments

**Render:**
- Push to `main` → Auto-deploy
- Can configure different branches

---

## 📊 Deployment Checklist

- [ ] Backend deployed to Render and working
- [ ] Backend URL noted (e.g., `xiaoka-backend.onrender.com`)
- [ ] Frontend code pushed to GitHub
- [ ] Environment variable `REACT_APP_WS_HOST` set correctly
- [ ] Deployment platform chosen (Vercel/Netlify/Render)
- [ ] Build settings configured correctly
- [ ] Deployment successful
- [ ] WebSocket connection working
- [ ] Audio playback working
- [ ] Microphone access working

---

## 🆘 Need Help?

Common commands:

```bash
# Test build locally before deploying
cd frontend
npm run build
npx serve -s build

# Check environment variables
echo $REACT_APP_WS_HOST

# View production build
ls -la build/
```

Your frontend is production-ready! 🚀

