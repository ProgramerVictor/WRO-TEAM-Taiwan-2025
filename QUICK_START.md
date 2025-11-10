# Quick Start - WRO 2025 Project

## ⚡ **5-Minute Setup**

### **1. Choose Your Mode**

#### **Local Testing Mode (No Internet)**
```python
# ev3_movement/main.py - Line 42
USE_CLOUD_BROKER = False
LOCAL_BROKER = "YOUR_PC_IP"  # e.g., 192.168.1.3
ROBOT_ID = "wro1"

# pose_detection/pc_publisher.py - Line 15
USE_CLOUD_BROKER = False
LOCAL_BROKER = "YOUR_PC_IP"  # Same as above
TARGET_ROBOT_ID = "wro1"
```

**Requirements:**
- Run mosquitto broker on PC: `mosquitto -v`
- PC and EV3 on same network

---

#### **Competition Mode (Cloud + Backend)**
```python
# ev3_movement/main.py - Line 42
USE_CLOUD_BROKER = True
ROBOT_ID = "wro1"

# pose_detection/pc_publisher.py - Line 15
USE_CLOUD_BROKER = True
TARGET_ROBOT_ID = "wro1"
```

**Requirements:**
- Backend deployed to Render
- Internet connection for EV3 and PC

---

### **2. Run**

```bash
# PC: Start pose detection
python pose_detection/pc_publisher.py

# EV3: Upload and run
# (Use VS Code EV3 extension)
```

---

## 🔄 **Quick Mode Switch**

| Want to... | Change |
|------------|--------|
| Test locally | Set `USE_CLOUD_BROKER = False` everywhere |
| Use in competition | Set `USE_CLOUD_BROKER = True` everywhere |
| Control different robot | Change `TARGET_ROBOT_ID` in pose detection |
| Make robot ignore others | Set unique `ROBOT_ID` in EV3 code |

---

## 📝 **Configuration Summary**

### **EV3 Robot** (`ev3_movement/main.py`)
```python
USE_CLOUD_BROKER = False  # ← Change this
ROBOT_ID = "wro1"          # ← Change this for each robot
LOCAL_BROKER = "192.168.1.3"  # ← Your PC IP
```

### **Pose Detection** (`pose_detection/pc_publisher.py`)
```python
USE_CLOUD_BROKER = False     # ← Change this
TARGET_ROBOT_ID = "wro1"     # ← Which robot to control
LOCAL_BROKER = "192.168.1.3" # ← Your PC IP
```

### **Backend** (Render Environment Variables)
```
DEFAULT_ROBOT_ID=wro1
```

---

## 🧪 **Quick Test**

### **Local Mode:**
1. Start mosquitto: `mosquitto -v`
2. Run pose detection: `python pose_detection/pc_publisher.py`
3. Wave at camera → EV3 should respond

### **Cloud Mode:**
1. Run pose detection: `python pose_detection/pc_publisher.py`
2. Say "yes im ready" to frontend
3. Backend → EMQX → EV3 → Coffee action

---

## 📱 **Backend URL**
```
https://wro-6dh5.onrender.com
```

### **Test Endpoints:**
```bash
# Check health
curl https://wro-6dh5.onrender.com/health

# Check robot config
curl https://wro-6dh5.onrender.com/robot

# Set default robot
curl -X POST https://wro-6dh5.onrender.com/robot \
  -H "Content-Type: application/json" \
  -d '{"robot_id": "wro2"}'
```

---

## 🔍 **Debug Commands**

```bash
# Watch MQTT messages (local)
mosquitto_sub -h localhost -t "robot/#" -v

# Watch MQTT messages (cloud)
mosquitto_sub -h i27312ff.ala.asia-southeast1.emqxsl.com \
  -p 8883 --capath /etc/ssl/certs \
  -u wro-robot -P "V!cT0rl11" \
  -t "robot/events" -v
```

---

## ⚠️ **Common Mistakes**

1. ❌ **Different brokers** → EV3 uses cloud, pose uses local
   - ✅ **Fix:** Set same `USE_CLOUD_BROKER` everywhere

2. ❌ **Wrong robot_id** → Robot ignores messages
   - ✅ **Fix:** Match `ROBOT_ID` and `TARGET_ROBOT_ID`

3. ❌ **No local broker** → "Connection refused" error
   - ✅ **Fix:** Run `mosquitto -v` on PC

4. ❌ **Wrong PC IP** → EV3 can't connect
   - ✅ **Fix:** Use `ipconfig` (Windows) or `ifconfig` (Linux/Mac)

---

## 🎯 **Robot IDs**

| Robot | ID | Purpose |
|-------|-----|---------|
| Competition Robot 1 | `wro1` | Main competition |
| Competition Robot 2 | `wro2` | Backup/team 2 |
| Lab Robot | `lab1` | Testing/development |
| Demo Robot | `demo1` | Demonstrations |

---

**Ready to test? Change modes and go! 🚀**

