# 🚀 Quick Deploy Guide

## 🐳 Option A: Docker (Local Testing - 2 minutes)

```bash
# Create .env file with your OPENAI_API_KEY
echo "OPENAI_API_KEY=sk-your-key" > .env

# Start with Docker Compose
docker-compose up -d

# Test it
curl http://localhost:8000/mqtt/broker
```

See `DOCKER_GUIDE.md` for full Docker documentation.

---

## ☁️ Option B: Deploy to Render (Production - 5 minutes)

### Step 1: Push to GitHub (2 minutes)

```bash
cd backend
git add .
git commit -m "Ready for Render deployment"
git push origin main
```

## Step 2: Create Render Service (2 minutes)

1. Go to **https://render.com** and sign in
2. Click **"New +"** → **"Web Service"**
3. Click **"Connect GitHub"** → Select your repository
4. Fill in:
   - **Name**: `xiaoka-backend`
   - **Root Directory**: `backend` (if not already in backend folder)
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Select **Free**

## Step 3: Add Environment Variables (1 minute)

Click **"Environment"** tab and add:

| Key | Value |
|-----|-------|
| `OPENAI_API_KEY` | Your OpenAI key (sk-...) |
| `OPENAI_MODEL` | `gpt-4.1-nano` |

Optional (already have defaults):
- `MQTT_BROKER`: `broker.emqx.io`
- `MQTT_PORT`: `1883`

## Step 4: Deploy! (30 seconds)

Click **"Create Web Service"**

Wait 2-5 minutes for build and deployment.

## Step 5: Test Your API (30 seconds)

Your backend URL: `https://xiaoka-backend.onrender.com`

Test it:
```bash
curl https://xiaoka-backend.onrender.com/mqtt/broker
```

Should return:
```json
{"broker":"broker.emqx.io"}
```

## ✅ Done!

Update your frontend with the new URL:
```javascript
const BACKEND_URL = "https://xiaoka-backend.onrender.com";
```

---

## 🎯 Quick Troubleshooting

**Build failed?**
- Check requirements.txt exists
- Verify Python version compatibility

**Can't connect?**
- Wait 30 seconds for cold start (free tier)
- Check logs in Render dashboard

**API key error?**
- Verify OPENAI_API_KEY in Environment tab
- Redeploy after adding variables

---

## 📚 More Help?

- Full guide: `DEPLOYMENT_GUIDE.md`
- Changes made: `RENDER_DEPLOYMENT_CHANGES.md`
- Performance: `PERFORMANCE_OPTIMIZATION.md`

---

**Total time**: ~5 minutes  
**Cost**: Free (with limitations) or $7/month for Starter

