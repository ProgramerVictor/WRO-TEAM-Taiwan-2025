#!/usr/bin/env python3
"""
Quick test script for robot_id filtering
Run: python test_robot_filtering.py
"""

import requests
import json
import time
from typing import Dict, Any

BASE_URL = "http://localhost:8000"

def test_distance(distance_cm: int, publish_mqtt: bool, robot_id: str) -> Dict[str, Any]:
    """Send a test distance message"""
    url = f"{BASE_URL}/test/distance"
    payload = {
        "distance_cm": distance_cm,
        "publish_mqtt": publish_mqtt,
        "robot_id": robot_id
    }
    
    print(f"\n📤 Sending test to robot: {robot_id}")
    print(f"   Payload: {json.dumps(payload, indent=2)}")
    
    response = requests.post(url, json=payload)
    result = response.json()
    
    print(f"✅ Response: {json.dumps(result, indent=2)}")
    return result

def check_robot_config() -> Dict[str, Any]:
    """Check current robot configuration"""
    url = f"{BASE_URL}/robot"
    response = requests.get(url)
    result = response.json()
    
    print(f"\n🤖 Robot Configuration:")
    print(f"   Default Robot ID: {result.get('default_robot_id')}")
    print(f"   Active Connections: {result.get('active_connections')}")
    print(f"   Assignments: {json.dumps(result.get('robot_assignments', {}), indent=6)}")
    return result

def check_health() -> Dict[str, Any]:
    """Check backend health"""
    url = f"{BASE_URL}/health"
    response = requests.get(url)
    result = response.json()
    
    mqtt_status = "✅ Connected" if result.get('mqtt_connected') else "❌ Disconnected"
    print(f"\n🏥 Backend Health:")
    print(f"   Status: {result.get('status')}")
    print(f"   MQTT: {mqtt_status}")
    print(f"   Broker: {result.get('broker')}")
    print(f"   Default Robot ID: {result.get('default_robot_id')}")
    return result

def main():
    print("="*60)
    print("🤖 Robot ID Filtering Test")
    print("="*60)
    
    try:
        # Check backend health
        health = check_health()
        if not health.get('mqtt_connected'):
            print("\n⚠️  WARNING: MQTT not connected. Messages won't be published to broker.")
            print("   Tests will still work locally but robots won't receive messages.")
        
        # Check current configuration
        check_robot_config()
        
        print("\n" + "="*60)
        print("TEST 1: Send message to wro1")
        print("="*60)
        test_distance(
            distance_cm=5,
            publish_mqtt=True,
            robot_id="wro1"
        )
        print("✅ Test 1 complete. Check if wro1 received the message.")
        
        time.sleep(2)
        
        print("\n" + "="*60)
        print("TEST 2: Send message to wro7")
        print("="*60)
        test_distance(
            distance_cm=5,
            publish_mqtt=True,
            robot_id="wro7"
        )
        print("✅ Test 2 complete. Check if wro7 received the message.")
        print("   Note: wro1 should IGNORE this message (different robot_id)")
        
        time.sleep(2)
        
        print("\n" + "="*60)
        print("TEST 3: Send message without publishing to MQTT")
        print("="*60)
        test_distance(
            distance_cm=3,
            publish_mqtt=False,
            robot_id="wro1"
        )
        print("✅ Test 3 complete. Backend processed but didn't publish to MQTT.")
        
        print("\n" + "="*60)
        print("TEST 4: Send message with default robot_id")
        print("="*60)
        # Send without robot_id (will use default)
        url = f"{BASE_URL}/test/distance"
        payload = {
            "distance_cm": 7,
            "publish_mqtt": True
        }
        print(f"\n📤 Sending test with DEFAULT robot_id")
        print(f"   Payload: {json.dumps(payload, indent=2)}")
        response = requests.post(url, json=payload)
        result = response.json()
        print(f"✅ Response: {json.dumps(result, indent=2)}")
        
        # Final summary
        print("\n" + "="*60)
        print("📊 TEST SUMMARY")
        print("="*60)
        print("✅ All tests completed successfully!")
        print("\n📋 What to check:")
        print("   1. Check wro1 robot logs - should have received Test 1 and 4")
        print("   2. Check wro7 robot logs - should have received Test 2 only")
        print("   3. Check wro1 robot logs - should show IGNORE for Test 2")
        print("\n💡 Expected robot behavior:")
        print("   - wro1: Processes messages with robot_id='wro1' or default")
        print("   - wro7: Processes messages with robot_id='wro7'")
        print("   - Others: Ignore messages not for them")
        print("\n🎯 To change frontend robot_id:")
        print("   1. Open http://localhost:3000")
        print("   2. Click Settings")
        print("   3. Enter Robot ID (wro1, wro7, etc.)")
        print("   4. Click 'Test & Switch'")
        
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Cannot connect to backend!")
        print("   Make sure the backend is running:")
        print("   cd backend && uvicorn main:app --reload")
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

