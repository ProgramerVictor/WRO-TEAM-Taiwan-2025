# Quick Frontend Deployment (5 Minutes)

## 🚀 Deploy to Vercel (Fastest)

### 1. Get Your Backend URL
From your Render deployment, copy your backend URL:
```
Example: xiaoka-backend.onrender.com
```

### 2. Push to GitHub
```bash
git add .
git commit -m "Deploy frontend"
git push origin main
```

### 3. Deploy on Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click **"New Project"**
3. Import your GitHub repo
4. **Root Directory**: Select `frontend`
5. Click **"Deploy"**

### 4. Add Environment Variable
After deployment:
1. Go to Project Settings → Environment Variables
2. Add:
   ```
   Name:  REACT_APP_WS_HOST
   Value: your-backend.onrender.com
   ```
3. Click **"Redeploy"**

### 5. Done! 🎉
Visit your URL: `https://your-app.vercel.app`

---

## ✅ Quick Test

1. Open your deployed frontend URL
2. Press F12 → Console
3. Look for: `[WebSocket] Connected`
4. Click microphone button
5. Say "Hello XiaoKa"

**Working?** ✅ You're done!

**Not working?** Check:
- Backend URL is correct (no `https://` or `wss://`)
- Backend is running on Render
- Browser console for errors

---

## 📋 What You Need

- ✅ Backend deployed to Render
- ✅ Backend URL (e.g., `xiaoka-backend.onrender.com`)
- ✅ GitHub account
- ✅ Vercel/Netlify account (free)

---

## 🔗 Full Guide
See [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md) for detailed instructions.

