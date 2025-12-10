

# 4️⃣ Connect Four – Real-Time Multiplayer Game (Backend Intern Assignment)

A real-time WebSocket based **4 in a Row (Connect Four)** game with:

* Player vs Player
* Player vs Bot (with strategy)
* Reconnect within 30s
* Leaderboard (PostgreSQL)
* Match history storage
* Simple UI (React)

---

## 🧠 Tech Stack

### Backend

* Node.js
* Express
* WebSockets (ws)
* PostgreSQL (Supabase)

### Frontend

* React
* Fetch API (simple UI)

---

## 🔥 Features

✔ Multiplayer real-time
✔ Auto matching
✔ 10 second bot fallback
✔ Bot blocks you + tries to win
✔ Game history
✔ Leaderboard
✔ Reconnect
✔ Disconnect winner
✔ No random moves
✔ Persistent database

---

## ▶ How It Works

### Player Flow

1. Enter your name
2. Connect to websocket
3. Join game
4. If no opponent → bot starts in 10s

---

## 📡 Reconnect Logic

If user disconnects:

* They have **30 seconds** to reconnect
* Otherwise opponent wins

---

## 🤖 Bot Strategy

Bot priority:
1️⃣ Try to win
2️⃣ Block your immediate win
3️⃣ Play center
4️⃣ Random valid column

---

## 🗂 DB Schema (PostgreSQL)

```sql
create table leaderboard(
  username text primary key,
  wins int default 0
);

create table game_history(
  id serial primary key,
  player1 text,
  player2 text,
  winner text,
  is_draw boolean,
  created_at timestamp default now()
);
```

---

## ⚙️ Backend setup

```bash
cd backend
npm install
node server.js
```

Update database URL in:

```
/backend/db.js
```

---

## 🖥 Frontend setup

```bash
cd frontend
npm install
npm start
```

---

## 🌍 API Endpoints

### Get leaderboard

```
GET /leaderboard
```

### Get game history

```
GET /history
```

---

## 💾 Persistent Storage

* wins stored in leaderboard table
* games stored in history table
* allows analytics
* allows rankings

---

## 🎨 UI Includes

* Grid board 7×6
* Leaderboard table
* History table

---


## 📦 Folder Structure

```
backend/
  server.js
  db.js

frontend/
  src/App.jsx
```

---

## 👨‍💻 Developed for

**Emitrr – Backend Internship Assignment**

---

## ✔ Completed Requirements

| Requirement            | Done |
| ---------------------- | ---- |
| Multiplayer WebSockets | ✅    |
| Bot with strategy      | ✅    |
| Reconnect              | ✅    |
| Disconnect handling    | ✅    |
| Persistent storage     | ✅    |
| Leaderboard            | ✅    |
| Game history           | ✅    |
| Simple frontend        | ✅    |

---

## Author

**Chirag Chhabra**

---

## ⭐ Final Notes

Everything is implemented as required except optional Kafka analytics.

