# pc_publisher_yolo_toggle.py
# Press 'M' key to toggle Mirror/Normal mode
# Automatically corrects left/right hand mapping logic based on the mode

import cv2, time, os, json
import numpy as np
import paho.mqtt.client as mqtt
from ultralytics import YOLO

# ========= MQTT Configuration =========
USE_CLOUD_BROKER = True  
CLOUD_BROKER = "i27312ff.ala.asia-southeast1.emqxsl.com"
CLOUD_PORT = 8883 
CLOUD_USERNAME = "wro-robot"
CLOUD_PASSWORD = "V!cT0rl11"

LOCAL_BROKER = "192.168.1.3" 
LOCAL_PORT = 1883

MQTT_BROKER = CLOUD_BROKER if USE_CLOUD_BROKER else LOCAL_BROKER
MQTT_PORT = CLOUD_PORT if USE_CLOUD_BROKER else LOCAL_PORT

ONE_TOPIC    = "robot/events" 
SECOND_TOPIC = "robot/waves"   
TARGET_ROBOT_ID = "wro1" 

# ========= Setup MQTT Client =========
try:
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1)
except (TypeError, AttributeError):
    client = mqtt.Client()

if USE_CLOUD_BROKER:
    try:
        client.username_pw_set(CLOUD_USERNAME, CLOUD_PASSWORD)
        client.tls_set() 
        print(f"MQTT SSL/TLS enabled")
    except Exception as e:
        print(f"SSL setup error: {e}")

print(f"Connecting to: {MQTT_BROKER}:{MQTT_PORT}")
try:
    client.connect_async(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_start()
    print(f"✅ MQTT connected!")
except Exception as e:
    print(f"❌ MQTT error: {e}")

def publish_event(event, value, topic):
    payload = json.dumps({
        "event": event,
        "value": value,
        "robot_id": TARGET_ROBOT_ID 
    })
    if topic == 2:
        client.publish(SECOND_TOPIC, payload, qos=0)
    client.publish(ONE_TOPIC, payload, qos=0)
    print(f"PUB: {payload}")

# ========= Detection parameters =========
CENTER_LEFT_RATIO, CENTER_RIGHT_RATIO = 0.40, 0.50
DX_L, DX_R = 0.05, 0.05
DT = 0.7       
COOLDOWN = 1.5 
SHOW_MS = 600  
POS_HEARTBEAT = 0.5

# ========= Camera =========
cap = cv2.VideoCapture(0, cv2.CAP_DSHOW) 
cv2.namedWindow("YOLO Control", cv2.WINDOW_NORMAL)
cv2.resizeWindow("YOLO Control", 960, 720)

print("Loading YOLOv8 model...")
model = YOLO('yolov8n-pose.pt')

# State variables
last_x_R, last_t_R = None, None
last_x_L, last_t_L = None, None
show_until, show_text = 0.0, ""
last_pos_sent_value, last_pos_sent_time = "", 0.0

# ★★★ Control Variable: Default to Mirror Mode. Press 'M' if incorrect. ★★★
IS_MIRRORED = True 

while True:
    ok, frame = cap.read()
    if not ok: break

    # 1. Flip frame based on the toggle switch
    if IS_MIRRORED:
        frame = cv2.flip(frame, 1)

    h, w = frame.shape[:2]
    now = time.time()

    # 2. Run Inference
    results = model(frame, verbose=False, conf=0.5) 
    
    location_text = ""
    pos = None

    if results and len(results[0].keypoints) > 0:
        kpts = results[0].keypoints.data[0].cpu().numpy()
        
        # ★★★ Dynamic Index Mapping ★★★
        if IS_MIRRORED:
            # In Mirror Mode: YOLO sees "Left Hand (ID 9)" but it is actually the user's "Right Hand".
            # We need to swap the indices logic.
            IDX_L_SHOULDER = 6   # YOLO Right Shoulder -> Real Left Shoulder
            IDX_R_SHOULDER = 5   # YOLO Left Shoulder -> Real Right Shoulder
            IDX_L_WRIST    = 10  # YOLO Right Wrist -> Real Left Wrist
            IDX_R_WRIST    = 9   # YOLO Left Wrist -> Real Right Wrist
            IDX_L_HIP      = 12
            IDX_R_HIP      = 11
        else:
            # In Normal Mode: Direct mapping to standard COCO indices.
            IDX_L_SHOULDER = 5
            IDX_R_SHOULDER = 6
            IDX_L_WRIST    = 9
            IDX_R_WRIST    = 10
            IDX_L_HIP      = 11
            IDX_R_HIP      = 12

        # Simple check if shoulders are detected (using mapped IDs)
        if kpts[IDX_L_SHOULDER][2] > 0.3 and kpts[IDX_R_SHOULDER][2] > 0.3:
            
            # Draw skeleton (labels=False prevents mirrored text)
            annotated_frame = results[0].plot(img=frame, labels=False, conf=False, boxes=False)
            
            def get_norm_point(index):
                px, py, conf = kpts[index]
                return px / w, py / h, conf

            # ===== 1. Position Logic (Left / Center / Right) =====
            lh_x, _, _ = get_norm_point(IDX_L_HIP) 
            rh_x, _, _ = get_norm_point(IDX_R_HIP)
            
            cx_ratio = (lh_x + rh_x) / 2.0
            cx_pixel = int(cx_ratio * w)
            
            left_px = int(CENTER_LEFT_RATIO * w)
            right_px = int(CENTER_RIGHT_RATIO * w)

            # Logic is based on visual position on screen:
            # If person is on the right side of the screen -> Right
            
            if left_px <= cx_pixel <= right_px:
                location_text, pos = "Center", "center"
            elif cx_pixel < left_px:
                location_text, pos = "Left", "left"
            else:
                location_text, pos = "Right", "right"

            # ===== 2. Right Hand Wave (Physical Right Hand) =====
            rw_x, rw_y, _ = get_norm_point(IDX_R_WRIST)
            rs_x, rs_y, _ = get_norm_point(IDX_R_SHOULDER)
            
            above_R = (rw_y < rs_y)

            if last_x_R is not None and last_t_R is not None:
                dx_R = abs(rw_x - last_x_R)
                dt_R = now - last_t_R
                if dx_R > DX_R and dt_R < DT and above_R and (now > show_until + COOLDOWN):
                    show_text = "Right Wave!"
                    show_until = now + SHOW_MS/1000.0
                    publish_event("wave", "R", 2)
            last_x_R, last_t_R = rw_x, now

            # ===== 3. Left Hand Wave (Physical Left Hand) =====
            lw_x, lw_y, _ = get_norm_point(IDX_L_WRIST)
            ls_x, ls_y, _ = get_norm_point(IDX_L_SHOULDER)
            
            above_L = (lw_y < ls_y)

            if last_x_L is not None and last_t_L is not None:
                dx_L = abs(lw_x - last_x_L)
                dt_L = now - last_t_L
                if dx_L > DX_L and dt_L < DT and above_L and (now > show_until + COOLDOWN):
                    show_text = "Left Wave!"
                    show_until = now + SHOW_MS/1000.0
                    # [USER REQUEST] Left wave still sends "R"
                    publish_event("wave", "R", 2) 
                    
            last_x_L, last_t_L = lw_x, now
        else:
            annotated_frame = frame
    else:
        annotated_frame = frame

    # ===== Send position heartbeat =====
    if pos:
        if (pos != last_pos_sent_value) or (now - last_pos_sent_time > POS_HEARTBEAT):
            publish_event("pos", pos, 1)
            last_pos_sent_value = pos
            last_pos_sent_time  = now

    display = annotated_frame
    
    cv2.rectangle(display, (int(CENTER_LEFT_RATIO*w), 0), (int(CENTER_RIGHT_RATIO*w), h), (255,255,0), 2)

    # Display current mode
    mode_str = "Mode: MIRROR" if IS_MIRRORED else "Mode: NORMAL"
    cv2.putText(display, mode_str, (10, h - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
    cv2.putText(display, "[M] to toggle", (10, h - 50), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

    if location_text:
        cv2.putText(display, location_text, (30, 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.1, (255,255,255), 2, cv2.LINE_AA)

    if time.time() < show_until and show_text:
        cv2.putText(display, show_text, (30, 70),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.6, (0,0,255), 4, cv2.LINE_AA)

    cv2.imshow("YOLO Control", display)
    
    # Keyboard listener
    key = cv2.waitKey(1) & 0xFF
    if key == 27: # ESC to exit
        break
    elif key == ord('m') or key == ord('M'):
        IS_MIRRORED = not IS_MIRRORED # Toggle mode
        print(f"Switched Mirror Mode to: {IS_MIRRORED}")

cap.release()
cv2.destroyAllWindows()
client.loop_stop()
client.disconnect()
