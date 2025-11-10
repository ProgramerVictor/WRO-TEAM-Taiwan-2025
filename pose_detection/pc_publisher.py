# pc_publisher.py
# Publish to a single topic: robot/events (plus optional SECOND_TOPIC for waves)
# payload: {"event":"pos","value":"left|center|right"} (periodic heartbeat)
#          {"event":"wave","value":"R"} (right-hand wave)
#          {"event":"wave","value":"L"} (left-hand wave)

import cv2, time, os, json
import numpy as np
import paho.mqtt.client as mqtt
from mediapipe.python.solutions import pose as mp_pose
from mediapipe.python.solutions import drawing_utils as mp_drawing

# ========= MQTT Configuration =========
# Set USE_CLOUD_BROKER = True to use EMQX Cloud, False for local testing
USE_CLOUD_BROKER = True  # Change to True for competition/production

# Cloud MQTT (EMQX)
CLOUD_BROKER = "i27312ff.ala.asia-southeast1.emqxsl.com"
CLOUD_PORT = 8883  # SSL/TLS port
CLOUD_USERNAME = "wro-robot"
CLOUD_PASSWORD = "V!cT0rl11"

# Local MQTT (for testing)
LOCAL_BROKER = "192.168.1.3"  # Your PC IP
LOCAL_PORT = 1883

# Choose broker based on mode
MQTT_BROKER = CLOUD_BROKER if USE_CLOUD_BROKER else LOCAL_BROKER
MQTT_PORT = CLOUD_PORT if USE_CLOUD_BROKER else LOCAL_PORT

# Topics
ONE_TOPIC    = "robot/events"  # Main topic for all events
SECOND_TOPIC = "robot/waves"   # Optional second topic for waves

# Target Robot ID (which robot should respond to these messages)
TARGET_ROBOT_ID = "wro1"  # Change to "wro2", "lab1", etc. for different robots

# ========= Setup MQTT Client =========
try:
    # Try new API (paho-mqtt v2.0+)
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1)
    print("Using paho-mqtt v2.0+ API")
except (TypeError, AttributeError):
    # Fall back to old API (paho-mqtt v1.x)
    client = mqtt.Client()
    print("Using paho-mqtt v1.x API")

# Enable SSL/TLS for cloud broker
if USE_CLOUD_BROKER:
    try:
        client.username_pw_set(CLOUD_USERNAME, CLOUD_PASSWORD)
        client.tls_set()  # Use default CA certificates
        print(f"MQTT SSL/TLS enabled for cloud broker")
    except Exception as e:
        print(f"SSL setup error: {e}")

print(f"Connecting to MQTT broker: {MQTT_BROKER}:{MQTT_PORT}")
print(f"Target Robot ID: {TARGET_ROBOT_ID}")

try:
    client.connect_async(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_start()
    print(f"✅ MQTT connected successfully!")
except Exception as e:
    print(f"❌ MQTT connection error: {e}")

def publish_event(event, value, topic):
    """
    Publish {"event": event, "value": value, "robot_id": TARGET_ROBOT_ID} 
    to ONE_TOPIC and optionally SECOND_TOPIC.
    """
    payload = json.dumps({
        "event": event,
        "value": value,
        "robot_id": TARGET_ROBOT_ID  # Include robot_id for targeting
    })
    
    if topic == 2:
        client.publish(SECOND_TOPIC, payload, qos=0)
    
    client.publish(ONE_TOPIC, payload, qos=0)
    print(f"PUB [{TARGET_ROBOT_ID}]:", payload)

# ========= Detection parameters =========
# Central band (narrower band = stricter "center")
CENTER_LEFT_RATIO, CENTER_RIGHT_RATIO = 0.40, 0.50

# Wave detection: wrist above shoulder + sufficiently large horizontal displacement in short time
DX_L = 0.05
DX_R = 0.05 # displacement threshold in normalized x (0~1). Smaller = more sensitive.
DT = 0.7       # must happen within DT seconds
COOLDOWN = 1.5 # minimum time between wave messages (seconds)
SHOW_MS = 600  # on-screen hint duration (milliseconds)

# Position heartbeat: even if unchanged, send every HB seconds to avoid EV3 timeout
POS_HEARTBEAT = 0.5

# ========= Camera =========
cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)  # On Windows, CAP_DSHOW is often more reliable
if not cap.isOpened():
    raise SystemExit("ERROR: cannot open camera")

cv2.namedWindow("Camera + Pose (publisher)", cv2.WINDOW_NORMAL)
cv2.resizeWindow("Camera + Pose (publisher)", 960, 720)

# State for right-hand wave
last_x_R = None
last_t_R = None
# State for left-hand wave
last_x_L = None
last_t_L = None

# Display timing
show_until = 0.0
show_text = ""

# Last sent position (for heartbeat)
last_pos_sent_value = ""
last_pos_sent_time  = 0.0

with mp_pose.Pose(
    static_image_mode=False,
    model_complexity=1,
    enable_segmentation=False,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
) as pose:

    while True:
        ok, frame = cap.read()
        if not ok:
            print("ERROR: cannot read frame")
            break

        # 1) Run inference on the unflipped frame (so left/right are correct)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        res = pose.process(rgb)
        now = time.time()
        h, w = frame.shape[:2]

        location_text = ""
        pos = None

        if res.pose_landmarks:
            # Draw pose skeleton on the original (unflipped) frame
            mp_drawing.draw_landmarks(
                frame, res.pose_landmarks, mp_pose.POSE_CONNECTIONS,
                mp_drawing.DrawingSpec((0,255,0), 2, 2),
                mp_drawing.DrawingSpec((0,0,255), 2, 2)
            )

            lm = res.pose_landmarks.landmark

            # ===== Center/Left/Right via hip midpoint =====
            lh = lm[mp_pose.PoseLandmark.LEFT_HIP]
            rh = lm[mp_pose.PoseLandmark.RIGHT_HIP]
            cx = int(((lh.x + rh.x)/2.0) * w)
            left_px, right_px = int(CENTER_LEFT_RATIO*w), int(CENTER_RIGHT_RATIO*w)

            if left_px <= cx <= right_px:
                location_text, pos = "Center", "center"
            elif cx < left_px:
                location_text, pos = "Left", "left"
            else:
                location_text, pos = "Right", "right"

            # ===== Right-hand wave (wrist above shoulder + fast horizontal move) =====
            rw = lm[mp_pose.PoseLandmark.RIGHT_WRIST]
            rs = lm[mp_pose.PoseLandmark.RIGHT_SHOULDER]
            cur_x_R = rw.x
            above_R = (rw.y < rs.y)

            if last_x_R is not None and last_t_R is not None:
                dx_R = abs(cur_x_R - last_x_R)
                dt_R = now - last_t_R
                if dx_R > DX_R and dt_R < DT and above_R and (now > show_until + COOLDOWN):
                    show_text = "Right Wave!"
                    show_until = now + SHOW_MS/1000.0
                    publish_event("wave", "R", 2)
            last_x_R, last_t_R = cur_x_R, now

            # ===== Left-hand wave (wrist above shoulder + fast horizontal move) =====
            lw = lm[mp_pose.PoseLandmark.LEFT_WRIST]
            ls = lm[mp_pose.PoseLandmark.LEFT_SHOULDER]
            cur_x_L = lw.x
            above_L = (lw.y < ls.y)

            if last_x_L is not None and last_t_L is not None:
                dx_L = abs(cur_x_L - last_x_L)
                dt_L = now - last_t_L
                if dx_L > DX_L and dt_L < DT and above_L and (now > show_until + COOLDOWN):
                    show_text = "Left Wave!"
                    show_until = now + SHOW_MS/1000.0
                    publish_event("wave", "R", 2)
            last_x_L, last_t_L = cur_x_L, now

        # ===== Send position (on change or heartbeat interval) =====
        if pos:
            if (pos != last_pos_sent_value) or (now - last_pos_sent_time > POS_HEARTBEAT):
                publish_event("pos", pos, 1)
                last_pos_sent_value = pos
                last_pos_sent_time  = now

        # 2) Display (flip horizontally at the end so the preview feels natural)
        display = cv2.flip(frame, 1)
        left_px, right_px = int(CENTER_LEFT_RATIO*w), int(CENTER_RIGHT_RATIO*w)
        cv2.rectangle(display, (left_px, 0), (right_px, h), (255,255,0), 2)

        # Draw English overlays only (no CJK font logic)
        if location_text:
            cv2.putText(display, location_text, (30, 25),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.1, (255,255,255), 2, cv2.LINE_AA)

        if time.time() < show_until and show_text:
            cv2.putText(display, show_text, (30, 70),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.6, (0,0,255), 4, cv2.LINE_AA)

        cv2.imshow("Camera + Pose (publisher)", display)
        if cv2.waitKey(1) & 0xFF == 27:  # ESC to exit
            break

cap.release()
cv2.destroyAllWindows()
client.loop_stop()
client.disconnect()
