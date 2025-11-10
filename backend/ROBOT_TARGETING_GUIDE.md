# Robot Targeting System

Your backend now supports **multi-robot targeting**! Each MQTT message includes a `robot_id` field so robots know which messages are meant for them.

---

## 🤖 **How It Works**

### Message Format

All MQTT messages now include `robot_id`:

```json
{
  "event": "coffee",
  "value": "start",
  "robot_id": "wro1",
  "ts": "abc123..."
}
```

### Default Robot ID

- Default: `wro1` (can be changed via environment variable)
- Each WebSocket connection can specify its own target robot
- Robots should filter messages by checking `robot_id` field

---

## 🔧 **Configuration Methods**

### Method 1: Environment Variable (Recommended for Production)

Set the default robot ID for all new connections:

**Local (.env file):**
```bash
DEFAULT_ROBOT_ID=wro1
```

**Render (Environment Variables tab):**
```
DEFAULT_ROBOT_ID=lab1
```

**Docker Compose:**
```yaml
environment:
  - DEFAULT_ROBOT_ID=wro1
```

---

### Method 2: API Endpoint (Dynamic Changes)

**Get current default robot:**
```bash
curl https://wro-6dh5.onrender.com/robot
```

Response:
```json
{
  "default_robot_id": "wro1",
  "active_connections": 2,
  "robot_assignments": {
    "ws_0": "wro1",
    "ws_1": "lab1"
  }
}
```

**Set new default robot:**
```bash
curl -X POST https://wro-6dh5.onrender.com/robot \
  -H "Content-Type: application/json" \
  -d '{"robot_id": "lab1"}'
```

Response:
```json
{
  "ok": true,
  "default_robot_id": "lab1",
  "message": "Default robot ID set to lab1"
}
```

---

### Method 3: WebSocket Message (Per Connection)

Each WebSocket connection can specify its target robot:

**From Frontend (JavaScript):**
```javascript
const ws = new WebSocket('wss://wro-6dh5.onrender.com/ws');

ws.onopen = () => {
  // Set this connection to control "lab1"
  ws.send(JSON.stringify({
    type: "set_robot_id",
    robot_id: "lab1"
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === "robot_id_set") {
    console.log(`Robot ID set to: ${data.robot_id}`);
  }
};
```

---

## 🤖 **Robot-Side Implementation**

Your robot code should filter messages by `robot_id`:

### Python Example (EV3/MQTT Client)

```python
import paho.mqtt.client as mqtt
import json

ROBOT_ID = "wro1"  # This robot's unique ID

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        
        # Check if message is for this robot
        message_robot_id = payload.get("robot_id")
        
        if message_robot_id != ROBOT_ID:
            print(f"[IGNORE] Message for {message_robot_id}, I am {ROBOT_ID}")
            return
        
        # Process the message
        event = payload.get("event")
        value = payload.get("value")
        
        if event == "coffee" and value == "start":
            print(f"[{ROBOT_ID}] Starting coffee!")
            start_coffee_process()
            
    except Exception as e:
        print(f"Error processing message: {e}")

# Connect to MQTT broker
client = mqtt.Client()
client.username_pw_set("wro-robot", "V!cT0rl11")
client.tls_set()
client.on_message = on_message
client.connect("i27312ff.ala.asia-southeast1.emqxsl.com", 8883, 60)
client.subscribe("robot/events", qos=0)
client.loop_forever()
```

---

## 📊 **Use Cases**

### Scenario 1: Single Robot (Simple)

**Setup:**
```bash
# .env
DEFAULT_ROBOT_ID=wro1
```

**Result:**
- All messages sent with `robot_id: "wro1"`
- One robot listens and responds

---

### Scenario 2: Multiple Robots in Competition

**Setup:**
- Robot 1: Filters for `robot_id: "wro1"`
- Robot 2: Filters for `robot_id: "wro2"`
- Frontend: Uses WebSocket command to switch between robots

**Frontend Code:**
```javascript
// Switch to control wro1
function controlRobot1() {
  ws.send(JSON.stringify({
    type: "set_robot_id",
    robot_id: "wro1"
  }));
}

// Switch to control wro2
function controlRobot2() {
  ws.send(JSON.stringify({
    type: "set_robot_id",
    robot_id: "wro2"
  }));
}
```

---

### Scenario 3: Lab vs Competition Robots

**Setup:**
```bash
# Development backend: DEFAULT_ROBOT_ID=lab1
# Production backend: DEFAULT_ROBOT_ID=wro1
```

**Result:**
- Lab robots only respond to lab backend
- Competition robots only respond to production backend
- No cross-contamination!

---

## 🧪 **Testing**

### Test 1: Check Default Robot

```bash
curl https://wro-6dh5.onrender.com/
```

Look for `"default_robot_id": "wro1"` in response.

---

### Test 2: Check MQTT Message Format

Connect WebSocket and say "yes im ready", then check Render logs:

```
[MQTT] Publishing: {"event":"coffee","value":"start","robot_id":"wro1",...}
```

---

### Test 3: Test Robot Filtering

**Robot 1 (wro1):**
- Should receive and process message

**Robot 2 (lab1):**
- Should ignore message

---

## 📋 **Environment Variables Summary**

```bash
# Existing MQTT variables
MQTT_BROKER=i27312ff.ala.asia-southeast1.emqxsl.com
MQTT_PORT=8883
MQTT_USERNAME=wro-robot
MQTT_PASSWORD=V!cT0rl11
MQTT_USE_SSL=true
MQTT_PUB_TOPIC=robot/events
MQTT_REPLY_TOPIC=robot/reply

# NEW: Robot targeting
DEFAULT_ROBOT_ID=wro1  # Default robot for new connections
```

---

## 🎯 **Quick Reference**

| Method | Scope | Use Case |
|--------|-------|----------|
| Environment Variable | Global default | Production deployment |
| POST /robot | Global default (runtime) | Testing, switching modes |
| WebSocket message | Per connection | Multi-robot control UI |

---

## 🚀 **Next Steps**

1. **Update your robot code** to filter messages by `robot_id`
2. **Set `DEFAULT_ROBOT_ID`** in Render environment variables
3. **Test** with different robot IDs
4. **Update frontend** to allow robot selection (optional)

---

Your backend now supports multiple robots! 🤖🤖🤖

