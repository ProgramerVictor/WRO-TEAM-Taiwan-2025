# Deployment Guide for Render

## 🚀 Quick Deploy to Render

### Method 1: Using Render Dashboard (Recommended)

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for Render deployment"
   git push origin main
   ```

2. **Create a new Web Service on Render**
   - Go to [https://render.com](https://render.com)
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Select the `backend` directory as the root

3. **Configure the service**
   - **Name**: `xiaoka-backend` (or your choice)
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: `backend` (if repo root is parent)
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

4. **Add Environment Variables**
   Go to "Environment" tab and add:
   ```
   OPENAI_API_KEY=your_openai_key_here
   OPENAI_MODEL=gpt-4.1-nano
   MQTT_BROKER=i27312ff.ala.asia-southeast1.emqxsl.com
   MQTT_PORT=8883
   MQTT_USERNAME=wro-robot
   MQTT_PASSWORD=V!cT0rl11
   MQTT_USE_SSL=true
   MQTT_PUB_TOPIC=robot/events
   MQTT_REPLY_TOPIC=robot/reply
   ```

5. **Deploy!**
   - Click "Create Web Service"
   - Wait 2-5 minutes for deployment
   - Your API will be available at: `https://your-service-name.onrender.com`

---

### Method 2: Using render.yaml (Infrastructure as Code)

1. **Use the provided render.yaml**
   The `render.yaml` file is already configured in your backend directory.

2. **Deploy via Render Blueprint**
   - Go to Render Dashboard
   - Click "New" → "Blueprint"
   - Connect your repository
   - Render will auto-detect `render.yaml`

3. **Set your OPENAI_API_KEY**
   - After creation, go to service settings
   - Add `OPENAI_API_KEY` in Environment Variables

---

## 🔧 What Was Changed for Deployment

### Removed:
- ❌ Windows-specific FFmpeg paths (`C:\\ffmpeg\\bin\\`)
- ❌ pydub/AudioSegment dependencies (not used)
- ❌ apply_voice_effects function (disabled for speed)
- ❌ Unused dependencies (SQLAlchemy, pymysql, google-genai)

### Added:
- ✅ PORT configuration from environment variable
- ✅ `host="0.0.0.0"` binding (required for Render)
- ✅ Production-ready requirements.txt with versions
- ✅ Main entry point with uvicorn
- ✅ render.yaml for easy deployment
- ✅ start.sh script

### Kept:
- ✅ Memory-based TTS (BytesIO) - no file I/O
- ✅ All MQTT functionality
- ✅ WebSocket support
- ✅ AI conversation logic
- ✅ All API endpoints

---

## 📝 Environment Variables Required

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` | Your OpenAI API key | `sk-...` |
| `OPENAI_MODEL` | Model to use | `gpt-4.1-nano` |
| `MQTT_BROKER` | MQTT broker hostname | `i27312ff.ala.asia-southeast1.emqxsl.com` |
| `MQTT_PORT` | MQTT broker port (8883 for SSL) | `8883` |
| `MQTT_USERNAME` | MQTT username (optional) | `wro-robot` |
| `MQTT_PASSWORD` | MQTT password (optional) | `V!cT0rl11` |
| `MQTT_USE_SSL` | Enable SSL/TLS (true for port 8883) | `true` |
| `MQTT_PUB_TOPIC` | Topic for publishing | `robot/events` |
| `MQTT_REPLY_TOPIC` | Topic for replies | `robot/reply` |
| `PORT` | Server port (auto-set by Render) | `8000` |

---

## 🧪 Testing Your Deployment

### 1. Health Check
```bash
curl https://your-service.onrender.com/mqtt/broker
```

Expected response:
```json
{"broker": "broker.emqx.io"}
```

### 2. Test Language Detection
```bash
curl -X POST https://your-service.onrender.com/test/language \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world"}'
```

### 3. WebSocket Test
Use your frontend or a WebSocket client to connect to:
```
wss://your-service.onrender.com/ws
```

---

## 🐛 Troubleshooting

### Build Fails
**Problem**: Dependencies won't install
**Solution**: Check requirements.txt has proper versions

### Server Won't Start
**Problem**: Port binding issues
**Solution**: Ensure `host="0.0.0.0"` and `port=$PORT` are set

### OPENAI_API_KEY Error
**Problem**: "OPENAI_API_KEY not found"
**Solution**: Add environment variable in Render dashboard

### MQTT Connection Issues
**Problem**: Can't connect to MQTT broker
**Solution**: 
- Check MQTT_BROKER environment variable
- Verify broker is accessible from Render servers
- Try alternative broker: `test.mosquitto.org`

### Slow Response Times
**Problem**: API is slow
**Solution**: 
- Free tier has limited resources
- Upgrade to Starter plan for better performance
- Check PERFORMANCE_OPTIMIZATION.md

---

## 💰 Pricing

- **Free Tier**: 
  - 750 hours/month
  - Spins down after 15 min inactivity
  - Spins up in ~30 seconds
  - Good for testing

- **Starter ($7/month)**:
  - Always on
  - Better performance
  - Recommended for production

---

## 🔄 Updating Your Deployment

### Option 1: Auto-Deploy (Recommended)
- Enable "Auto-Deploy" in Render settings
- Every push to `main` branch auto-deploys

### Option 2: Manual Deploy
- Go to Render Dashboard
- Click "Manual Deploy" → "Deploy latest commit"

---

## 📊 Monitoring

### View Logs
1. Go to Render Dashboard
2. Select your service
3. Click "Logs" tab
4. See real-time logs

### Check Metrics
- CPU usage
- Memory usage
- Response times
- Error rates

All available in Render Dashboard

---

## 🎯 Frontend Configuration

After deployment, update your frontend to use the new backend URL:

```javascript
// In your frontend config
const BACKEND_URL = "https://your-service.onrender.com";
const WS_URL = "wss://your-service.onrender.com/ws";
```

---

## ✅ Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] render.yaml configured
- [ ] Requirements.txt updated
- [ ] Environment variables set in Render
- [ ] Service deployed successfully
- [ ] Health check passing
- [ ] WebSocket connection works
- [ ] MQTT connection established
- [ ] Frontend updated with new URLs
- [ ] Test conversation with AI
- [ ] Test TTS audio playback

---

## 🆘 Need Help?

- Render Documentation: https://render.com/docs
- Render Community: https://community.render.com
- Check logs for error messages
- Review PERFORMANCE_OPTIMIZATION.md for speed issues

---

**Deployment prepared**: November 2025
**Last tested**: Render Free Tier
**Estimated deploy time**: 2-5 minutes

