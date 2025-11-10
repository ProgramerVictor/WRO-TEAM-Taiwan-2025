# 🐛 Debug: Pose Detection → EV3 Connection Issue

## 🔍 The Problem

**Symptom:** `pc_publisher.py` (pose detection) can't send messages to `main.py` (EV3 robot)

**Expected Flow:**
```
Camera → pc_publisher.py → MQTT (robot/events) → EV3 main.py
```

---

## ✅ Checklist

### **1. Verify Both Are Using Cloud Broker**

**`pose_detection/pc_publisher.py` line 15:**
```python
USE_CLOUD_BROKER = True  # ✅ Should be True
```

**`ev3_movement/main.py` line 42:**
```python
USE_CLOUD_BROKER = True  # ✅ Should be True
```

**Both must be `True` to use EMQX Cloud!**

---

### **2. Verify Topics Match**

**Pose detection PUBLISHES to** (`pc_publisher.py` line 32):
```python
ONE_TOPIC = "robot/events"
```

**EV3 SUBSCRIBES to** (`main.py` line 59):
```python
TOPIC_IN = "robot/events"
```

**✅ Topics match!**

---

### **3. Verify Robot IDs Match**

**Pose detection targets** (`pc_publisher.py` line 36):
```python
TARGET_ROBOT_ID = "wro1"
```

**EV3 robot ID** (`main.py` line 63):
```python
ROBOT_ID = "wro1"
```

**✅ Robot IDs match!**

---

## 🧪 Test Each Component

### **Test 1: Is Pose Detection Connected to MQTT?**

**Run pose detection:**
```bash
cd pose_detection
python pc_publisher.py
```

**Expected output:**
```
Using paho-mqtt v2.0+ API
MQTT SSL/TLS enabled for cloud broker
Connecting to MQTT broker: i27312ff.ala.asia-southeast1.emqxsl.com:8883
Target Robot ID: wro1
✅ MQTT connected successfully!
```

**If you see:**
```
❌ MQTT connection error: [Errno 11001] getaddrinfo failed
```

**Problem:** Internet connection or DNS issue. Check WiFi.

---

### **Test 2: Is EV3 Connected to MQTT?**

**EV3 logs should show:**
```
MQTT SSL/TLS enabled for cloud broker
Connecting to MQTT broker: i27312ff.ala.asia-southeast1.emqxsl.com:8883
RX-MQTT connected rc= 0 broker= i27312ff.ala.asia-southeast1.emqxsl.com
TX-MQTT connected rc= 0 broker= i27312ff.ala.asia-southeast1.emqxsl.com
```

**If `rc != 0` (like `rc= 5`):**
- Authentication failed
- Check credentials match in both files

---

### **Test 3: Is Pose Detection Sending Messages?**

**When you wave at the camera, pose detection should print:**
```
PUB [wro1]: {"event":"wave","value":"R","robot_id":"wro1"}
```

**If you DON'T see this:**
- Pose detection isn't detecting your wave
- Try waving faster or more dramatically
- Check camera is working

---

### **Test 4: Is EV3 Receiving Messages?**

**EV3 logs should show:**
```
RX pos: center
RX pos: left
RX wave: R -> wro1
ALL_START = 1
```

**If you DON'T see this:**
- EV3 isn't receiving MQTT messages
- Check EV3 MQTT connection (Test 2)

---

## 🔧 Common Issues & Fixes

### **Issue 1: Pose Detection Can't Connect to MQTT**

**Error:**
```
❌ MQTT connection error: [Errno 11001] getaddrinfo failed
```

**Cause:** No internet connection or DNS issue

**Fix:**
1. Check WiFi is connected
2. Try pinging: `ping i27312ff.ala.asia-southeast1.emqxsl.com`
3. Check firewall isn't blocking port 8883

---

### **Issue 2: EV3 Can't Connect to MQTT**

**Error:**
```
RX-MQTT connected rc= 5 broker= ...
```

**Cause:** Authentication failed (rc=5 means "not authorized")

**Fix:**
1. Check `CLOUD_USERNAME = "wro-robot"` (exact match, no typos)
2. Check `CLOUD_PASSWORD = "V!cT0rl11"` (case-sensitive!)
3. Make sure both pose detection and EV3 use the **same credentials**

---

### **Issue 3: Messages Sent But Not Received**

**Symptoms:**
- Pose detection shows: `PUB [wro1]: {"event":"wave",...}`
- EV3 shows: Nothing (no RX messages)

**Possible causes:**
1. **Different MQTT brokers:**
   - Check both have `USE_CLOUD_BROKER = True`
   - Check both use same `CLOUD_BROKER` URL

2. **Different topics:**
   - Pose detection publishes to: `robot/events`
   - EV3 subscribes to: `robot/events`
   - Should match ✅

3. **Robot ID filtering:**
   - Pose detection sends: `robot_id = "wro1"`
   - EV3 expects: `robot_id = "wro1"`
   - Should match ✅

4. **EV3 not subscribed yet:**
   - Check EV3 logs for: `RX-MQTT subscribed: robot/events`

---

### **Issue 4: WiFi/Network Problems**

**Symptoms:**
- Connection works sometimes, fails other times
- Timeouts or disconnections

**Fix:**
1. Use stable WiFi network
2. Keep EV3 and PC close to WiFi router
3. Check no firewall blocking port 8883
4. Try local MQTT broker instead (see below)

---

## 🏠 Alternative: Use Local MQTT Broker

If cloud connection is unreliable, use local testing:

### **Step 1: Start Local MQTT Broker**

On your PC:
```bash
mosquitto -v
```

### **Step 2: Configure Pose Detection**

`pc_publisher.py` line 15:
```python
USE_CLOUD_BROKER = False  # ← Change to False
```

Line 24:
```python
LOCAL_BROKER = "192.168.1.3"  # ← Your PC's IP address
```

### **Step 3: Configure EV3**

`main.py` line 42:
```python
USE_CLOUD_BROKER = False  # ← Change to False
```

Line 51:
```python
LOCAL_BROKER = "192.168.1.3"  # ← Your PC's IP address (same as above)
```

### **Step 4: Test**

1. Start mosquitto on PC
2. Start pose detection: `python pc_publisher.py`
3. Start EV3 program
4. Wave at camera
5. EV3 should receive and respond

---

## 🎯 Detailed Testing Steps

### **Complete Test Flow:**

**1. Start Pose Detection:**
```bash
cd pose_detection
python pc_publisher.py
```

**Expected:**
```
Using paho-mqtt v2.0+ API
MQTT SSL/TLS enabled for cloud broker
Connecting to MQTT broker: i27312ff.ala.asia-southeast1.emqxsl.com:8883
Target Robot ID: wro1
✅ MQTT connected successfully!
PUB [wro1]: {"event":"pos","value":"center","robot_id":"wro1"}
```

**2. Start EV3 Program:**

**Expected EV3 logs:**
```
=== PROGRAM START ===
BROKER_IN = i27312ff.ala.asia-southeast1.emqxsl.com TOPIC_IN = robot/events
BROKER_NOTIFY = i27312ff.ala.asia-southeast1.emqxsl.com TOPIC = robot/notify
MQTT SSL/TLS enabled for cloud broker
Connecting to MQTT broker: i27312ff.ala.asia-southeast1.emqxsl.com:8883
RX-MQTT connected rc= 0 broker= i27312ff.ala.asia-southeast1.emqxsl.com
RX-MQTT subscribed: robot/events
TX-MQTT SSL/TLS enabled
TX-MQTT connecting to i27312ff.ala.asia-southeast1.emqxsl.com:8883
TX-MQTT connected rc= 0 broker= i27312ff.ala.asia-southeast1.emqxsl.com
ALL_START = 0
```

**3. Wave at Camera:**

**Pose detection should print:**
```
PUB [wro1]: {"event":"wave","value":"R","robot_id":"wro1"}
```

**EV3 should print:**
```
RX wave: R -> wro1
ALL_START = 1
```

**4. EV3 Should Start Greeting:**
```
(beep sound)
(head moves left for 4 seconds)
(head moves right for 3 seconds)
TX [hello]: {"action": "Say something...", "robot_id": "wro1"}
```

---

## 📊 Success Criteria

- [x] Pose detection prints: `✅ MQTT connected successfully!`
- [x] EV3 prints: `RX-MQTT connected rc= 0`
- [x] EV3 prints: `RX-MQTT subscribed: robot/events`
- [x] When you wave: Pose detection prints `PUB [wro1]: {"event":"wave"...}`
- [x] When you wave: EV3 prints `RX wave: R -> wro1`
- [x] When you wave: EV3 prints `ALL_START = 1`
- [x] EV3 starts greeting sequence (beep, head movements)

**If ALL checkboxes are checked:** ✅ Connection is working!

---

## 🆘 What to Share for Help

If still not working, please share:

1. **Pose detection output** (first 10 lines after starting)
2. **EV3 logs** (first 20 lines after starting program)
3. **What happens when you wave** (both pose detection and EV3 logs)
4. **Are `USE_CLOUD_BROKER` set to True in BOTH files?**
5. **Are the WiFi networks the same?** (PC and EV3 must be on same network or both have internet)

---

## 🔍 Quick Diagnosis

**Symptom:** Pose detection prints `PUB [wro1]: ...` but EV3 shows nothing

**Most likely cause:** EV3 not connected to MQTT

**Check:** EV3 logs for `RX-MQTT connected rc= 0`

---

**Symptom:** EV3 connects but never receives messages

**Most likely cause:** Different MQTT brokers or topics

**Check:**
- Both use `USE_CLOUD_BROKER = True`
- Both use same `CLOUD_BROKER` URL
- Pose detection publishes to `robot/events`
- EV3 subscribes to `robot/events`

---

**Symptom:** Both connected, messages sent, but EV3 ignores them

**Most likely cause:** Robot ID mismatch

**Check:**
- Pose detection: `TARGET_ROBOT_ID = "wro1"`
- EV3: `ROBOT_ID = "wro1"`
- Must match exactly!

