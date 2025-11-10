import json
import uuid
import asyncio
import time
import os
from typing import Tuple, List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from gtts import gTTS
import paho.mqtt.publish as mqtt_publish
import paho.mqtt.client as mqtt
from dotenv import load_dotenv

# --- Optional: For POST requests ---
try:
    import httpx
except Exception:
    httpx = None

# --- Additional imports ---
import tempfile
import base64
from io import BytesIO

# ========= Basic Configuration =========
load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError(
        "OPENAI_API_KEY not found! "
        "Local: Create .env file with OPENAI_API_KEY=sk-... | "
        "Render: Add OPENAI_API_KEY in Environment Variables tab"
    )

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-nano")
client = OpenAI(api_key=OPENAI_API_KEY)

MQTT_BROKER = os.getenv("MQTT_BROKER", "broker.emqx.io")
MQTT_PORT   = int(os.getenv("MQTT_PORT", "1883"))
MQTT_USERNAME = os.getenv("MQTT_USERNAME")  # Optional: for authenticated brokers
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD")  # Optional: for authenticated brokers
MQTT_USE_SSL = os.getenv("MQTT_USE_SSL", "false").lower() == "true"  # Set to "true" for port 8883
MQTT_PUB_TOPIC   = os.getenv("MQTT_PUB_TOPIC", "robot/events")
MQTT_REPLY_TOPIC = os.getenv("MQTT_REPLY_TOPIC", "robot/reply")
MQTT_SUB_TOPICS  = [("robot/notify", 0)]

# Helper function for MQTT publish with authentication and SSL
def mqtt_publish_single(topic: str, payload: str, hostname: str):
    """Publish a single MQTT message with authentication and SSL support"""
    auth = None
    if MQTT_USERNAME and MQTT_PASSWORD:
        auth = {'username': MQTT_USERNAME, 'password': MQTT_PASSWORD}
    
    tls = None
    if MQTT_USE_SSL or MQTT_PORT == 8883:
        tls = {}  # Use default system CA certificates
    
    mqtt_publish.single(
        topic, 
        payload, 
        hostname=hostname, 
        port=MQTT_PORT,
        auth=auth,
        tls=tls
    )

SYSTEM_PROMPT = (
    "You are XiaoKa, a friendly coffee robot for elderly users. "
    "Keep responses under 15 words. Be warm and natural. "
    "Always ask for and remember user names. "
    "For 'hello judges': reply 'Hello judges! I am Xiao Ka, please wave! We are ready to move to the next stage!' "
    "For outdoor activities: enthusiastically offer to join. "
    "For 'ready'/'start': discuss coffee. "
    "Speak naturally, never use ACTION: or event: formats."
    "Ask the user if they are ready to start the coffee making process, then chat with them"
)

# ========= FastAPI Lifespan =========
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Modern FastAPI lifespan event handler"""
    # Startup
    global MAIN_LOOP
    MAIN_LOOP = asyncio.get_running_loop()
    connect_mqtt(CURRENT_MQTT_BROKER)
    yield
    # Shutdown
    global mqtt_client
    if mqtt_client:
        mqtt_client.loop_stop()
        mqtt_client.disconnect()
        print("[MQTT] Disconnected")

# ========= FastAPI =========
app = FastAPI(lifespan=lifespan)
connected_websockets = set()
conversations = {}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

# ========= MQTT Status =========
mqtt_client = None
MAIN_LOOP: asyncio.AbstractEventLoop | None = None
CURRENT_MQTT_BROKER = MQTT_BROKER

# ========= Robot Management =========
# Default robot ID (can be overridden per WebSocket or globally)
DEFAULT_ROBOT_ID = os.getenv("DEFAULT_ROBOT_ID", "wro1")
# Track target robot for each WebSocket connection
websocket_robot_map = {}

# ========= AI Conversation =========
mqtt_conversation = [{"role": "system", "content": SYSTEM_PROMPT}]
connected_websockets = set()
conversations = {}

def trim_history(conv: list, max_messages: int = 100):
    if len(conv) <= max_messages:
        return
    head = conv[0:1]
    tail = conv[-(max_messages-1):]
    conv[:] = head + tail

def print_context_remaining(conv: list, label: str = ""):
    """Print remaining context information"""
    total_slots = 99  # 100 total - 1 system message
    used_slots = len(conv) - 1  # Subtract system message
    remaining_slots = max(0, total_slots - used_slots)
    print(f"[CONTEXT] {label} - Used: {used_slots}, Remaining: {remaining_slots} (Total slots: {total_slots})")

def get_gpt_response(conversation_history):
    completion = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=conversation_history,
        temperature=0.7,  # Lower temperature for faster, more consistent responses
        max_tokens=100,   # Limit response length for speed
    )
    return completion.choices[0].message.content

async def get_gpt_response_async(conversation_history):
    def _sync_call():
        return get_gpt_response(conversation_history)
    return await asyncio.to_thread(_sync_call)

# ========= TTS =========
async def broadcast_audio(audio_filename):
    """Legacy function for file-based audio (kept for compatibility)"""
    with open(audio_filename, "rb") as f:
        audio_bytes = f.read()
    await broadcast_audio_bytes(audio_bytes)

async def broadcast_audio_bytes(audio_bytes: bytes):
    """Broadcast audio bytes directly (no file I/O)"""
    for ws in connected_websockets.copy():
        try:
            await ws.send_bytes(audio_bytes)
        except Exception as e:
            print(f"WebSocket send failed: {e}")

async def synthesize_and_broadcast_tts(text: str, lang: str = None):
    """Fast TTS using in-memory processing (no file I/O)"""
    
    def _tts_job():
        # Auto-detect language if not specified
        if lang is None:
            detected_lang = detect_language(text)
            if detected_lang == "chinese":
                tts_lang = "zh-TW"
            else:
                tts_lang = "en"
        else:
            tts_lang = lang
            
        print(f"[TTS] Synthesizing: '{text[:50]}...' in {tts_lang}")
        
        # Create TTS and save to memory (BytesIO) instead of file
        tts = gTTS(text=text, lang=tts_lang, slow=False, tld='com')
        audio_buffer = BytesIO()
        tts.write_to_fp(audio_buffer)
        audio_buffer.seek(0)
        return audio_buffer.getvalue()
    
    try:
        audio_bytes = await asyncio.to_thread(_tts_job)
        await broadcast_audio_bytes(audio_bytes)
    except Exception as e:
        print(f"[TTS] error: {e}")

def detect_language(text: str):
    """Detect the main language used in text"""
    chinese_chars = sum(1 for char in text if '\u4e00' <= char <= '\u9fff')
    total_chars = len(text.replace(' ', ''))

    if total_chars == 0:
        return "unknown"

    chinese_ratio = chinese_chars / total_chars
    if chinese_ratio > 0.3:  # If more than 30% of characters are Chinese
        return "chinese"
    else:
        return "english"

# ========= ready → POST =========
async def _post_when_ready(payload: dict):
    url = os.getenv("OCR_POST_URL")
    if not url:
        return
    if httpx is None:
        print("[READY-POST] httpx not installed; skip POST")
        return
    try:
        async with httpx.AsyncClient(timeout=10) as cli:
            resp = await cli.post(url, json=payload)
            print(f"[READY-POST] {url} -> {resp.status_code}")
    except Exception as e:
        print(f"[READY-POST] error: {e}")

async def on_ready_side_effects():
    ts = int(time.time())
    await _post_when_ready({"event": "ready", "ts": ts})

# ========= AI Process Flow =========
async def process_user_message(conversation_history, user_text: str):
    prompt = [{"role": "system", "content": SYSTEM_PROMPT}] + conversation_history[-100:] + [
        {"role": "user", "content": user_text}
    ]
    try:
        result = await get_gpt_response_async(prompt)
        text = (result or "").strip()
        
        # 检测用户输入是否包含准备就绪的意图
        ready_keywords = ["準備好了", "準備", "開始", "ready", "start"]
        user_lower = user_text.lower()
        
        # 如果用户输入包含准备就绪的关键词，触发 ready 事件
        if any(keyword in user_lower or keyword in user_text for keyword in ready_keywords):
            return "ready_event", text
        
        # 检查是否仍有旧格式的 ACTION（向后兼容）
        if text.startswith(("ACTION:", "event:")):
            parts = text.split("|", 1)
            prefix, rest = parts[0], parts[1] if len(parts) == 2 else ""
            action_part = prefix.split(":", 1)[1].strip()
            response_text = rest.strip()
            if action_part == "ready":
                return "ready_event", (response_text or text)
            elif action_part == "brew_americano":
                return action_part, (response_text or text)
        
        return None, text
    except Exception as e:
        print(f"[ProcessMessage] Error: {e}")
        return None, "Sorry, I am currently unable to properly process your request. Please try again."

# ========= MQTT Publish (trigger side effects after ready) =========
def publish_action_to_mqtt(action: str, robot_id: str = None):
    """
    Publish action to MQTT with optional robot_id targeting
    
    Args:
        action: The action to publish (e.g., "ready", "brew_americano")
        robot_id: Target robot ID (e.g., "wro1", "lab1"). Defaults to DEFAULT_ROBOT_ID
    """
    if robot_id is None:
        robot_id = DEFAULT_ROBOT_ID
    
    payload = json.dumps({"action": action, "robot_id": robot_id})
    mqtt_publish_single(MQTT_PUB_TOPIC, payload, CURRENT_MQTT_BROKER)
    print(f"[Backend] Published ACTION to {MQTT_PUB_TOPIC}: {payload}")

    # "ready" → convert to coffee start, and start POST + OCR (non-blocking)
    try:
        loop = asyncio.get_running_loop()
        if action == "ready" and loop.is_running():
            # Convert to EV3 event format: {event:"coffee", value:"start", robot_id:"xxx"}
            mqtt_publish_single(
                MQTT_PUB_TOPIC,
                json.dumps({
                    "event": "coffee",
                    "value": "start",
                    "robot_id": robot_id,
                    "ts": uuid.uuid4().hex
                }),
                CURRENT_MQTT_BROKER
            )
            print(f"[Backend] Published EVENT to {MQTT_PUB_TOPIC}: coffee/start for robot {robot_id}")
            loop.create_task(on_ready_side_effects())
    except RuntimeError:
        pass

# ========= Receive MQTT Message → Hand to AI → Reply =========
async def handle_mqtt_message(topic: str, raw_payload: str):
    try:
        distance = None
        user_text = raw_payload
        is_distance_event = False
        message_robot_id = None  # Robot ID from incoming message

        try:
            obj = json.loads(raw_payload)
            if isinstance(obj, dict):
                # Extract robot_id from message
                message_robot_id = obj.get("robot_id")
                
                if obj.get("distance") is not None:
                    try:
                        distance = int(obj.get("distance"))
                    except (ValueError, TypeError):
                        distance = None
                elif obj.get("distance_cm") is not None:  # Handle distance_cm field
                    try:
                        distance = int(obj.get("distance_cm"))
                    except (ValueError, TypeError):
                        distance = None

                if obj.get("event") == "start" and distance is not None and distance < 10:
                    # This is a distance event, should trigger name asking behavior
                    is_distance_event = True
                    user_text = f"Distance sensor triggered: {distance}cm, less than 10cm, start interacting with user"
                elif obj.get("action"):
                    user_text = str(obj.get("action"))
                else:
                    user_text = str(obj.get("text") or obj.get("message") or obj.get("content") or raw_payload)
        except Exception:
            pass
        
        # Filter by robot_id: only process if message is for us or is a broadcast
        if message_robot_id is not None:
            # Check if any connected WebSocket is configured for this robot_id
            matching_websockets = [ws for ws in connected_websockets.copy() if websocket_robot_map.get(ws) == message_robot_id]
            
            if not matching_websockets:
                print(f"[MQTT->AI] ⏭️  Skipping message for robot_id '{message_robot_id}' - no matching WebSocket connections")
                return  # No WebSocket is listening for this robot_id, skip processing
            
            print(f"[MQTT->AI] ✅ Processing message for robot_id '{message_robot_id}' - {len(matching_websockets)} matching connection(s)")
        else:
            # No robot_id in message - broadcast to all (backward compatibility)
            matching_websockets = list(connected_websockets.copy())
            print(f"[MQTT->AI] 📢 Broadcasting message (no robot_id) to all {len(matching_websockets)} connection(s)")

        user_text = user_text.strip() or "(empty message)"

        # Special handling: hello judges direct response, bypass AI
        if "hello judges" in user_text.lower():
            reply_text = "Hello judges! I am Xiao Ka, please wave! We are ready to move to the next stage!"
            # Record to conversation history for consistency
            mqtt_conversation.append({"role": "user", "content": user_text})
            print_context_remaining(mqtt_conversation, "MQTT hello judges")
            mqtt_conversation.append({"role": "assistant", "content": reply_text})
            trim_history(mqtt_conversation, max_messages=100)
        elif is_distance_event:
            # Distance event: directly trigger name asking and record to conversation history
            # Select response language based on user's previous language
            # Check if recent user messages contain Chinese characters
            recent_messages = [msg for msg in mqtt_conversation if msg["role"] == "user"][-3:]
            has_chinese = any(any('\u4e00' <= char <= '\u9fff' for char in msg["content"]) for msg in recent_messages)

            reply_text = "Hello there! I am Xiao Ka, nice to meet you! What's your name?"
            # Record distance event and AI response to conversation history
            mqtt_conversation.append({"role": "user", "content": user_text})
            print_context_remaining(mqtt_conversation, "MQTT distance event")
            mqtt_conversation.append({"role": "assistant", "content": reply_text})
            trim_history(mqtt_conversation, max_messages=100)
        else:
            # Normal AI processing flow
            mqtt_conversation.append({"role": "user", "content": user_text})
            print_context_remaining(mqtt_conversation, "MQTT normal AI")
            trim_history(mqtt_conversation, max_messages=100)

            ai_text = await get_gpt_response_async(mqtt_conversation)
            mqtt_conversation.append({"role": "assistant", "content": ai_text})
            trim_history(mqtt_conversation, max_messages=100)

            reply_text = ai_text

        # 建立回覆 payload
        reply_payload = {"type": "reply", "reply_to": topic, "text": reply_text, "ts": uuid.uuid4().hex}

        if mqtt_client:
            mqtt_client.publish(MQTT_REPLY_TOPIC, json.dumps(reply_payload), qos=0, retain=False)
            print(f"[MQTT->AI] Published reply -> {MQTT_REPLY_TOPIC}: {reply_payload}")
        else:
            print("[MQTT->AI] mqtt_client not ready; skip publish")

        # Only send to matching WebSocket connections
        for ws in matching_websockets:
            try:
                await ws.send_text(reply_text)
            except Exception as e:
                print(f"[WS] send_text failed: {e}")

        # Only synthesize TTS if there are matching connections
        if matching_websockets:
            asyncio.create_task(synthesize_and_broadcast_tts(reply_text))

    except Exception as e:
        print(f"[MQTT->AI] handle_mqtt_message error: {e}")

# ========= MQTT Events =========
async def broadcast_text_to_websockets(message: str):
    for ws in connected_websockets.copy():
        try:
            await ws.send_text(message)
        except Exception as e:
            print(f"[WS] broadcast_text failed: {e}")
            connected_websockets.discard(ws)

def on_connect(client: mqtt.Client, userdata, flags, rc, properties=None):
    print(f"[MQTT] on_connect callback - rc={rc}")
    
    # Connection result codes
    rc_messages = {
        0: "Connection successful",
        1: "Connection refused - incorrect protocol version",
        2: "Connection refused - invalid client identifier",
        3: "Connection refused - server unavailable",
        4: "Connection refused - bad username or password",
        5: "Connection refused - not authorized"
    }
    
    if rc == 0:
        print(f"[MQTT] ✅ Connected to {CURRENT_MQTT_BROKER}:{MQTT_PORT} successfully!")
        for t, q in MQTT_SUB_TOPICS:
            client.subscribe(t, qos=q)
            print(f"[MQTT] Subscribed to: {t} (qos={q})")
    else:
        error_msg = rc_messages.get(rc, f"Unknown error code: {rc}")
        print(f"[MQTT] ❌ Connection failed: {error_msg}")
        if rc == 4:
            print(f"[MQTT] Check MQTT_USERNAME and MQTT_PASSWORD in environment variables")
        elif rc == 5:
            print(f"[MQTT] Check MQTT broker permissions for user: {MQTT_USERNAME}")

def on_message(client: mqtt.Client, userdata, msg: mqtt.MQTTMessage):
    payload = msg.payload.decode("utf-8", errors="ignore")
    print(f"[MQTT] Received on {msg.topic}: {payload}")
    if MAIN_LOOP and MAIN_LOOP.is_running():
        asyncio.run_coroutine_threadsafe(handle_mqtt_message(msg.topic, payload), MAIN_LOOP)
    else:
        print("[MQTT] MAIN_LOOP not ready; dropping message")

def connect_mqtt(broker_host: str):
    global mqtt_client
    if mqtt_client is not None:
        try:
            mqtt_client.loop_stop()
            mqtt_client.disconnect()
        except Exception:
            pass

    print(f"[MQTT] Initializing connection to {broker_host}:{MQTT_PORT}")
    mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=f"fastapi-{uuid.uuid4().hex[:8]}")
    
    # Set username and password if provided
    if MQTT_USERNAME and MQTT_PASSWORD:
        mqtt_client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
        print(f"[MQTT] Using authentication - Username: {MQTT_USERNAME}")
    else:
        print(f"[MQTT] ⚠️ No authentication credentials provided")
    
    # Enable SSL/TLS if port 8883 or SSL flag is set
    if MQTT_USE_SSL or MQTT_PORT == 8883:
        mqtt_client.tls_set()  # Use default system CA certificates
        print(f"[MQTT] SSL/TLS enabled for secure connection")
    else:
        print(f"[MQTT] ⚠️ SSL/TLS disabled - using plain connection")
    
    mqtt_client.on_connect = on_connect
    mqtt_client.on_message = on_message
    
    print(f"[MQTT] Attempting to connect...")
    try:
        mqtt_client.connect(broker_host, MQTT_PORT, keepalive=60)
        mqtt_client.loop_start()
        print(f"[MQTT] Connection loop started for {broker_host}:{MQTT_PORT}")
        print(f"[MQTT] Waiting for on_connect callback...")
    except Exception as e:
        print(f"[MQTT] ❌ Connection error: {e}")
        import traceback
        traceback.print_exc()

# ========= API: Root / Welcome =========
@app.get("/")
async def root():
    return {
        "service": "XiaoKa Backend API",
        "status": "running",
        "version": "1.0",
        "default_robot_id": DEFAULT_ROBOT_ID,
        "endpoints": {
            "mqtt_broker": "/mqtt/broker",
            "robot_config": "/robot",
            "websocket": "/ws",
            "health": "/health",
            "test_say": "/test-say"
        },
        "websocket_commands": {
            "set_robot_id": {"type": "set_robot_id", "robot_id": "wro1"},
            "user_meta": {"type": "user_meta", "userName": "..."}
        }
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "mqtt_connected": mqtt_client is not None and mqtt_client.is_connected() if mqtt_client else False,
        "broker": CURRENT_MQTT_BROKER,
        "default_robot_id": DEFAULT_ROBOT_ID
    }

# ========= API: Robot Configuration =========
@app.get("/robot")
async def get_robot_config():
    """Get current robot configuration"""
    return {
        "default_robot_id": DEFAULT_ROBOT_ID,
        "active_connections": len(connected_websockets),
        "robot_assignments": {
            f"ws_{i}": robot_id 
            for i, (ws, robot_id) in enumerate(websocket_robot_map.items())
        }
    }

@app.post("/robot")
async def set_default_robot(request: Request):
    """Set the default robot ID for new connections"""
    global DEFAULT_ROBOT_ID
    body = await request.json()
    robot_id = body.get("robot_id")
    
    if not robot_id or not isinstance(robot_id, str):
        return {"ok": False, "error": "robot_id is required and must be a string"}
    
    DEFAULT_ROBOT_ID = robot_id
    print(f"[Config] Default robot_id changed to: {DEFAULT_ROBOT_ID}")
    return {
        "ok": True,
        "default_robot_id": DEFAULT_ROBOT_ID,
        "message": f"Default robot ID set to {robot_id}"
    }

# ========= API: Get / Set broker =========
@app.get("/mqtt/broker")
async def get_mqtt_broker():
    return {"broker": CURRENT_MQTT_BROKER}

@app.post("/mqtt/broker")
async def set_mqtt_broker(request: Request):
    global CURRENT_MQTT_BROKER
    body = await request.json()
    broker = (body or {}).get("broker")
    if not broker or not isinstance(broker, str):
        return {"ok": False, "error": "broker 必填"}
    CURRENT_MQTT_BROKER = broker.strip()
    connect_mqtt(CURRENT_MQTT_BROKER)
    return {"ok": True, "broker": CURRENT_MQTT_BROKER}

@app.post("/mqtt/test")
async def test_mqtt_connection():
    """Test if MQTT client is connected"""
    global mqtt_client
    try:
        if mqtt_client is None:
            return {"ok": False, "error": "MQTT client not initialized"}
        
        # Wait up to 3 seconds for connection to establish
        max_wait = 3.0
        wait_interval = 0.1
        elapsed = 0.0
        
        while not mqtt_client.is_connected() and elapsed < max_wait:
            await asyncio.sleep(wait_interval)
            elapsed += wait_interval
        
        # Check if client is connected after waiting
        if not mqtt_client.is_connected():
            return {"ok": False, "error": "Could not connect to MQTT broker. Please check broker address and network connection."}
        
        # Try a simple publish to verify connection
        result = mqtt_client.publish(MQTT_PUB_TOPIC, "connection_test", qos=0)
        
        # Wait a short time for the publish to complete
        await asyncio.sleep(0.1)
        
        if result.rc == mqtt.MQTT_ERR_SUCCESS or result.rc == 0:
            return {"ok": True, "message": "MQTT connection successful"}
        else:
            return {"ok": False, "error": f"MQTT publish failed with code {result.rc}"}
            
    except Exception as e:
        return {"ok": False, "error": f"Connection test failed: {str(e)}"}

@app.post("/test/language")
async def test_language_detection(request: Request):
    """测试语言检测功能"""
    body = await request.json()
    text = body.get("text", "")
    detected_lang = detect_language(text)
    return {
        "ok": True,
        "text": text,
        "detected_language": detected_lang,
        "chinese_chars": sum(1 for char in text if '\u4e00' <= char <= '\u9fff'),
        "total_chars": len(text.replace(' ', ''))
    }

# ========= WebSocket =========
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_websockets.add(websocket)
    conversations[websocket] = [{"role": "system", "content": SYSTEM_PROMPT}]
    # Initialize robot_id for this WebSocket connection
    websocket_robot_map[websocket] = DEFAULT_ROBOT_ID
    print(f"[WebSocket] New connection, default robot_id: {DEFAULT_ROBOT_ID}")
    
    try:
        while True:
            data = await websocket.receive_text()
            print(f"WS RX: {data}")
            
            # Try to parse as JSON for special commands
            try:
                maybe_json = json.loads(data)
                if isinstance(maybe_json, dict):
                    msg_type = maybe_json.get("type")
                    
                    # Handle user_meta (existing)
                    if msg_type == "user_meta":
                        continue
                    
                    # Handle robot_id setting
                    if msg_type == "set_robot_id":
                        robot_id = maybe_json.get("robot_id", DEFAULT_ROBOT_ID)
                        websocket_robot_map[websocket] = robot_id
                        print(f"[WebSocket] Robot ID set to: {robot_id}")
                        await websocket.send_text(json.dumps({
                            "type": "robot_id_set",
                            "robot_id": robot_id
                        }))
                        continue
            except Exception:
                pass

            # Special handling: hello judges direct response, bypass AI
            if "hello judges" in data.lower():
                response_text = "Hello judges! I am Xiao Ka, please wave! We are ready to move to the next stage!"
                detected_action = None
                # Record to conversation history
                conversations[websocket].append({"role": "user", "content": data})
                print_context_remaining(conversations[websocket], "WebSocket hello judges")
                conversations[websocket].append({"role": "assistant", "content": response_text})
                print("Direct response for hello judges:", response_text)
                asyncio.create_task(synthesize_and_broadcast_tts(response_text))
                await websocket.send_text(response_text)
                continue
            else:
                conversations[websocket].append({"role": "user", "content": data})
                print_context_remaining(conversations[websocket], "WebSocket normal message")
                detected_action, response_text = await process_user_message(conversations[websocket], data)
                print(f"[DEBUG] detected_action={detected_action}, response_text='{response_text}'")

            if detected_action:
                # Get robot_id for this WebSocket connection
                robot_id = websocket_robot_map.get(websocket, DEFAULT_ROBOT_ID)
                
                if detected_action == "ready_event":
                    # ready 意圖：不發布 action，直接發布 event 到 MQTT
                    print(f"[READY] Detected ready intention for robot: {robot_id}")
                    
                    # Check MQTT client connection
                    mqtt_connected = mqtt_client is not None and mqtt_client.is_connected() if mqtt_client else False
                    print(f"[MQTT] Client connected: {mqtt_connected}")
                    
                    try:
                        loop = asyncio.get_running_loop()
                        if loop.is_running():
                            # 發布 coffee start event with robot_id
                            event_payload = json.dumps({
                                "event": "coffee",
                                "value": "start",
                                "robot_id": robot_id,
                                "ts": uuid.uuid4().hex
                            })
                            print(f"[MQTT] Publishing: {event_payload} to {MQTT_PUB_TOPIC}")
                            
                            mqtt_publish_single(
                                MQTT_PUB_TOPIC,
                                event_payload,
                                CURRENT_MQTT_BROKER
                            )
                            print(f"[Backend] ✅ Published EVENT to {MQTT_PUB_TOPIC}: coffee/start for robot {robot_id}")
                            loop.create_task(on_ready_side_effects())
                        else:
                            print(f"[ERROR] Event loop not running!")
                    except RuntimeError as e:
                        print(f"[ERROR] RuntimeError: {e}")
                    except Exception as e:
                        print(f"[ERROR] Exception publishing MQTT: {e}")
                        import traceback
                        traceback.print_exc()
                else:
                    # 其他 action 照常處理，傳入 robot_id
                    publish_action_to_mqtt(detected_action, robot_id)

                # Always send response text, even if empty
                if response_text:
                    conversations[websocket].append({"role": "assistant", "content": response_text})
                    await websocket.send_text(response_text)
                    asyncio.create_task(synthesize_and_broadcast_tts(response_text))
                    print(f"ChatGPT response (action: {detected_action}): {response_text}")
                else:
                    print(f"[WARN] No response text for action: {detected_action}")
                continue

            conversations[websocket].append({"role": "assistant", "content": response_text})
            print("ChatGPT response:", response_text)
            asyncio.create_task(synthesize_and_broadcast_tts(response_text))
            await websocket.send_text(response_text)

    except WebSocketDisconnect:
        connected_websockets.remove(websocket)
        conversations.pop(websocket, None)
        websocket_robot_map.pop(websocket, None)
        print("WebSocket disconnected.")

# ========= Test API =========
@app.post("/test-say")
async def test_say(request: Request):
    body = await request.json()
    action = body.get("action", "test")
    message = body.get("message", "")

    if message:
        temp = mqtt_conversation.copy()
        temp.append({"role": "user", "content": message})
        ai_response = await get_gpt_response_async(temp)
        await broadcast_text_to_websockets(ai_response)
        asyncio.create_task(synthesize_and_broadcast_tts(ai_response))
        mqtt_conversation.append({"role": "user", "content": message})
        print_context_remaining(mqtt_conversation, "Test endpoint")
        mqtt_conversation.append({"role": "assistant", "content": ai_response})
        trim_history(mqtt_conversation, max_messages=100)
        return {"status": "ok", "message": message, "ai_response": ai_response, "via": "websocket+ai"}

    publish_action_to_mqtt(action)
    return {"status": "ok", "action": action, "via": "mqtt"}

# ========= [VOICE-CONFIG] 語音品質控制 =========
@app.get("/voice/config")
async def get_voice_config():
    """獲取當前語音配置"""
    return {
        "ok": True,
        "config": {
            "speed": 1.05,
            "fade_duration": 100,
            "compression_threshold": -20.0,
            "compression_ratio": 2.0,
            "high_pass_filter": 80,
            "bitrate": "128k",
            "quality": 2
        }
    }

@app.post("/voice/config")
async def set_voice_config(request: Request):
    """設置語音效果參數（實驗性功能）"""
    body = await request.json()
    config = body.get("config", {})
    
    # 這裡可以存儲配置到全域變數或資料庫
    # 目前只返回確認，實際應用需要修改 apply_voice_effects 函數
    
    return {
        "ok": True,
        "message": "語音配置已更新（重啟後生效）",
        "config": config
    }
@app.post("/test/distance")
async def test_distance(request: Request):
    """
    用 HTTP 模擬一個距離事件，讓後端走和 MQTT 一樣的邏輯
    body 範例:
    {
      "distance_cm": 5,
      "publish_mqtt": true,    // 選擇性：是否真的發到 MQTT broker
      "robot_id": "wro1"       // 選擇性：指定目標機器人 ID
    }
    """
    body = await request.json()
    print(f"[DEBUG /test/distance] Received body: {body}")  # DEBUG
    distance = int(body.get("distance_cm", 5))
    publish_mqtt = bool(body.get("publish_mqtt", True))
    robot_id = body.get("robot_id", DEFAULT_ROBOT_ID)  # Use provided robot_id or default
    print(f"[DEBUG /test/distance] Extracted robot_id: {robot_id}")  # DEBUG

    # 組成一個和 MQTT 收到一樣格式的 payload，包含 robot_id
    payload = {
        "event": "start",
        "distance_cm": distance,
        "robot_id": robot_id  # Include robot_id in payload
    }
    raw_payload = json.dumps(payload)

    # 選擇性：真的發一筆到 MQTT broker 的 robot/notify
    if publish_mqtt:
        mqtt_publish_single("robot/notify", raw_payload, CURRENT_MQTT_BROKER)
        print(f"[HTTP /test/distance] Published to MQTT robot/notify: {payload}")

    # 無論如何，都走一次原本的處理邏輯（距離 < 10cm → 問名字）
    await handle_mqtt_message("robot/notify", raw_payload)

    response = {
        "ok": True,
        "via": "http",
        "payload": payload,
        "robot_id": robot_id,
        "message": f"Test message sent for robot: {robot_id}"
    }
    print(f"[DEBUG /test/distance] Returning response: {response}")  # DEBUG
    return response

# ========= Main Entry Point for Production =========
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))  # Render provides PORT env var
    uvicorn.run(
        "main:app",
        host="0.0.0.0",  # Required for Render to access
        port=port,
        log_level="info"
    )
