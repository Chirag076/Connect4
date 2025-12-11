import { useState } from "react";
let socket;

export default function App() {
  const [name, setName] = useState("");
  const [connected, setConnected] = useState(false);
  const [board, setBoard] = useState(
    Array.from({ length: 6 }, () => Array(7).fill(0))
  );

  const [history, setHistory] = useState([]);
  const [turn, setTurn] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [message, setMessage] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [joining, setJoining] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const connectWS = () => {
    if (connecting) return;
    setConnecting(true);
    socket = new WebSocket("http://localhost:3000");

    socket.onopen = () => {
      setConnected(true);
      setConnecting(false);
      setJoining(false);
      if (name) {
        socket.send(
          JSON.stringify({
            type: "reconnect",
            name,
          })
        );
      }
    };

    socket.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setJoining(false);

      if (data.type === "waiting") setMessage("Waiting...");

      if (data.type === "start_game") {
        setGameOver(false);
        setBoard(data.board);
        setMyRole(data.youAre);
        setTurn(1);
        setMessage("Game started vs " + data.opponent);
      }

      if (data.type === "update") {
        setBoard(data.board);
        setTurn(data.turn);
        if (data.yourTurn) setMessage("Your Turn");
        else setMessage("Opponent Turn");
      }

      if (data.type === "game_over") {
        setGameOver(true);
        if (data.reason === "disconnect") {
          if (data.youWin) setMessage("Opponent disconnected! You win!");
          else setMessage("You disconnected!");
          return;
        }
        if (data.draw) {
          setMessage("Draw!");
          return;
        }
        if (data.youWin) setMessage("You Win!");
        else setMessage("Opponent Wins!");
      }

      if (data.type === "reset_done") {
        setMessage("Reset complete, click Join");
      }

      if (data.type === "reconnected") {
        setBoard(data.board);
        setTurn(data.turn);
        setMessage("Reconnected!");
      }
    };
  };

  const joinGame = () => {
    if (joining) return;

    if (!socket || socket.readyState === WebSocket.CONNECTING) {
      setJoining(true);
      return;
    }

    if (socket.readyState === WebSocket.OPEN) {
      setJoining(true);

      socket.send(
        JSON.stringify({
          type: "join",
          name,
        })
      );
    }
  };

  function loadHistory() {
    fetch("http://localhost:3000/history")
      .then((r) => r.json())
      .then((data) => {
        setHistory(data || []);
      });
  }

  async function loadLeaderboard() {
    const res = await fetch("http://localhost:3000/leaderboard");
    const data = await res.json();
    setLeaderboard(data);
  }

  const makeMove = (col) => {
    if (gameOver) return;
    if (myRole === "player1" && turn !== 1) return;
    if (myRole === "player2" && turn !== 2) return;
    socket.send(JSON.stringify({ type: "move", col }));
  };

  return (
    <div style={{ padding: 20 }}>
      {/* LOGIN */}
      {!connected && (
        <>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
          />
          <button onClick={connectWS} disabled={connecting}>
            {connecting ? "Connecting..." : "Connect"}
          </button>
        </>
      )}

      {/* GAME SECTION */}
      {connected && (
        <>
          <button disabled={!connected || joining} onClick={joinGame}>
            {joining ? "Joining..." : "Join Game"}
          </button>
          {connected && (
            <button
              style={{ marginLeft: 10 }}
              onClick={() => {
                socket.send(JSON.stringify({ type: "reset" }));
                setGameOver(false);
                setJoining(false);
                setBoard(Array.from({ length: 6 }, () => Array(7).fill(0)));
                setMyRole(null);
                setTurn(null);
                setMessage("Game reset, click Join!");
              }}
            >
              Reset
            </button>
          )}

          <h3>{message}</h3>

          <div>
            <b>Your role:</b> {myRole}
          </div>

          <div>
            <b>Turn:</b>{" "}
            {turn === 1 ? "🔴 Player1" : turn === 2 ? "🟡 Player2" : ""}
          </div>

          <div
            style={{
              marginTop: 20,
              display: "grid",
              gridTemplateColumns: "repeat(7,50px)",
            }}
          >
            {board.map((row, r) =>
              row.map((cell, c) => (
                <div
                  key={r + "-" + c}
                  onClick={() => makeMove(c)}
                  style={{
                    width: 50,
                    height: 50,
                    border: "1px solid black",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  {cell === 1 ? "🔴" : cell === 2 ? "🟡" : ""}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* DATA SECTION */}
      <div style={{ marginTop: 40 }}>
        <h2>Analytics</h2>

        <button onClick={loadLeaderboard}>Show Leaderboard</button>
        <button onClick={loadHistory} style={{ marginLeft: 10 }}>
          Show History
        </button>

        <h3>Leaderboard</h3>
        <table border="1" cellPadding="4">
          <thead>
            <tr>
              <th>User</th>
              <th>Wins</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((row) => (
              <tr key={row.username}>
                <td>{row.username}</td>
                <td>{row.wins}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 style={{ marginTop: 30 }}>History</h3>
        <table border="1" cellPadding="4">
          <thead>
            <tr>
              <th>P1</th>
              <th>P2</th>
              <th>Winner</th>
              <th>Draw?</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h, i) => (
              <tr key={i}>
                <td>{h.player1}</td>
                <td>{h.player2}</td>
                <td>{h.winner || "-"}</td>
                <td>{h.is_draw ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
