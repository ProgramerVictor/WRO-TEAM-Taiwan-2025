#!/usr/bin/env python3
# coding: utf-8
# ev3_patrol_track_advance_with_notify_outputsafe.py
# PATROL(蛇形+擺頭) → TRACK(對準等待揮手，頭回正) → ADVANCE(前進接近)
# 額外：強化 VS Code Output 收到日誌（stdout+stderr + 取消緩衝 + 心跳輸出）

import json, time, sys, os
import paho.mqtt.client as mqtt
from ev3dev2.motor import MoveTank, MediumMotor, OUTPUT_A, OUTPUT_B, OUTPUT_C, OUTPUT_D, SpeedPercent
from ev3dev2.sensor.lego import UltrasonicSensor
from ev3dev2.sound import Sound

# ========== 讓 VS Code Output 一定看得到 ==========
def _set_line_buffered(stream):
    try:
        # Py 3.7+ 支援
        stream.reconfigure(line_buffering=True)
        return stream
    except Exception:
        try:
            return os.fdopen(stream.fileno(), 'w', 1)  # 1 = line buffered
        except Exception:
            return stream

sys.stdout = _set_line_buffered(sys.stdout)
sys.stderr = _set_line_buffered(sys.stderr)

def log(*args):
    s = " ".join(str(a) for a in args)
    # 同時寫到 stdout / stderr（外掛兩邊都吃得到）
    try:
        sys.stdout.write(s + "\n"); sys.stdout.flush()
    except Exception:
        pass
    try:
        sys.stderr.write(s + "\n"); sys.stderr.flush()
    except Exception:
        pass

# ===== MQTT Configuration =====
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
BROKER_IP = CLOUD_BROKER if USE_CLOUD_BROKER else LOCAL_BROKER
MQTT_PORT = CLOUD_PORT if USE_CLOUD_BROKER else LOCAL_PORT

# Topics
TOPIC_IN     = "robot/events"   # Receive: pos, wave, coffee commands
NOTIFY_TOPIC = "robot/notify"   # Send: notifications to backend

# Robot ID (IMPORTANT: Change this for each robot!)
ROBOT_ID = "wro1"  # Options: wro1, wro2, lab1, etc.

# ===== 方向/行為參數 =====
YAW_DIR     = 1       # 左右反了就 -1
FORWARD_DIR = -1      # 前後反了就 -1

# 巡航（沒人時）蛇形
PATROL_SPEED   = 20
PATROL_SWAY    = 6
PATROL_PERIOD  = 1.2

# 對準（原地轉向）
TURN_SPEED     = 10

# 前進接近
BASE_SPEED     = 20
STEER_GAIN     = 10
STOP_CM        = 5

# 時間條件
NO_POS_TIMEOUT     = 4.0
PRESENCE_HOLD_SEC  = 1.5
ADVANCE_TMAX       = 12.0

# 頭部（齒輪/掃描）
GEAR_RATIO     = 56.0
HEAD_SIGN      = 1
HEAD_SPEED     = 100
HEAD_LEFT_OUT  = +45
HEAD_RIGHT_OUT = -45
HEAD_PERIOD    = 6.0
BACKLASH_OUT   = 2.0

# ===== 裝置 =====
tank = MoveTank(OUTPUT_B, OUTPUT_C)
us   = UltrasonicSensor()
head = MediumMotor(OUTPUT_D)
snd  = Sound()
hand = MediumMotor(OUTPUT_A)
# ===== 狀態 =====
STATE_PATROL  = "PATROL"
STATE_TRACK   = "TRACK"
STATE_ADVANCE = "ADVANCE"
state = STATE_PATROL

last_pos       = None
last_pos_time  = 0.0
have_person_until = 0.0
wave_request   = False
advance_start  = 0.0
move = 0
END = 0
ALL_START = 0
# 頭部掃描狀態
try:
    head.stop_action = 'hold'
    head.ramp_up_sp = 300; head.ramp_down_sp = 300
except Exception:
    pass

head_zero_motor_deg = head.position
head_target_out = HEAD_LEFT_OUT
next_swing_time = 0.0
last_dir_sign = 0
head_scanning = True

def out_to_motor_deg(out_deg):
    return head_zero_motor_deg + int(round(out_deg * GEAR_RATIO * HEAD_SIGN))

def head_to(out_deg, speed_pct=HEAD_SPEED, block=False):
    global last_dir_sign
    if out_deg > HEAD_LEFT_OUT: out_deg = HEAD_LEFT_OUT
    if out_deg < HEAD_RIGHT_OUT: out_deg = HEAD_RIGHT_OUT
    dir_sign = 1 if out_deg >= 0 else -1
    bias = (BACKLASH_OUT * dir_sign) if dir_sign != last_dir_sign else 0.0
    last_dir_sign = dir_sign
    try:
        head.on_to_position(SpeedPercent(speed_pct), out_to_motor_deg(out_deg + bias), block=block)
    except Exception:
        pass

def swing_head(now):
    global next_swing_time, head_target_out
    if now >= next_swing_time:
        head_target_out = HEAD_RIGHT_OUT if head_target_out == HEAD_LEFT_OUT else HEAD_LEFT_OUT
        head_to(head_target_out, speed_pct=HEAD_SPEED, block=False)
        next_swing_time = now + HEAD_PERIOD

def center_head():
    head_to(0.0, speed_pct=HEAD_SPEED, block=False)

# ===== MQTT: 接收（影像端→EV3） =====
def on_connect_in(c, u, f, rc):
    log("[DEBUG] on_connect_in callback fired! rc=", rc)
    log("RX-MQTT connected rc=", rc, "broker=", BROKER_IP)
    if rc == 0:
        c.subscribe(TOPIC_IN)
        log("RX-MQTT subscribed:", TOPIC_IN)
    else:
        log("[ERROR] RX-MQTT connection failed with rc=", rc)

def on_message_in(c, u, msg):
    global last_pos, last_pos_time, wave_request, have_person_until, move, ALL_START, END
    t = time.time()
    log("[DEBUG] on_message_in fired! Topic:", msg.topic, "Payload:", msg.payload.decode())
    try:
        p = json.loads(msg.payload.decode())
        ev, val = p.get("event"), p.get("value")
        msg_robot_id = p.get("robot_id")
        
        # Filter by robot_id (ignore messages for other robots)
        if msg_robot_id and msg_robot_id != ROBOT_ID:
            log("[IGNORE] Message for robot '{}', I am '{}'".format(msg_robot_id, ROBOT_ID))
            return
        
        # Process messages for this robot
        if ev == "pos" and (val in ("left","center","right")):
            last_pos = val
            last_pos_time = t
            have_person_until = t + PRESENCE_HOLD_SEC
            log("RX pos:", val)
        elif ev == "wave" and val == "R":
            ALL_START = 1
            move = 1
            wave_request = True
            last_pos_time = t
            have_person_until = t + PRESENCE_HOLD_SEC
            log("RX wave: R ->", ROBOT_ID)
        elif ev == "coffee" and val == "start":
            log("[{}] RX coffee start command!".format(ROBOT_ID))
            hand.on_for_degrees(SpeedPercent(100), -90, brake=True, block=True)
            END = 1
            log("Coffee action complete")
            time.sleep(10)
            hand.on_for_degrees(SpeedPercent(100), 90, brake=True, block=True)
        else:
            log("RX unknown:", ev, "val:", val)
    except Exception as e:
        log("parse error:", e)

client_in = mqtt.Client(protocol=mqtt.MQTTv311)

# Enable SSL/TLS for cloud broker
if USE_CLOUD_BROKER:
    try:
        client_in.username_pw_set(CLOUD_USERNAME, CLOUD_PASSWORD)
        client_in.tls_set()  # Use default CA certificates
        log("MQTT SSL/TLS enabled for cloud broker")
    except Exception as e:
        log("SSL setup error:", e)

client_in.on_connect = on_connect_in
client_in.on_message = on_message_in

log("[DEBUG] RX-MQTT: About to connect to {}:{}".format(BROKER_IP, MQTT_PORT))
try:
    client_in.connect(BROKER_IP, MQTT_PORT, 60)
    log("[DEBUG] RX-MQTT: connect() call succeeded")
    client_in.loop_start()
    log("[DEBUG] RX-MQTT: loop_start() called")
    log("Connecting to MQTT broker: {}:{}".format(BROKER_IP, MQTT_PORT))
except Exception as e:
    log("MQTT connection error:", e)
    import traceback
    traceback.print_exc()

# ===== MQTT: 通知（EV3→Backend） =====
notify = mqtt.Client(protocol=mqtt.MQTTv311)

# Enable SSL/TLS for cloud broker (notify channel)
if USE_CLOUD_BROKER:
    try:
        notify.username_pw_set(CLOUD_USERNAME, CLOUD_PASSWORD)
        notify.tls_set()
        log("TX-MQTT SSL/TLS enabled")
    except Exception as e:
        log("TX-MQTT SSL setup error:", e)

notify_connected = False
def on_connect_notify(c, u, f, rc):
    global notify_connected
    notify_connected = True
    log("TX-MQTT connected rc=", rc, "broker=", BROKER_IP)

notify.on_connect = on_connect_notify
try:
    notify.connect_async(BROKER_IP, MQTT_PORT, 60)
    notify.loop_start()
    log("TX-MQTT connecting to {}:{}".format(BROKER_IP, MQTT_PORT))
except Exception as _e:
    log("TX-MQTT connect_async failed:", _e)

def notify_event(event, topic, **kv):
    payload = {
        "event": event, 
        "ts": int(time.time()),
        "robot_id": ROBOT_ID  # CRITICAL: Include robot_id for backend filtering
    }
    payload.update(kv)
    
    try:
        if topic == "hello":
            # Special "hello" message with action + robot_id
            pl = json.dumps({
                "action": "Say something like hello judges, then use the system prompt I give you to start the conversation, dont say too many things",
                "robot_id": ROBOT_ID  # CRITICAL: Include robot_id here too
            })
            notify.publish(NOTIFY_TOPIC, pl, qos=0)
            log("TX [hello]:", pl)
        else:
            # Standard event message with robot_id
            notify.publish(NOTIFY_TOPIC, json.dumps(payload), qos=0)
            log("TX:", payload)
    except Exception as e:
        log("TX error:", e)

# ===== 心跳輸出（每 N 秒印一次狀態，方便在 Output 監看）=====
DEBUG_HEARTBEAT_SEC = 2.0
_last_hb = 0.0
def heartbeat(now, dist_cm):
    global _last_hb
    if now - _last_hb >= DEBUG_HEARTBEAT_SEC:
        _last_hb = now
        log("[HB] state=", state, "pos=", last_pos, "dist_cm=", int(dist_cm))

# ===== 主迴圈 =====
try:
    log("=== PROGRAM START ===")
    log("BROKER_IN =", BROKER_IP, "TOPIC_IN =", TOPIC_IN)
    log("BROKER_NOTIFY =", BROKER_IP, "TOPIC =", NOTIFY_TOPIC)
    dist_cm = 255
    #hand.on_for_degrees(SpeedPercent(100), 90, brake=True, block=True)
    while True:
        try:
            dist_cm = us.distance_centimeters
        except Exception:
            dist_cm = 255
        #log("dist_cm = ",dist_cm)
        log("ALL_START = ",ALL_START)
        if ALL_START == 1:
            break
            #pass
        time.sleep(0.5)
    #tank.on(SpeedPercent(PATROL_SPEED * FORWARD_DIR), SpeedPercent(PATROL_SPEED * FORWARD_DIR))
    snd.beep()
    time.sleep(2)
    #tank.off(brake=True)
    head_to(HEAD_LEFT_OUT, speed_pct=HEAD_SPEED, block=False)
    time.sleep(4)
    head_to(HEAD_RIGHT_OUT, speed_pct=HEAD_SPEED, block=False)
    time.sleep(3)
    notify_event("hello", "hello", distance_cm=int(dist_cm))
    move=0
    while True:
        log(move)
        if move==1:
            break
        time.sleep(0.5)
    center_head()
    wave_request = False
    time.sleep(3)
    log("Start state:", state)
    patrol_dir = 1
    next_patrol_switch = time.time() + PATROL_PERIOD
    # 啟動：先把頭擺到左側，建立掃描節奏
    head_to(HEAD_LEFT_OUT, speed_pct=HEAD_SPEED, block=False)
    next_swing_time = time.time() + HEAD_PERIOD
    head_scanning = True
    log("Head scan: ON")

    person_announced = False
    while True:
        now = time.time()
        present = ((now - last_pos_time) <= NO_POS_TIMEOUT) or (now < have_person_until)

        # 距離（容錯）
        try:
            dist_cm = us.distance_centimeters
        except Exception:
            dist_cm = 255

        # 頭掃描（PATROL）
        if head_scanning:
            swing_head(now)

        # 心跳輸出（每2秒）
        heartbeat(now, dist_cm)

        # 狀態機
        if state == STATE_PATROL:
            # 蛇形巡航
            if now >= next_patrol_switch:
                patrol_dir *= -1
                next_patrol_switch = now + PATROL_PERIOD
            l = PATROL_SPEED + (PATROL_SWAY * patrol_dir)
            r = PATROL_SPEED - (PATROL_SWAY * patrol_dir)
            tank.on(SpeedPercent(l * FORWARD_DIR), SpeedPercent(r * FORWARD_DIR))

            if present:
                tank.off(brake=True)
                state = STATE_TRACK
                head_scanning = False
                center_head()
                person_announced = False
                log("Head scan: OFF; head->0deg; ->", state)

        elif state == STATE_TRACK:
            if not present:
                head_scanning = True
                state = STATE_PATROL
                log("->", state, "(no person)")
                person_announced = False
            else:
                s = TURN_SPEED * YAW_DIR
                if last_pos == "left":
                    tank.on(SpeedPercent(-s), SpeedPercent(s))
                elif last_pos == "right":
                    tank.on(SpeedPercent(s), SpeedPercent(-s))
                else:
                    tank.off(brake=True)

                if wave_request:
                    wave_request = False
                    state = STATE_ADVANCE
                    head_scanning = False
                    center_head()
                    advance_start = now
                    log("->", state)

        elif state == STATE_ADVANCE:
            '''
            if (now - advance_start) > ADVANCE_TMAX:
                tank.off(brake=True)
                state = STATE_TRACK
                head_scanning = True
                log("ADVANCE timeout ->", state, "; Head scan: ON")
                continue
            '''
            if not present:
                tank.off(brake=True)
                state = STATE_TRACK
                head_scanning = True
                log("ADVANCE lost target ->", state, "; Head scan: ON")
                continue

            bias = STEER_GAIN * YAW_DIR
            if last_pos == "right":
                l = BASE_SPEED - bias; r = BASE_SPEED + bias
            elif last_pos == "left":
                l = BASE_SPEED + bias; r = BASE_SPEED - bias
            else:
                l = BASE_SPEED
                r = BASE_SPEED

            tank.on(SpeedPercent(l * FORWARD_DIR), SpeedPercent(r * FORWARD_DIR))

            if dist_cm <= STOP_CM:
                END = 0
                tank.off(brake=True)
                snd.beep()
                # state = STATE_TRACK
                # head_scanning = True
                log("Reached {} cm -> {}".format(STOP_CM, state))
                notify_event("start", "start", distance_cm=int(dist_cm))
                while True:
                    if END == 1:
                        break
                    # log("End(Waiting for motor)")
                    time.sleep(0.5)
                break

        time.sleep(0.05)
    

except KeyboardInterrupt:
    pass
finally:
    tank.off(brake=True)
    client_in.loop_stop()
    client_in.disconnect()
    try:
        notify.loop_stop()
        notify.disconnect()
    except Exception:
        pass
    log("=== PROGRAM END ===")
