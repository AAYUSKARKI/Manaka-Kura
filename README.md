# 🎙️ Manaka Kura (मनका कुरा)
**Manaka Kura** is a real-time Push-to-Talk (PTT) communication system. Built with a modern full-stack architecture, it enables low-latency voice streaming designed for real-time team coordination with a touch of Nepali soul. 

## 🚀 Features

- **One-Tap Talk:** Instant Push-to-Talk functionality using **Socket.io**.
- **Modern Aesthetics:** A premium UI crafted with **React**, **Tailwind CSS**, and **Shadcn UI**.
- **Heartbeat Connection:** Real-time active user tracking and room-based "Chautari" (channels).
- **Responsive Love:** Fully optimized for mobile browsers so you can talk on the move.
- **Visual Feedback:** Beautiful audio visualizers and "Active Speaker" highlights.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React.js (Vite)
- **Styling:** Tailwind CSS
- **Components:** Shadcn UI / Radix UI
- **Icons:** Lucide React

### Backend
- **Server:** Node.js / Express.js (TypeScript)
- **Real-time Engine:** Socket.io (WebSocket)
- **Validation:** Zod (Type-safe schemas)
- **Security:** Helmet, CORS, and Custom Rate Limiting
- **Logging:** Winston
- **Database:** PostgreSQL (Prisma ORM)

---

## 🛡️ Production-Grade Architecture

To ensure low latency without sacrificing security, the backend implements a layered defense:

- **Layer 1: Rate Limiting:** Sliding-window rate limiting for socket events to prevent spam/DDoS.
- **Layer 2: Schema Validation:** Every incoming socket message is validated via **Zod Discriminated Unions** before processing.
- **Layer 3: Decoupled Handlers:** Business logic is separated into standalone handlers (Auth, Signal, Status) for easier testing and scalability.
- **Layer 4: Signaling Relay:** Robust WebRTC signaling with validation for SDP and ICE candidates.

### Frontend Architecture
- **WebRTC Engine:** Custom `WebRTCManager` class handling PeerConnection lifecycle.
- **PTT Logic:** Local stream muting/unmuting for instant Push-to-Talk.
- **Audio Analysis:** Real-time frequency analysis for voice activity visualization.

### ⚛️ Reactive Signaling Hook (`useWebRTC`)
The frontend uses a custom hook to manage the intersection of WebSockets and WebRTC:

- **Auto-Handshake:** Automatically creates WebRTC offers when a `user_joined` event is received.
- **Signaling Relay:** Maps incoming socket signals (SDP/ICE) to the correct peer connection.
- **PTT Lifecycle:** Manages microphone stream states and updates global user status (Online/Busy) via the backend.
- **Visualizer Engine:** Provides a reactive `audioLevel` state for real-time UI pulsing effects.

---
## 📥 Getting Started

### Prerequisites
- **Node.js:** v18.x or higher
- **Package Manager:** npm / yarn / pnpm

### Installation

1. **Clone the repository:**
    ```bash
    git clone [https://github.com/AAYUSKARKI/Manaka-Kura.git](https://github.com/AAYUSKARKI/Manaka-Kura.git)
    ```

2. **Navigate to the project directory:**
    ```bash
    cd Manaka-Kura
    ```

3. **Backend Setup:**
    ```bash
    cd server
    npm install
    # Configure environment variables
    PORT=3000
    CORS_ORIGIN=http://localhost:5173
    COMMON_RATE_LIMIT_MAX_REQUESTS=100
    COMMON_RATE_LIMIT_WINDOW_MS=900000
    npm run dev
    ```

4. **Frontend Setup:**
    ```bash
    cd client
    npm install
    # Configure environment variables
    npm run dev
    ```

5. **Access the application:**
    Open [http://localhost:5173](http://localhost:5173) in your web browser.

---

## 🤝 Contributing

We welcome contributions from the community! If you find any bugs, have suggestions, or want to contribute, please [open an issue or pull request](https://github.com/AAYUSKARKI/Manaka-Kura/issues).