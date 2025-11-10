# Robot ID Testing Guide

## Overview

This guide shows you how to test robot_id filtering using the `/test/distance` endpoint. You can simulate distance sensor events for different robots and verify that only the correct robot responds.

## Updated `/test/distance` Endpoint

The endpoint now supports `robot_id` parameter:

```json
{
  "distance_cm": 5,
  "publish_mqtt": true,
  "robot_id": "wro1"
}
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `distance_cm` | int | No | 5 | Distance in centimeters |
| `publish_mqtt` | bool | No | true | Whether to publish to MQTT broker |
| `robot_id` | string | No | `DEFAULT_ROBOT_ID` | Target robot ID |

## Testing Scenarios

### Scenario 1: Test with Robot wro1

#### Step 1: Set Frontend to Control wro1

**In Frontend Settings:**
1. Open Settings
2. Enter Robot ID: `wro1`
3. Click "Test & Switch"
4. Verify: "Currently controlling: wro1"

**Alternative (WebSocket Command):**
```javascript
// In browser console
ws.send(JSON.stringify({
  type: "set_robot_id",
  robot_id: "wro1"
}));
```

#### Step 2: Send Test Message for wro1

**Using curl:**
```bash
curl -X POST http://localhost:8000/test/distance \
  -H "Content-Type: application/json" \
  -d '{
    "distance_cm": 5,
    "publish_mqtt": true,
    "robot_id": "wro1"
  }'
```

**Using Python:**
```python
import requests

response = requests.post('http://localhost:8000/test/distance', json={
    "distance_cm": 5,
    "publish_mqtt": True,
    "robot_id": "wro1"
})

print(response.json())
```

**Expected Response:**
```json
{
  "ok": true,
  "via": "http",
  "payload": {
    "event": "start",
    "distance_cm": 5,
    "robot_id": "wro1"
  },
  "robot_id": "wro1",
  "message": "Test message sent for robot: wro1"
}
```

#### Step 3: Verify Robot wro1 Receives Message

**On Robot wro1 (EV3):**
- ✅ Should receive the message
- ✅ Should process the event
- ✅ Should move/respond

**Backend Logs:**
```
[HTTP /test/distance] Published to MQTT robot/notify: {'event': 'start', 'distance_cm': 5, 'robot_id': 'wro1'}
[MQTT] Received on robot/notify: {"event": "start", "distance_cm": 5, "robot_id": "wro1"}
```

**Robot wro1 Logs:**
```
[MQTT] Received: {"event": "start", "distance_cm": 5, "robot_id": "wro1"}
[INFO] Message for me (wro1), processing...
[ACTION] Moving forward...
```

---

### Scenario 2: Test with Robot wro7

#### Step 1: Set Frontend to Control wro7

**In Frontend Settings:**
1. Open Settings
2. Enter Robot ID: `wro7`
3. Click "Test & Switch"
4. Verify: "Currently controlling: wro7"

#### Step 2: Send Test Message for wro7

**Using curl:**
```bash
curl -X POST http://localhost:8000/test/distance \
  -H "Content-Type: application/json" \
  -d '{
    "distance_cm": 5,
    "publish_mqtt": true,
    "robot_id": "wro7"
  }'
```

**Expected Response:**
```json
{
  "ok": true,
  "via": "http",
  "payload": {
    "event": "start",
    "distance_cm": 5,
    "robot_id": "wro7"
  },
  "robot_id": "wro7",
  "message": "Test message sent for robot: wro7"
}
```

#### Step 3: Verify Robot wro7 Receives Message

**On Robot wro7 (EV3):**
- ✅ Should receive the message
- ✅ Should process the event
- ✅ Should move/respond

**On Robot wro1 (EV3):**
- ❌ Should ignore the message (wrong robot_id)

**Robot wro1 Logs:**
```
[MQTT] Received: {"event": "start", "distance_cm": 5, "robot_id": "wro7"}
[IGNORE] Message for robot 'wro7', I am 'wro1'
```

**Robot wro7 Logs:**
```
[MQTT] Received: {"event": "start", "distance_cm": 5, "robot_id": "wro7"}
[INFO] Message for me (wro7), processing...
[ACTION] Moving forward...
```

---

## Complete Test Flow

### Test 1: Verify wro1 Receives Only Its Messages

```bash
# Terminal 1: Start backend
cd backend
uvicorn main:app --reload

# Terminal 2: Start frontend
cd frontend
npm start

# Terminal 3: Send test messages
# Test 1: Send to wro1
curl -X POST http://localhost:8000/test/distance \
  -H "Content-Type: application/json" \
  -d '{"distance_cm": 5, "publish_mqtt": true, "robot_id": "wro1"}'

# Wait 2 seconds

# Test 2: Send to wro7 (wro1 should ignore)
curl -X POST http://localhost:8000/test/distance \
  -H "Content-Type: application/json" \
  -d '{"distance_cm": 5, "publish_mqtt": true, "robot_id": "wro7"}'
```

**Expected Results:**
- ✅ wro1 processes first message
- ❌ wro1 ignores second message
- ✅ wro7 processes second message (if connected)

### Test 2: Switch Frontend Between Robots

```bash
# 1. Set frontend to wro1
# In browser: Settings → Robot ID: wro1 → Test & Switch

# 2. Send voice command: "I'm ready"
# Backend should publish: {"event": "coffee", "value": "start", "robot_id": "wro1"}
# Only wro1 should respond

# 3. Set frontend to wro7
# In browser: Settings → Robot ID: wro7 → Test & Switch

# 4. Send voice command: "I'm ready"
# Backend should publish: {"event": "coffee", "value": "start", "robot_id": "wro7"}
# Only wro7 should respond
```

---

## Verification Checklist

### ✅ Backend Verification

**Check `/test/distance` endpoint:**
```bash
curl -X POST http://localhost:8000/test/distance \
  -H "Content-Type: application/json" \
  -d '{"distance_cm": 5, "publish_mqtt": false, "robot_id": "wro1"}'
```

**Expected output:**
```json
{
  "ok": true,
  "via": "http",
  "payload": {
    "event": "start",
    "distance_cm": 5,
    "robot_id": "wro1"
  },
  "robot_id": "wro1",
  "message": "Test message sent for robot: wro1"
}
```

**Check robot configuration:**
```bash
curl http://localhost:8000/robot
```

**Expected output:**
```json
{
  "default_robot_id": "wro1",
  "active_connections": 1,
  "robot_assignments": {
    "ws_0": "wro1"
  }
}
```

### ✅ Frontend Verification

1. **Open browser console (F12)**
2. **Check WebSocket messages:**
   ```javascript
   // Should see robot_id_set confirmation
   {
     "type": "robot_id_set",
     "robot_id": "wro1"
   }
   ```

3. **Check settings UI:**
   - ✅ "Currently controlling: wro1" shown
   - ✅ Input field shows "wro1"
   - ✅ Success message appears after switch

### ✅ Robot (EV3) Verification

**On wro1:**
```python
# In ev3_movement/main.py, verify ROBOT_ID is set:
ROBOT_ID = "wro1"  # ← Should match test

# Check on_message_in function filters correctly:
def on_message_in(c, u, msg):
    p = json.loads(msg.payload.decode())
    msg_robot_id = p.get("robot_id")
    
    if msg_robot_id and msg_robot_id != ROBOT_ID:
        log(f"[IGNORE] Message for robot '{msg_robot_id}', I am '{ROBOT_ID}'")
        return  # ← Should skip processing
    
    # Process message...
```

---

## Troubleshooting

### Issue: Robot doesn't receive any messages

**Check:**
1. MQTT broker is running
2. Robot is connected to MQTT broker
3. Robot is subscribed to correct topic (`robot/events`)
4. `publish_mqtt` is `true` in test request

**Fix:**
```bash
# Check MQTT connection
curl http://localhost:8000/health

# Should show:
{
  "status": "healthy",
  "mqtt_connected": true,
  "broker": "broker.emqx.io",
  "default_robot_id": "wro1"
}
```

### Issue: Robot receives all messages (no filtering)

**Check:**
1. Robot code has `ROBOT_ID` set
2. Robot code has filtering logic in `on_message_in`
3. Messages include `robot_id` field

**Fix on Robot (ev3_movement/main.py):**
```python
# Make sure this line exists and is correct:
ROBOT_ID = "wro1"  # ← Set to your robot's ID

# Make sure filtering logic exists:
def on_message_in(c, u, msg):
    p = json.loads(msg.payload.decode())
    msg_robot_id = p.get("robot_id")
    
    # ADD THIS IF MISSING:
    if msg_robot_id and msg_robot_id != ROBOT_ID:
        log(f"[IGNORE] Message for robot '{msg_robot_id}', I am '{ROBOT_ID}'")
        return
    
    # Rest of message processing...
```

### Issue: Backend doesn't include robot_id in messages

**Check backend logs:**
```
[Backend] Published EVENT to robot/events: coffee/start for robot wro1
```

**If missing, check:**
1. WebSocket connection has robot_id set
2. Frontend sent `set_robot_id` command
3. Backend received confirmation

**Fix:**
```bash
# In browser console:
ws.send(JSON.stringify({
  type: "set_robot_id",
  robot_id: "wro1"
}));

# Or use frontend settings panel
```

---

## Advanced Testing

### Test Multiple Robots Simultaneously

**Setup:**
1. Start 3 robots: wro1, wro2, wro3
2. Set frontend to wro1
3. Send commands, verify only wro1 responds

**Test commands:**
```bash
# Send to wro1
curl -X POST http://localhost:8000/test/distance \
  -d '{"distance_cm": 5, "publish_mqtt": true, "robot_id": "wro1"}'

# Send to wro2
curl -X POST http://localhost:8000/test/distance \
  -d '{"distance_cm": 5, "publish_mqtt": true, "robot_id": "wro2"}'

# Send to wro3
curl -X POST http://localhost:8000/test/distance \
  -d '{"distance_cm": 5, "publish_mqtt": true, "robot_id": "wro3"}'
```

**Expected:**
- wro1 processes only first message
- wro2 processes only second message
- wro3 processes only third message

### Test Broadcast Messages (No robot_id)

**Send message without robot_id:**
```bash
curl -X POST http://localhost:8000/test/distance \
  -d '{"distance_cm": 5, "publish_mqtt": true}'
```

**Expected:**
- Uses `DEFAULT_ROBOT_ID`
- Only that robot responds
- Other robots ignore

### Performance Test

**Send 100 messages rapidly:**
```bash
for i in {1..100}; do
  curl -X POST http://localhost:8000/test/distance \
    -d "{\"distance_cm\": 5, \"publish_mqtt\": true, \"robot_id\": \"wro$((i % 3 + 1))\"}"
  sleep 0.1
done
```

**Expected:**
- All messages delivered
- Each robot processes only its messages
- No message loss

---

## API Reference

### POST /test/distance

Test distance sensor event with robot_id targeting.

**Request:**
```json
{
  "distance_cm": 5,
  "publish_mqtt": true,
  "robot_id": "wro1"
}
```

**Response:**
```json
{
  "ok": true,
  "via": "http",
  "payload": {
    "event": "start",
    "distance_cm": 5,
    "robot_id": "wro1"
  },
  "robot_id": "wro1",
  "message": "Test message sent for robot: wro1"
}
```

### GET /robot

Get current robot configuration.

**Response:**
```json
{
  "default_robot_id": "wro1",
  "active_connections": 1,
  "robot_assignments": {
    "ws_0": "wro1"
  }
}
```

### WebSocket: set_robot_id

Set robot ID for current WebSocket connection.

**Send:**
```json
{
  "type": "set_robot_id",
  "robot_id": "wro1"
}
```

**Receive:**
```json
{
  "type": "robot_id_set",
  "robot_id": "wro1"
}
```

---

## Quick Start Testing Script

Save this as `test_robot_ids.sh`:

```bash
#!/bin/bash

echo "Testing Robot ID Filtering"
echo "==========================="

# Test 1: wro1
echo ""
echo "Test 1: Sending to wro1..."
curl -s -X POST http://localhost:8000/test/distance \
  -H "Content-Type: application/json" \
  -d '{"distance_cm": 5, "publish_mqtt": true, "robot_id": "wro1"}' | jq

sleep 1

# Test 2: wro7
echo ""
echo "Test 2: Sending to wro7..."
curl -s -X POST http://localhost:8000/test/distance \
  -H "Content-Type: application/json" \
  -d '{"distance_cm": 5, "publish_mqtt": true, "robot_id": "wro7"}' | jq

sleep 1

# Test 3: Check robot config
echo ""
echo "Test 3: Checking robot configuration..."
curl -s http://localhost:8000/robot | jq

echo ""
echo "==========================="
echo "Tests complete!"
echo "Check robot logs to verify filtering."
```

**Run:**
```bash
chmod +x test_robot_ids.sh
./test_robot_ids.sh
```

---

**Last Updated:** November 7, 2025  
**Version:** 1.0  
**Status:** ✅ Ready for Testing

