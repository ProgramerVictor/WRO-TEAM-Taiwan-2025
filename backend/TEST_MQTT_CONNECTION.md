# 🧪 Test MQTT Connection on Render

## 🚨 Problem

Your backend logs show WebSocket connections but **NO MQTT logs**. This means the backend is NOT connected to MQTT, so it can't receive messages from the EV3 robot.

---

## ✅ Quick Tests

### **Test 1: Check Full Startup Logs**

1. Go to Render Dashboard → Your service → Logs
2. Scroll to the **very top** (or restart the service)
3. Look for these lines at startup:

**Expected (GOOD):**
```
[MQTT] Initializing connection to i27312ff.ala.asia-southeast1.emqxsl.com:8883
[MQTT] Using authentication - Username: wro-robot
[MQTT] SSL/TLS enabled for secure connection
[MQTT] Attempting to connect...
[MQTT] Connection loop started for i27312ff.ala.asia-southeast1.emqxsl.com:8883
[MQTT] Waiting for on_connect callback...
[MQTT] on_connect callback - rc=0
[MQTT] ✅ Connected to i27312ff.ala.asia-southeast1.emqxsl.com:8883 successfully!
[MQTT] Subscribed to: robot/notify (qos=0)
```

**If you see (BAD):**
```
[MQTT] ❌ Connection failed: ...
[MQTT] Check MQTT_USERNAME and MQTT_PASSWORD in environment variables
```

---

### **Test 2: Check MQTT Status via API**

```bash
curl https://wro-6dh5.onrender.com/status
```

**Expected:**
```json
{
  "status": "healthy",
  "mqtt_connected": true,
  "broker": "i27312ff.ala.asia-southeast1.emqxsl.com",
  "default_robot_id": "wro1"
}
```

**If `mqtt_connected: false`:**
- Backend is NOT connected to MQTT ❌
- Need to check environment variables

---

### **Test 3: Verify Environment Variables**

Go to Render Dashboard → Your service → Environment

**Required variables:**
```
MQTT_BROKER=i27312ff.ala.asia-southeast1.emqxsl.com
MQTT_PORT=8883
MQTT_USERNAME=wro-robot
MQTT_PASSWORD=V!cT0rl11
MQTT_USE_SSL=true
```

**If any are missing:**
1. Add them
2. Restart the service (Render will auto-restart)
3. Check logs for MQTT connection messages

---

### **Test 4: Manually Restart Service**

1. Go to Render Dashboard → Your service
2. Click "Manual Deploy" → "Clear build cache & deploy"
3. Wait for deployment to complete
4. Watch the logs for MQTT connection messages

---

### **Test 5: Send Test MQTT Message**

Once MQTT is connected, test with:

```bash
curl -X POST https://wro-6dh5.onrender.com/test/distance \
  -H "Content-Type: application/json" \
  -d '{
    "distance_cm": 5,
    "robot_id": "wro1",
    "publish_mqtt": false
  }'
```

**Backend logs should show:**
```
[MQTT->AI] ✅ Processing message for robot_id 'wro1' - 2 matching connection(s)
```

**If you see:**
```
[MQTT->AI] ⏭️  Skipping message for robot_id 'wro1' - no matching WebSocket connections
```

This means MQTT is working, but frontend is not connected with that robot_id.

---

## 🔍 Common Issues

### **Issue 1: MQTT Logs Not Appearing**

**Cause:** Render might be filtering logs, or logs are from before your viewing window

**Fix:**
1. Restart service
2. Watch logs from the beginning
3. Look for `[MQTT]` prefixed messages

---

### **Issue 2: `mqtt_connected: false`**

**Cause:** MQTT connection failed

**Possible reasons:**
1. Missing environment variables
2. Wrong credentials
3. Firewall blocking port 8883
4. SSL/TLS certificate issues

**Fix:**
1. Check all environment variables are set correctly
2. Verify credentials: `wro-robot` / `V!cT0rl11`
3. Ensure `MQTT_USE_SSL=true` is set
4. Restart service

---

### **Issue 3: `rc=4` or `rc=5` in logs**

**Cause:** Authentication failure

**Error messages:**
- `rc=4`: Bad username or password
- `rc=5`: Not authorized

**Fix:**
1. Double-check credentials in Render environment:
   - `MQTT_USERNAME=wro-robot` (no spaces!)
   - `MQTT_PASSWORD=V!cT0rl11` (case-sensitive!)
2. Restart service

---

### **Issue 4: `rc=3` in logs**

**Cause:** MQTT broker unavailable

**Fix:**
1. Check broker URL: `i27312ff.ala.asia-southeast1.emqxsl.com`
2. Verify port: `8883` (not 1883)
3. Check if EMQX Cloud is running
4. Try pinging the broker

---

## 🎯 Step-by-Step Diagnosis

### **Step 1: Check Environment Variables**

Go to Render → Environment tab

**Verify these exist:**
- [x] `OPENAI_API_KEY`
- [x] `MQTT_BROKER`
- [x] `MQTT_PORT=8883`
- [x] `MQTT_USERNAME=wro-robot`
- [x] `MQTT_PASSWORD=V!cT0rl11`
- [x] `MQTT_USE_SSL=true`
- [x] `DEFAULT_ROBOT_ID=wro1`

---

### **Step 2: Restart and Watch Logs**

1. Click "Manual Deploy" → "Clear build cache & deploy"
2. Wait for "Deploy succeeded"
3. Go to Logs tab
4. Look for MQTT connection messages (should appear within 5-10 seconds of startup)

---

### **Step 3: Check MQTT Status**

```bash
curl https://wro-6dh5.onrender.com/status
```

**If `mqtt_connected: false`:**
- Go back to logs
- Look for `[MQTT] ❌` error messages
- Check what `rc=` code you got

---

### **Step 4: Test Message Handling**

```bash
# Test with frontend connected (2 WebSockets in your logs)
curl -X POST https://wro-6dh5.onrender.com/test/distance \
  -H "Content-Type: application/json" \
  -d '{"distance_cm": 5, "robot_id": "wro1", "publish_mqtt": false}'
```

**Check logs:**
- Should see: `[MQTT->AI] ✅ Processing message for robot_id 'wro1' - 2 matching connection(s)`

---

## 🚀 Quick Fix Script

**If everything else fails, try this:**

1. **Delete ALL environment variables**
2. **Add them back one by one:**

```bash
# In Render Environment tab:
OPENAI_API_KEY=your-key-here
MQTT_BROKER=i27312ff.ala.asia-southeast1.emqxsl.com
MQTT_PORT=8883
MQTT_USERNAME=wro-robot
MQTT_PASSWORD=V!cT0rl11
MQTT_USE_SSL=true
DEFAULT_ROBOT_ID=wro1
```

3. **Save**
4. **Render will auto-restart**
5. **Watch logs for MQTT connection**

---

## 📊 Expected Log Flow

**Startup (first 10 seconds):**
```
Building...
Starting service...
INFO:     Started server process [1]
INFO:     Waiting for application startup.
[MQTT] Initializing connection to i27312ff.ala.asia-southeast1.emqxsl.com:8883
[MQTT] Using authentication - Username: wro-robot
[MQTT] SSL/TLS enabled for secure connection
[MQTT] Attempting to connect...
[MQTT] Connection loop started
[MQTT] Waiting for on_connect callback...
INFO:     Application startup complete.
[MQTT] on_connect callback - rc=0
[MQTT] ✅ Connected to i27312ff.ala.asia-southeast1.emqxsl.com:8883 successfully!
[MQTT] Subscribed to: robot/notify (qos=0)
```

**When EV3 sends message:**
```
[MQTT->AI] ✅ Processing message for robot_id 'wro1' - 2 matching connection(s)
[MQTT->AI] Published reply -> robot/reply: {...}
```

---

## ✅ Success Criteria

- [ ] Logs show `[MQTT] ✅ Connected to ... successfully!`
- [ ] Logs show `[MQTT] Subscribed to: robot/notify (qos=0)`
- [ ] `/status` API returns `mqtt_connected: true`
- [ ] `/test/distance` triggers message processing
- [ ] EV3 messages appear in logs with `[MQTT->AI]`

**When all checked:** Backend is ready to receive EV3 messages! 🎉

---

## 🆘 If Still Not Working

Share these with me:

1. **Full startup logs** (first 50 lines after deploy)
2. **Output of:** `curl https://wro-6dh5.onrender.com/status`
3. **Screenshot of Render environment variables** (hide API keys)
4. **Any `[MQTT]` logs** you can find

I'll help debug! 🔍

