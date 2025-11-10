# Complete System Setup Guide

Your WRO 2025 project has been configured for seamless integration! Here's how to set everything up.

---

## 🏗️ **System Architecture**

```
[Frontend (Vercel)]
       ↓ wss://
[Backend (Render)] ← WebSocket
       ↓ MQTT (SSL/TLS)
[EMQX Cloud Broker]
       ↓ MQTT
[EV3 Robot] ← robot_id filtering
[PC Pose Detection] → robot_id targeting
```

---

## 📋 **What Changed**

### 1. **Backend (`backend/main.py`)**
- ✅ Added `robot_id` to all MQTT messages
- ✅ WebSocket can set target robot per connection
- ✅ API endpoints for robot management
- ✅ MQTT authentication & SSL/TLS support
- ✅ Comprehensive debugging logs

### 2. **EV3 Robot (`ev3_movement/main.py`)**
- ✅ Robot ID configuration (`ROBOT_ID = "wro1"`)
- ✅ Message filtering by `robot_id`
- ✅ Cloud broker support (EMQX) with SSL/TLS
- ✅ Local broker support for testing
- ✅ Easy mode switching (`USE_CLOUD_BROKER`)

### 3. **Pose Detection (`pose_detection/pc_publisher.py`)**
- ✅ Target robot configuration (`TARGET_ROBOT_ID = "wro1"`)
- ✅ Includes `robot_id` in published messages
- ✅ Cloud broker support with SSL/TLS
- ✅ Local broker support for testing

---

## 🚀 **Setup Steps**

### **Step 1: Backend Deployment**

1. **Push your backend code:**
   ```bash
   git add backend/
   git commit -m "Add robot targeting and cloud MQTT support"
   git push
   ```

2. **Set environment variables on Render:**
   Go to Dashboard → wro-6dh5 → Environment:
   
   ```
   OPENAI_API_KEY=sk-your-key-here
   MQTT_BROKER=i27312ff.ala.asia-southeast1.emqxsl.com
   MQTT_PORT=8883
   MQTT_USERNAME=wro-robot
   MQTT_PASSWORD=V!cT0rl11
   MQTT_USE_SSL=true
   DEFAULT_ROBOT_ID=wro1
   ```

3. **Wait for deployment** (2-3 minutes)

4. **Test backend:**
   ```bash
   curl https://wro-6dh5.onrender.com/robot
   ```

---

### **Step 2: Configure Your EV3 Robot**

1. **Edit `ev3_movement/main.py`:**

   ```python
   # Line 42: Choose your mode
   USE_CLOUD_BROKER = False  # True for competition, False for local testing
   
   # Line 51: Set your local PC IP (for testing)
   LOCAL_BROKER = "192.168.1.3"  # Your PC's IP address
   
   # Line 63: Set robot ID
   ROBOT_ID = "wro1"  # Change to "wro2", "lab1", etc. for different robots
   ```

2. **Upload to EV3:**
   - Use VS Code EV3 extension
   - Or copy via SSH/USB

---

### **Step 3: Configure Pose Detection**

1. **Edit `pose_detection/pc_publisher.py`:**

   ```python
   # Line 15: Choose your mode
   USE_CLOUD_BROKER = False  # True for competition, False for local testing
   
   # Line 24: Set your PC IP (for local testing)
   LOCAL_BROKER = "192.168.1.3"  # Should match robot's LOCAL_BROKER
   
   # Line 36: Set target robot
   TARGET_ROBOT_ID = "wro1"  # Which robot should respond
   ```

2. **Run on your PC:**
   ```bash
   python pose_detection/pc_publisher.py
   ```

---

### **Step 4: Deploy Frontend (Optional)**

1. **Go to [vercel.com](https://vercel.com)**
2. **Import your repository**
3. **Set Root Directory:** `frontend`
4. **Add environment variable:**
   ```
   REACT_APP_WS_HOST=wro-6dh5.onrender.com
   ```
5. **Deploy!**

---

## 🧪 **Testing Modes**

### **Mode 1: Local Testing (No Internet Required)**

**Setup:**
1. **Run local MQTT broker** on your PC:
   ```bash
   # Install mosquitto (Windows/Mac/Linux)
   # Windows: https://mosquitto.org/download/
   # Mac: brew install mosquitto
   # Linux: sudo apt install mosquitto
   
   mosquitto -v  # Start broker
   ```

2. **Configure all components:**
   - `ev3_movement/main.py`: `USE_CLOUD_BROKER = False`
   - `pose_detection/pc_publisher.py`: `USE_CLOUD_BROKER = False`
   - Set `LOCAL_BROKER` to your PC's IP (e.g., `192.168.1.3`)

3. **Run:**
   ```bash
   # Terminal 1: Pose detection
   python pose_detection/pc_publisher.py
   
   # Terminal 2: Check messages (optional)
   mosquitto_sub -h localhost -t "robot/events" -v
   ```

4. **Upload and run EV3 code**

**Message flow:**
```
Pose Detection → Local Broker → EV3 Robot
```

---

### **Mode 2: Cloud Testing (EMQX + Backend)**

**Setup:**
1. **Configure all components:**
   - `ev3_movement/main.py`: `USE_CLOUD_BROKER = True`
   - `pose_detection/pc_publisher.py`: `USE_CLOUD_BROKER = True`
   - Backend: Already configured on Render

2. **Run:**
   ```bash
   # On PC: Pose detection
   python pose_detection/pc_publisher.py
   
   # EV3: Run robot code
   ```

3. **Test via frontend or WebSocket:**
   - Say "yes im ready" to trigger coffee command
   - Backend publishes to EMQX Cloud
   - EV3 receives and executes

**Message flow:**
```
Frontend → Backend (Render) → EMQX Cloud → EV3 Robot
Pose Detection → EMQX Cloud → EV3 Robot
```

---

## 🤖 **Multi-Robot Setup**

### **Robot 1 (wro1)**
```python
# ev3_movement/main.py
ROBOT_ID = "wro1"
```

### **Robot 2 (lab1)**
```python
# ev3_movement/main.py
ROBOT_ID = "lab1"
```

### **Pose Detection (Control Robot 1)**
```python
# pose_detection/pc_publisher.py
TARGET_ROBOT_ID = "wro1"  # Only wro1 will respond
```

### **Frontend (Control Robot 2)**
```javascript
// Send via WebSocket
ws.send(JSON.stringify({
  type: "set_robot_id",
  robot_id: "lab1"
}));

// Say "yes im ready"
// → Only lab1 will receive coffee command
```

---

## 📊 **Message Format**

All MQTT messages now include `robot_id`:

```json
{
  "event": "pos",
  "value": "center",
  "robot_id": "wro1"
}
```

```json
{
  "event": "wave",
  "value": "R",
  "robot_id": "wro1"
}
```

```json
{
  "event": "coffee",
  "value": "start",
  "robot_id": "wro1",
  "ts": "abc123..."
}
```

---

## 🔍 **Debugging**

### **Check MQTT Messages (Local)**
```bash
# Subscribe to all messages
mosquitto_sub -h localhost -t "robot/#" -v

# Or on cloud (requires auth)
mosquitto_sub -h i27312ff.ala.asia-southeast1.emqxsl.com \
  -p 8883 --capath /etc/ssl/certs \
  -u wro-robot -P "V!cT0rl11" \
  -t "robot/events" -v
```

### **Check Backend Logs**
Render Dashboard → Logs → Look for:
```
[MQTT] Publishing: {"event":"coffee","value":"start","robot_id":"wro1",...}
[Backend] ✅ Published EVENT to robot/events: coffee/start for robot wro1
```

### **Check EV3 Logs**
Look for:
```
RX pos: center
[IGNORE] Message for robot 'lab1', I am 'wro1'
[wro1] RX coffee start command!
```

---

## ⚠️ **Common Issues**

### **Issue 1: Robot not receiving messages**

**Check:**
1. Robot and pose detection use same broker
2. Robot `ROBOT_ID` matches `TARGET_ROBOT_ID` in pose detection
3. MQTT broker is running (local mode) or credentials are correct (cloud mode)

### **Issue 2: SSL/TLS errors on EV3**

**Solution:**
```python
# Try without cert verification (less secure, testing only)
client_in.tls_set(cert_reqs=ssl.CERT_NONE)
```

### **Issue 3: Multiple robots responding**

**Check:**
- Each robot has unique `ROBOT_ID`
- Messages include correct `robot_id` field
- Robot filtering logic is active

---

## 📁 **Quick Reference**

| Component | Config File | Key Settings |
|-----------|-------------|--------------|
| Backend | `backend/main.py` | DEFAULT_ROBOT_ID |
| EV3 Robot | `ev3_movement/main.py` | ROBOT_ID, USE_CLOUD_BROKER |
| Pose Detection | `pose_detection/pc_publisher.py` | TARGET_ROBOT_ID, USE_CLOUD_BROKER |
| Frontend | Environment Variables | REACT_APP_WS_HOST |

---

## ✅ **Deployment Checklist**

- [ ] Backend deployed to Render with environment variables
- [ ] Frontend deployed to Vercel (optional)
- [ ] EV3 code uploaded with correct `ROBOT_ID`
- [ ] Pose detection configured with correct `TARGET_ROBOT_ID`
- [ ] All components use same broker (local or cloud)
- [ ] Tested end-to-end: Pose → MQTT → Robot → Action
- [ ] Tested voice: Frontend → Backend → MQTT → Robot

---

**Your system is ready! Start with local testing, then switch to cloud mode for competition! 🚀🤖**

