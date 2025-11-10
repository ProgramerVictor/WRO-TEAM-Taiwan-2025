# Robot ID Filtering Fix

## Problem

**Before the fix:**
Backend was receiving MQTT messages with `robot_id` but broadcasting them to **ALL** WebSocket connections, regardless of which robot they were configured to control.

**Example:**
```json
// User sends test with robot_id: "qro7"
{
  "distance_cm": 5,
  "publish_mqtt": true,
  "robot_id": "qro7"
}

// Frontend configured for "wro1" still received the message ❌
```

## Root Cause

The `handle_mqtt_message` function was:
1. ✅ Extracting robot_id from messages (added earlier)
2. ❌ Not filtering WebSocket broadcasts by robot_id
3. ❌ Broadcasting to ALL connected WebSockets

## Solution

Added robot_id filtering logic to `handle_mqtt_message`:

### Changes Made

**File:** `backend/main.py` (lines 297-404)

#### 1. Extract robot_id from Incoming Messages

```python
# Extract robot_id from message
message_robot_id = obj.get("robot_id")
```

#### 2. Filter WebSocket Connections

```python
# Filter by robot_id: only process if message is for us or is a broadcast
if message_robot_id is not None:
    # Check if any connected WebSocket is configured for this robot_id
    matching_websockets = [
        ws for ws in connected_websockets.copy() 
        if websocket_robot_map.get(ws) == message_robot_id
    ]
    
    if not matching_websockets:
        print(f"[MQTT->AI] ⏭️  Skipping message for robot_id '{message_robot_id}' - no matching WebSocket connections")
        return  # Skip processing
    
    print(f"[MQTT->AI] ✅ Processing message for robot_id '{message_robot_id}' - {len(matching_websockets)} matching connection(s)")
else:
    # No robot_id in message - broadcast to all (backward compatibility)
    matching_websockets = list(connected_websockets.copy())
    print(f"[MQTT->AI] 📢 Broadcasting message (no robot_id) to all {len(matching_websockets)} connection(s)")
```

#### 3. Only Send to Matching WebSockets

```python
# Only send to matching WebSocket connections
for ws in matching_websockets:
    try:
        await ws.send_text(reply_text)
    except Exception as e:
        print(f"[WS] send_text failed: {e}")

# Only synthesize TTS if there are matching connections
if matching_websockets:
    asyncio.create_task(synthesize_and_broadcast_tts(reply_text))
```

## How It Works Now

### Scenario 1: Frontend Configured for wro1

**Frontend Settings:**
- Robot ID: `wro1`

**Test Message:**
```bash
curl -X POST http://localhost:8000/test/distance \
  -d '{"distance_cm": 5, "publish_mqtt": true, "robot_id": "qro7"}'
```

**Backend Logs:**
```
[HTTP /test/distance] Published to MQTT robot/notify: {'event': 'start', 'distance_cm': 5, 'robot_id': 'qro7'}
[MQTT] Received on robot/notify: {"event": "start", "distance_cm": 5, "robot_id": "qro7"}
[MQTT->AI] ⏭️  Skipping message for robot_id 'qro7' - no matching WebSocket connections
```

**Result:**
- ❌ Frontend does NOT receive the message
- ✅ Backend skips processing
- ✅ No AI call made
- ✅ No TTS generated

### Scenario 2: Frontend Configured for qro7

**Frontend Settings:**
- Robot ID: `qro7`

**Test Message:**
```bash
curl -X POST http://localhost:8000/test/distance \
  -d '{"distance_cm": 5, "publish_mqtt": true, "robot_id": "qro7"}'
```

**Backend Logs:**
```
[HTTP /test/distance] Published to MQTT robot/notify: {'event': 'start', 'distance_cm': 5, 'robot_id': 'qro7'}
[MQTT] Received on robot/notify: {"event": "start", "distance_cm": 5, "robot_id": "qro7"}
[MQTT->AI] ✅ Processing message for robot_id 'qro7' - 1 matching connection(s)
[TTS] Synthesizing: 'Hello there! I am Xiao Ka, nice to meet you! What's your name?...' in en
```

**Result:**
- ✅ Frontend receives the message
- ✅ Backend processes it
- ✅ AI generates response
- ✅ TTS is synthesized
- ✅ Message sent to WebSocket

### Scenario 3: No robot_id in Message (Backward Compatibility)

**Test Message:**
```bash
curl -X POST http://localhost:8000/test/distance \
  -d '{"distance_cm": 5, "publish_mqtt": true}'
```

**Backend Logs:**
```
[MQTT] Received on robot/notify: {"event": "start", "distance_cm": 5}
[MQTT->AI] 📢 Broadcasting message (no robot_id) to all 2 connection(s)
```

**Result:**
- ✅ ALL frontends receive the message (backward compatible)
- ✅ Backend processes it
- ✅ AI generates response
- ✅ Broadcasts to all WebSockets

## Testing

### Test 1: Verify Filtering Works

**Setup:**
1. Start backend: `uvicorn main:app --reload`
2. Open frontend: `http://localhost:3000`
3. Configure Robot ID: `wro1`

**Test:**
```bash
# This should be IGNORED (wrong robot_id)
curl -X POST http://localhost:8000/test/distance \
  -H "Content-Type: application/json" \
  -d '{"distance_cm": 5, "publish_mqtt": true, "robot_id": "qro7"}'
```

**Expected:**
- ❌ Frontend does NOT receive message
- ✅ Backend logs show: "⏭️  Skipping message for robot_id 'qro7'"
- ❌ No AI response
- ❌ No TTS audio

### Test 2: Verify Matching Works

**Setup:**
1. Configure Robot ID: `wro1` in frontend

**Test:**
```bash
# This should be PROCESSED (matching robot_id)
curl -X POST http://localhost:8000/test/distance \
  -H "Content-Type: application/json" \
  -d '{"distance_cm": 5, "publish_mqtt": true, "robot_id": "wro1"}'
```

**Expected:**
- ✅ Frontend receives message
- ✅ Backend logs show: "✅ Processing message for robot_id 'wro1'"
- ✅ AI generates response
- ✅ TTS audio plays

### Test 3: Multiple Frontends

**Setup:**
1. Open 2 browser tabs
2. Tab 1: Configure Robot ID: `wro1`
3. Tab 2: Configure Robot ID: `qro7`

**Test:**
```bash
# Send to wro1
curl -X POST http://localhost:8000/test/distance \
  -d '{"distance_cm": 5, "publish_mqtt": true, "robot_id": "wro1"}'

# Send to qro7
curl -X POST http://localhost:8000/test/distance \
  -d '{"distance_cm": 5, "publish_mqtt": true, "robot_id": "qro7"}'
```

**Expected:**
- ✅ Tab 1 receives only wro1 message
- ✅ Tab 2 receives only qro7 message
- ✅ Backend logs show matching connections for each

## Verification Checklist

### ✅ Backend Filtering
- [x] Messages with robot_id are filtered
- [x] Only matching WebSockets receive messages
- [x] Non-matching WebSockets are skipped
- [x] Logs show clear filtering status

### ✅ Backward Compatibility
- [x] Messages without robot_id broadcast to all
- [x] Old code still works
- [x] No breaking changes

### ✅ Performance
- [x] No unnecessary AI calls for filtered messages
- [x] No unnecessary TTS generation
- [x] Early return for non-matching messages

## Log Messages Reference

### When Message is Filtered Out
```
[MQTT->AI] ⏭️  Skipping message for robot_id 'qro7' - no matching WebSocket connections
```

### When Message is Processed
```
[MQTT->AI] ✅ Processing message for robot_id 'wro1' - 1 matching connection(s)
```

### When Message is Broadcast (No robot_id)
```
[MQTT->AI] 📢 Broadcasting message (no robot_id) to all 2 connection(s)
```

## Architecture Flow

### Before Fix:
```
MQTT Message (robot_id: "qro7")
    ↓
Backend receives
    ↓
Process with AI ← Wastes resources!
    ↓
Broadcast to ALL WebSockets ← Wrong!
    ↓
Frontend (wro1) receives ← Should be filtered!
```

### After Fix:
```
MQTT Message (robot_id: "qro7")
    ↓
Backend receives
    ↓
Check matching WebSockets
    ↓
No match for "qro7"? → Skip processing ✅
    ↓
Match found? → Process & send to that WebSocket only ✅
```

## Benefits

### 1. Proper Isolation
- ✅ Each frontend only receives messages for its configured robot
- ✅ No cross-contamination between robot controls

### 2. Resource Efficiency
- ✅ No unnecessary AI calls
- ✅ No unnecessary TTS generation
- ✅ Early return for non-matching messages

### 3. Clear Logging
- ✅ Easy to debug with emoji indicators
- ✅ Shows matching connection count
- ✅ Clear skip messages

### 4. Backward Compatible
- ✅ Messages without robot_id still broadcast to all
- ✅ Existing code continues to work
- ✅ No breaking changes

## Related Documentation

- `ROBOT_ID_TESTING_GUIDE.md` - Comprehensive testing guide
- `ROBOT_TARGETING_GUIDE.md` - Robot targeting system overview
- `ROBOT_TARGETING_SUMMARY.md` - Quick reference

## Quick Test Command

```bash
# Test with Python script
cd backend
python test_robot_filtering.py

# Or manual test
curl -X POST http://localhost:8000/test/distance \
  -H "Content-Type: application/json" \
  -d '{"distance_cm": 5, "publish_mqtt": true, "robot_id": "qro7"}'

# Check backend logs for filtering messages
```

---

**Fix Date:** November 7, 2025  
**Version:** 1.1  
**Status:** ✅ Fixed and Tested  
**No Linter Errors:** ✅

