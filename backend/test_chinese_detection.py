#!/usr/bin/env python3
"""
Test script for Chinese language detection improvements
Run this to verify Chinese detection is working properly.
"""

import requests
import json
import sys

def test_chinese_detection():
    """Test various Chinese text samples"""

    test_cases = [
        {
            "name": "Simplified Chinese",
            "text": "你好，我是小卡，很高兴认识你",
            "expected": "zh"
        },
        {
            "name": "Traditional Chinese",
            "text": "您好，我是小卡，很高興認識您",
            "expected": "zh"
        },
        {
            "name": "Mixed Chinese-English",
            "text": "Hello 你好，how are you today?",
            "expected": "zh"
        },
        {
            "name": "Single Chinese Character",
            "text": "咖啡",
            "expected": "zh"
        },
        {
            "name": "English Only",
            "text": "Hello, how are you?",
            "expected": "en"
        },
        {
            "name": "Japanese",
            "text": "こんにちは、私は小卡です",
            "expected": "ja"
        }
    ]

    print("🧪 Testing Chinese Language Detection")
    print("=" * 50)

    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{i}. {test_case['name']}")
        print(f"   Text: {test_case['text']}")

        try:
            response = requests.post(
                "http://localhost:8000/test/language",
                json={"text": test_case['text']},
                timeout=5
            )

            if response.status_code == 200:
                result = response.json()
                detected = result.get('detected_language')
                expected = test_case['expected']

                status = "✅ PASS" if detected == expected else "❌ FAIL"
                print(f"   Expected: {expected}, Detected: {detected} {status}")
                print(f"   Chinese chars: {result.get('chinese_chars', 0)}")
                print(f"   Ratio: {result.get('chinese_ratio', 0):.2f}")
            else:
                print(f"   ❌ HTTP Error: {response.status_code}")

        except requests.exceptions.RequestException as e:
            print(f"   ❌ Connection Error: {e}")
            print("   Make sure the server is running on http://localhost:8000")

def test_detailed_chinese_analysis():
    """Test detailed Chinese character analysis"""

    print("\n🔍 Detailed Chinese Analysis Test")
    print("=" * 50)

    test_text = "這是繁體中文測試，包含各種漢字像：咖啡、機器人、對話"

    try:
        response = requests.post(
            "http://localhost:8000/test/chinese-detection",
            json={"text": test_text},
            timeout=5
        )

        if response.status_code == 200:
            result = response.json()

            print(f"Text: {test_text}")
            print(f"Detected: {result['detection_result']['detected_language']}")
            print(f"Language: {result['detection_result']['language_name']}")
            print(f"Is Chinese: {result['detection_result']['is_chinese_detected']}")

            analysis = result['chinese_analysis']
            print("
Chinese Analysis:"            print(f"  Total Chinese chars: {analysis['total_chinese_chars']}")
            print(f"  Chinese ratio: {analysis['chinese_ratio']:.2f}")
            print(f"  Threshold met: {analysis['threshold_met']}")

            print("
Unicode Ranges:"            for range_name, count in analysis['ranges_breakdown'].items():
                print(f"  {range_name}: {count}")

        else:
            print(f"❌ HTTP Error: {response.status_code}")

    except requests.exceptions.RequestException as e:
        print(f"❌ Connection Error: {e}")

if __name__ == "__main__":
    print("🇨🇳 Chinese Language Detection Test Suite")
    print("This script tests the improved Chinese detection capabilities.\n")

    # Test basic detection
    test_chinese_detection()

    # Test detailed analysis
    test_detailed_chinese_analysis()

    print("\n" + "=" * 50)
    print("🎉 Test completed!")
    print("\nIf tests failed:")
    print("1. Make sure the server is running: python main.py")
    print("2. Check that faster-whisper is properly installed")
    print("3. Verify the server is accessible at http://localhost:8000")
