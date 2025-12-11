

# 🎮 Connect 4 – Real-Time Multiplayer Game

### *Backend Internship Assignment – Emitrr*

A real-time **Connect Four** game built with **WebSockets**, **Node.js**, and **PostgreSQL**, featuring multiplayer matchmaking, bot fallback, reconnection handling, leaderboard, and match history.

This project also includes **Kafka analytics (bonus)** for event streaming.

---

## 🚀 Features

### 🎯 Core Features

✔ Real-time multiplayer (WebSockets)
✔ Automatic matchmaking
✔ 10-second bot fallback
✔ Player vs Bot (smart strategy)
✔ Reconnect within 30 seconds
✔ Disconnect → opponent automatically wins
✔ Game history stored in PostgreSQL
✔ Player leaderboard
✔ Persistent storage
✔ Clean and simple React UI

### 🤖 Bot AI Priority

1️⃣ Try to win
2️⃣ Block opponent’s winning move
3️⃣ Prefer center column
4️⃣ Choose first available safe move

### 🔁 Reconnect Logic

If a player disconnects:

* They get **30 seconds** to reconnect
* If they don’t return → **opponent wins automatically**

---

## 🧠 Tech Stack

### Backend

* Node.js
* Express
* WebSockets (`ws`)
* PostgreSQL (Supabase)
* Kafka (Bonus analytics)

### Frontend

* React
* Fetch API


---

## 🗂 Database Schema

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

## ⚙️ Backend Setup

```bash
cd backend
npm install
node server.js
```

Update your DB URL in:

```
backend/db.js
```

---

## 🖥 Frontend Setup

```bash
cd frontend
npm install
npm start
```

---

## 🌍 API Endpoints

### 📌 Leaderboard

```
GET /leaderboard
```

### 📌 Match History

```
GET /history
```

---

## 💾 Persistent Storage

| Data Type     | Stored In      | Purpose             |
| ------------- | -------------- | ------------------- |
| Wins          | `leaderboard`  | Ranking players     |
| Match Records | `game_history` | history |

---

## 🎨 UI Includes

* 7×6 Connect-4 board
* Live turn indicator
* Match messages
* Leaderboard table
* Match history table
* Smooth disc animations

---

## 📦 Folder Structure

```
backend/
  server.js
  db.js
  kafka.js  (optional)
  consumer.js (optional)

frontend/
  src/App.jsx
```

---

# 🧩 Bonus: Kafka Analytics (Optional)

This project integrates **Kafka event streaming**:

### Events sent:

* `game_started`
* `move_played`
* `game_ended`
* `disconnect`

### Consumer calculates:

* Average game duration
* Most frequent winners
* Games per hour/day
* User statistics

---

## 👨‍💻 Developed For

**Emitrr – Backend Engineering Assignment**



---

## 🏗 Deployment & Branch Details

### 🌐 Live Frontend

The **live hosted version (without Kafka analytics)** is available at:

👉 **[https://connect4-six-olive.vercel.app/](https://connect4-six-olive.vercel.app/)**

This version connects to the backend hosted on Render.

---

## 🛠 Backend Hosting (Render Notice)

The backend is deployed on **Render free tier**, which:

* Sleeps when inactive 😴
* Takes **30–60 seconds to wake up** on first request ⏳
* After waking, everything works normally

So if you open the Vercel frontend and nothing happens immediately — **wait for ~1 minute** for the backend to resume when u click on connect.

---

## 🧵 Kafka Integration (Local Only)

Kafka cannot run on free hosting platforms like Render or Vercel.
Therefore, **Kafka support is included only in a separate development branch**:

### 🔀 Kafka Branch

👉 `c01cahnges`
(This branch contains: `kafka.js`, `consumer.js`, and server updates for event streaming.)

### 🧪 Running Kafka Locally

If you want to test Kafka analytics:

```bash
cd backend
docker compose up -d
```

Then start:

```bash
node server.js       # backend with Kafka producers
node consumer.js     # Kafka analytics consumer
```

Kafka events tracked locally:

* `game_started`
* `move_played`
* `game_ended`
* `disconnect`

These events allow tracking:

* Average game duration
* Most frequent winners
* Games per hour/day
* User-specific performance metrics

---

## 🔧 Why Kafka Cannot Be Deployed

Kafka requires:

* Persistent storage volumes
* Multiple communication ports
* Zookeeper
* Long-running processes

Platforms like **Render Free**, **Vercel**, **Netlify**, **Railway Free Tier** do **not** support Kafka brokers or zookeeper containers.

Therefore:

✔ Core game works perfectly online
✔ Kafka analytics works **only locally**
✔ Kafka code is safely maintained in the **c01cahnges** branch

---


## ✔ Completed Requirements

| Requirement             | Status                 |
| ----------------------- | ---------------------- |
| Multiplayer WebSockets  | ✅                      |
| Bot with strategy       | ✅                      |
| Reconnect               | ✅                      |
| Disconnect winner logic | ✅                      |
| Persistent database     | ✅                      |
| Leaderboard             | ✅                      |
| Match history           | ✅                      |
| Simple React frontend   | ✅                      |
| Kafka bonus             | ⚡ Optional – Completed |

---

## ✨ Author

**Chirag Chhabra**
