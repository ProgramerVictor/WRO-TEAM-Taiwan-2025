# WRO 2025 Future Innovators – AI Elderly Care Coffee Robot

This is a project built for the **World Robot Olympiad (WRO) 2025 – Future Innovators** category.

Our mission is to address the problem of loneliness among elderly people.  
The project, **“AI Barista – XiaoKa”**, is a robot that integrates AI vision, voice interaction, and precise mechanical control. It is designed to provide a safe, warm, freshly brewed cup of coffee for elderly or mobility-impaired users, while also interacting with them to improve their quality of life and increase their opportunities for social interaction.

---

## 🌟 Key Features
<img width="1861" height="1044" alt="image" src="https://github.com/user-attachments/assets/4adea533-7dec-4441-9b76-9f915cdb2251" />

This project is composed of four major subsystems working together to deliver seamless and safe service:

* **🗣️ Intelligent Voice Interaction (Voice Interaction System):**
    * **Designed specifically for seniors:** Users do not need to press any buttons. They can simply issue commands such as “I’d like a cup of coffee” using natural speech.
    * **Full voice guidance:** The “XiaoKa” assistant guides the user through every step using voice prompts, creating a sense of companionship.

* **🧠 Smart Image Recognition:**
*  <img width="436" height="304" alt="image_recognition" src="https://github.com/user-attachments/assets/07873760-28a3-4df9-a4d9-85058eb9764b" />

    * **Object recognition:** The AI “eyes” can locate the coffee cup, kettle, and coffee grounds in real time.
    * **Process monitoring:** It monitors the pouring process and water level to ensure accurate brewing.
    * **⚠️ Active Safety (Proactive Protection):** This is our core innovation! The AI continuously checks whether the user’s hand accidentally moves into **danger zones** (such as the hot water pouring path). If it detects this, it **immediately stops** all motion to proactively prevent burns.

* **🦾 Precise Pour-Over Motion:**
* ![pourovermotion](https://github.com/user-attachments/assets/5b8ac05e-d4f4-46e7-a1e5-2dad07852936)

    * **Stable control:** Using a robotic arm and control algorithms, the system performs smooth and stable pouring motions, preventing hot water from splashing or shaking.

* **☁️ IoT Monitoring:**
    * **Dedicated robot access:** Family members or caregivers can operate the system using a specific robot ID.
    * **Remote maintenance:** Developers can remotely update AI models and system software.

---

## 🤖 Technical Architecture

To realize powerful AI capabilities and overcome the computing limitations of the Lego EV3 brick, we adopt a **“brain–body” decoupled architecture**:

1. **AI Brain**
    * **Language:** Python 3.10+
    * **Speech:** Google Speech-to-Text API, gTTS (or other compatible services)
    * **Role:** Handles all heavy computation, including image recognition, natural language processing, and decision-making.

2. **Robot Body**
    * **Core:** Lego EV3 (using `pybricks` or `ev3dev` firmware)
    * **Sensors:** USB high-resolution camera, microphone
    * **Actuators:** EV3 servo motors
    * **Role:** Receives **simple commands** from the “brain” and executes precise physical movements.

> **Workflow:**  
> Camera image ➡️ sent to PC ➡️ processed by Python for recognition ➡️ decision generated (e.g., “tilt 30 degrees”) ➡️ command sent ➡️ EV3 executes motor actions.

---

## ▶️ How to Use

1. **(On EV3 side)** Start the receiver program on the EV3.
2. **(On PC side)** Open https://xiaokaaiassistant.vercel.app/, enter the robot ID on the settings page, and start the session.
3. **Start interacting:**  
   Speak to the microphone: **“Hello, XiaoKa.”**

---

## 📈 Project Status

**Completed**

---

## 👥 Team

* **Victor** – Overall design, EV3 hardware construction, mechanical design  
* **Henry** – EV3 hardware construction, mechanical design, image recognition  
* **Floyd** – Mentor

