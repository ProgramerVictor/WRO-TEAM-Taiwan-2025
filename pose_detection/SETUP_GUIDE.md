# 📸 Pose Detection Setup Guide

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
cd pose_detection
pip install opencv-python mediapipe paho-mqtt numpy
```

### Step 2: Configure Your Setup

Edit `pc_publisher.py` lines 14-36:

#### **For Local Testing (Cable Demo):**

```python
USE_CLOUD_BROKER = False  # ← Keep False for local
LOCAL_BROKER = "192.168.1.3"  # ← Change to YOUR PC IP
LOCAL_PORT = 1883

TARGET_ROBOT_ID = "wro1"  # ← Match your EV3 robot ID
```

#### **For Competition/Cloud:**

```python
USE_CLOUD_BROKER = True  # ← Change to True
CLOUD_BROKER = "i27312ff.ala.asia-southeast1.emqxsl.com"
CLOUD_PORT = 8883

TARGET_ROBOT_ID = "wro1"  # ← Match your EV3 robot ID
```

### Step 3: Run

```bash
python pc_publisher.py
```

## 📊 Expected Output

```
Using paho-mqtt v2.0+ API
Connecting to MQTT broker: 192.168.1.3:1883
Target Robot ID: wro1
✅ MQTT connected successfully!
PUB [wro1]: {"event":"pos","value":"center","robot_id":"wro1"}
PUB [wro1]: {"event":"pos","value":"left","robot_id":"wro1"}
PUB [wro1]: {"event":"wave","value":"R","robot_id":"wro1"}
```

## 🎯 What It Does

### Position Detection (Continuous)
- **Left/Center/Right** - Tracks person's hip position
- Sends updates every 0.5 seconds
- Payload: `{"event":"pos","value":"left/center/right","robot_id":"wro1"}`

### Wave Detection (On Event)
- **Right/Left hand wave** - Detects hand waving above shoulder
- Sends only when wave detected (with cooldown)
- Payload: `{"event":"wave","value":"R","robot_id":"wro1"}`

## 🔧 Troubleshooting

### Issue: "TypeError: Client() missing 1 required positional argument"

**Cause:** You have paho-mqtt v2.0+ installed, which changed the API.

**Solution:** Already fixed! The code now handles both v1.x and v2.0+ automatically.

### Issue: Camera not opening

**Try:**
```python
# Change line 91 in pc_publisher.py from:
cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)

# To:
cap = cv2.VideoCapture(0)
```

### Issue: MQTT connection fails (local)

**Check:**
1. Local MQTT broker (Mosquitto) is running
2. Your PC IP is correct in `LOCAL_BROKER`
3. Firewall allows port 1883

**Test connection:**
```bash
# On PC (where Mosquitto is running):
mosquitto_sub -h 192.168.1.3 -t robot/events -v
```

### Issue: MQTT connection fails (cloud)

**Check:**
1. Internet connection is working
2. Credentials are correct:
   - `CLOUD_BROKER = "i27312ff.ala.asia-southeast1.emqxsl.com"`
   - `CLOUD_PORT = 8883`
   - `CLOUD_USERNAME = "wro-robot"`
   - `CLOUD_PASSWORD = "V!cT0rl11"`

## 📝 Configuration Options

### Detection Sensitivity

Edit these parameters in `pc_publisher.py`:

```python
# Line 78-79: Wave detection sensitivity
DX_L = 0.05  # Left hand (smaller = more sensitive)
DX_R = 0.05  # Right hand (smaller = more sensitive)

# Line 84-85: Timing
DT = 0.7       # Wave must complete within 0.7 seconds
COOLDOWN = 1.5 # Minimum 1.5 seconds between waves

# Line 88: Position update rate
POS_HEARTBEAT = 0.5  # Send position every 0.5 seconds
```

### Center Band Adjustment

```python
# Lines 78-79: Define what counts as "center"
CENTER_LEFT_RATIO, CENTER_RIGHT_RATIO = 0.40, 0.50
# Current: center is 40%-50% of screen width
# Narrower band: 0.45, 0.55 (stricter)
# Wider band: 0.35, 0.65 (more lenient)
```

## 🧪 Testing Workflow

### 1. **Local Testing** (Cable/Offline Demo)

```bash
# Terminal 1: Start local MQTT broker
mosquitto -v

# Terminal 2: Run pose detection
cd pose_detection
python pc_publisher.py

# Terminal 3: Monitor MQTT messages
mosquitto_sub -h 192.168.1.3 -t robot/events -v

# Terminal 4: Start EV3 program
# (On EV3, make sure USE_CLOUD_BROKER = False)
```

### 2. **Cloud Testing** (Competition)

```bash
# 1. Set USE_CLOUD_BROKER = True in pc_publisher.py
# 2. Set USE_CLOUD_BROKER = True in EV3 main.py
# 3. Run pose detection:
python pc_publisher.py

# 4. Start EV3 program
# 5. Open frontend (Vercel): https://your-app.vercel.app
# 6. Set Robot ID in settings to "wro1"
# 7. Wave at camera → robot should respond
```

## 📊 Message Format

All messages now include `robot_id` for proper filtering:

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

## 🎯 Integration with Full System

### Message Flow:

```
Camera → pc_publisher.py → MQTT Broker → EV3 Robot
                                ↓
                         Backend (Render)
                                ↓
                         Frontend (Vercel)
```

### Robot ID Filtering:

- **pc_publisher.py**: Sets `TARGET_ROBOT_ID = "wro1"` (which robot to control)
- **EV3 main.py**: Sets `ROBOT_ID = "wro1"` (this robot's identity)
- **Frontend**: User selects Robot ID "wro1" in settings
- **Backend**: Routes messages only to matching WebSocket connections

## 🎉 You're Ready!

✅ Pose detection sends messages with `robot_id`  
✅ Compatible with paho-mqtt v1.x and v2.0+  
✅ Works in both local and cloud modes  
✅ Full multi-robot support  

**Next:** Test with your EV3 robot! 🤖

