# Robot ID Selection Feature Guide

## Overview

The Robot ID Selection feature allows users to dynamically switch between different robots from the frontend interface. This is useful when multiple robots are connected to the same MQTT broker and you want to control a specific one.

## What Changed

### 1. **MqttSettings.jsx → RobotSettings Component**

The old IP testing feature has been completely replaced with a robot ID selector:

**Before:**
- Input field for MQTT broker IP/hostname
- "Test & Save" button to test connection to broker
- Validated IP addresses and hostnames

**After:**
- Input field for Robot ID
- "Test & Switch" button to switch to a specific robot
- Validates robot IDs (alphanumeric, dash, underscore)
- Shows currently controlled robot
- Real-time testing via WebSocket

### 2. **Integration with Backend**

The component now:
- Fetches the current default robot_id from `/robot` API endpoint
- Sends `set_robot_id` command via WebSocket
- Waits for confirmation from backend
- Displays latency and connection status

### 3. **User Interface Updates**

- Changed icon from `Wifi` to `Bot`
- Updated labels: "Broker Host or IP" → "Robot ID"
- Updated button: "Test & Save" → "Test & Switch"
- Shows "Currently controlling: {robot_id}" indicator
- Better error messages for invalid robot IDs

## How to Use

### From the Frontend

1. **Open Settings**
   - Click the "Settings" button in the chat interface
   
2. **Enter Robot ID**
   - In the "Robot Selection" section, enter your robot's ID
   - Examples: `wro1`, `lab1`, `demo-robot`
   
3. **Test & Switch**
   - Click "Test & Switch" button
   - Wait for confirmation (typically < 1 second)
   - You'll see a success message: "Now controlling robot: {robot_id}"

4. **Verify**
   - The "Currently controlling" indicator will update
   - All subsequent messages will be sent to this robot

### From the Backend

The backend automatically filters messages by robot_id:

```python
# Backend sends robot_id in MQTT payload
{
  "action": "ready_event",
  "robot_id": "wro1"  # ← Your selected robot
}
```

### From the Robot (EV3)

The robot filters incoming messages:

```python
# ev3_movement/main.py
def on_message_in(c, u, msg):
    p = json.loads(msg.payload.decode())
    msg_robot_id = p.get("robot_id")
    
    # Only process if message is for this robot
    if msg_robot_id and msg_robot_id != ROBOT_ID:
        return  # Ignore
    
    # Process command...
```

## Technical Details

### WebSocket Communication

```javascript
// 1. User enters robot_id in frontend
// 2. Frontend sends command via WebSocket:
{
  "type": "set_robot_id",
  "robot_id": "wro1"
}

// 3. Backend processes and responds:
{
  "type": "robot_id_set",
  "robot_id": "wro1"
}

// 4. Backend stores robot_id for this WebSocket connection
// 5. All future MQTT messages include this robot_id
```

### Validation Rules

Robot IDs must:
- Not be empty
- Only contain: letters (a-z, A-Z), numbers (0-9), dash (-), underscore (_)
- Examples of valid IDs: `wro1`, `lab-1`, `demo_robot`, `Team123`
- Examples of invalid IDs: `wro 1` (space), `wro#1` (special char), `机器人1` (non-ASCII)

### Error Handling

The component handles various error scenarios:

1. **WebSocket Not Connected**
   - Error: "WebSocket not connected"
   - Solution: Wait for connection or click reconnect

2. **Invalid Robot ID Format**
   - Error: "Invalid format, use letters, numbers, dash or underscore"
   - Solution: Remove invalid characters

3. **Connection Timeout**
   - Error: "Connection timeout"
   - Solution: Check backend logs, ensure MQTT is working

4. **Empty Robot ID**
   - Error: "Please enter Robot ID"
   - Solution: Enter a valid robot ID

## API Endpoints

### GET /robot

Returns current robot configuration:

```json
{
  "default_robot_id": "wro1",
  "websocket_assignments": {
    // Active WebSocket → robot_id mappings
  }
}
```

### POST /robot

Updates the default robot_id (server-side):

```json
// Request
{
  "robot_id": "wro2"
}

// Response
{
  "ok": true,
  "default_robot_id": "wro2",
  "message": "Default robot_id updated to wro2"
}
```

## Testing Checklist

### Manual Testing Steps

1. ✅ **Load Current Robot ID**
   - Open settings
   - Verify current robot_id is displayed
   - Should match backend's `DEFAULT_ROBOT_ID`

2. ✅ **Change Robot ID**
   - Enter a new robot_id (e.g., `test1`)
   - Click "Test & Switch"
   - Verify success message appears
   - Verify "Currently controlling" updates

3. ✅ **Invalid Robot ID**
   - Try entering `test 1` (with space)
   - Verify error message appears
   - Try entering empty string
   - Verify error message appears

4. ✅ **WebSocket Disconnected**
   - Disconnect WebSocket (e.g., stop backend)
   - Try to switch robot
   - Verify error: "WebSocket not connected"
   - Reconnect and try again

5. ✅ **Multiple Robots**
   - Have 2+ robots running with different IDs
   - Switch between them in frontend
   - Send "ready" command
   - Verify only the selected robot responds

## Deployment Notes

### Environment Variables

Make sure `DEFAULT_ROBOT_ID` is set in your deployment:

**Render:**
```bash
DEFAULT_ROBOT_ID=wro1
```

**Vercel (Frontend):**
```bash
REACT_APP_WS_HOST=your-backend.onrender.com
```

### MQTT Configuration

All robots must be configured with unique IDs:

```python
# ev3_movement/main.py
ROBOT_ID = "wro1"  # ← Make this unique per robot
```

```python
# pose_detection/pc_publisher.py
TARGET_ROBOT_ID = "wro1"  # ← Match this to your robot
```

## Troubleshooting

### Issue: Robot ID doesn't update

**Possible Causes:**
1. WebSocket not connected → Check connection status
2. Backend not receiving message → Check backend logs
3. Invalid robot_id format → Check validation rules

### Issue: Wrong robot responds

**Possible Causes:**
1. Multiple robots have same ID → Make IDs unique
2. Robot not filtering messages → Check `on_message_in` function
3. Backend not including robot_id → Check backend logs

### Issue: "Connection timeout" error

**Possible Causes:**
1. Backend not responding → Check backend is running
2. WebSocket message lost → Retry the operation
3. Backend error → Check backend logs for exceptions

## Best Practices

1. **Use Descriptive IDs**: `wro-team1` instead of `r1`
2. **Keep IDs Short**: Max 20 characters for readability
3. **Use Consistent Format**: Choose one style (dash vs underscore) and stick to it
4. **Document Robot IDs**: Keep a list of all robot IDs in use
5. **Test After Switch**: Send a test command to verify the switch worked

## Related Files

### Frontend
- `frontend/src/MqttSettings.jsx` - Robot ID selector component (renamed to RobotSettings)
- `frontend/src/App.js` - Main app that integrates the component
- `frontend/src/hooks/useWebSocketConnection.js` - WebSocket management

### Backend
- `backend/main.py` - WebSocket endpoint and robot_id handling
- `backend/ROBOT_TARGETING_GUIDE.md` - Detailed backend documentation
- `backend/ROBOT_TARGETING_SUMMARY.md` - Quick reference

### Robot Code
- `ev3_movement/main.py` - EV3 robot message filtering
- `pose_detection/pc_publisher.py` - Pose detection with robot targeting

## Future Enhancements

Possible improvements for the future:

1. **Robot Discovery**: Auto-detect available robots
2. **Robot Status**: Show online/offline status for each robot
3. **Multi-Select**: Control multiple robots simultaneously
4. **Robot Profiles**: Save robot configurations
5. **Recent Robots**: Quick access to recently controlled robots

---

**Last Updated:** November 7, 2025  
**Version:** 1.0  
**Status:** ✅ Implemented and Tested

