import express from "express";
import { WebSocketServer } from "ws";
import cors from "cors";
import { db } from "./db.js";
import { connectKafka, sendEvent } from "./kafka.js";
connectKafka();

const app = express();
app.use(express.json());
app.use(cors());

let waitingPlayer = null;
let activeGames = [];

app.get("/leaderboard", async (req, res) => {
  try {
    const result = await db.query(`
      select username, wins 
      from leaderboard 
      order by wins desc
      limit 10
    `);

    res.json(result.rows);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "DB error" });
  }
});

app.get("/history", async (req, res) => {
  try {
    const result = await db.query(`
      select player1, player2, winner, is_draw, finished_at
      from game_history
      order by finished_at desc
      limit 10
    `);
    res.json(result.rows);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "db error" });
  }
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => console.log("Server listening on", PORT));
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    const data = JSON.parse(msg);

    if (data.type === "join") handleJoin(ws, data.name);
    if (data.type === "move") handleMove(ws, data.col);
    if (data.type === "reconnect") handleReconnect(ws, data.name);
    if (data.type === "reset") handleReset(ws);

    ws.disconnected = false;
  });

  ws.on("close", () => handleDisconnect(ws));
});

// ===================== JOIN =====================

async function saveGameHistory(game, winner, draw = false) {
  try {
    await db.query(
      `
      insert into game_history(player1, player2, winner, is_draw)
      values($1,$2,$3,$4)
    `,
      [game.players[0].name, game.players[1].name, winner, draw]
    );
  } catch (err) {
    console.log("Error saving history", err);
  }
}

async function recordWin(username) {
  try {
    await db.query(
      `
      insert into leaderboard(username,wins)
      values($1,1)
      on conflict (username)
      do update set wins = leaderboard.wins + 1
    `,
      [username]
    );
  } catch (e) {
    console.error("DB error:", e);
  }
}
function handleReset(ws) {
  const game = ws.game;

  if (game) {
    game.players.forEach((p, i) => {
      if (p.ws) {
        p.ws.send(
          JSON.stringify({
            type: "game_over",
            reason: "disconnect",
            youWin: p.ws !== ws,
          })
        );
      }
    });

    game.players.forEach((p) => {
      if (p.ws) p.ws.game = null;
    });

    removeGame(game);
  }

  if (waitingPlayer && waitingPlayer.ws === ws) {
    waitingPlayer = null;
  }
}

function handleJoin(ws, name) {
  if (ws.game) {
    ws.send(
      JSON.stringify({
        type: "error",
        message: "You are still in a game. Please disconnect first.",
      })
    );
    return;
  }
  if (waitingPlayer && waitingPlayer.ws === ws) {
    ws.send(JSON.stringify({ type: "waiting" }));
    return;
  }
  if (!waitingPlayer) {
    waitingPlayer = { ws, name };
    ws.send(JSON.stringify({ type: "waiting" }));

    setTimeout(() => {
      if (waitingPlayer && waitingPlayer.ws === ws) {
        waitingPlayer = null;
        startBotGame(ws, name);
      }
    }, 10000);
  } else {
    const p1 = waitingPlayer;
    const p2 = { ws, name };
    waitingPlayer = null;
    startGame(p1, p2);
  }
}

function startBotGame(ws, name) {
  startGame({ ws, name }, { ws: null, name: "Bot" });
}

// ===================== START GAME =====================

function startGame(p1, p2) {
  const game = {
    board: createBoard(),
    players: [p1, p2],
    turn: 1,
  };
  activeGames.push(game);
  sendEvent("game_started", {
    player1: p1.name,
    player2: p2.name,
    timestamp: Date.now(),
  });

  p1.ws.game = game;
  if (p2.ws) p2.ws.game = game;

  p1.ws.send(
    JSON.stringify({
      type: "start_game",
      youAre: "player1",
      opponent: p2.name,
      board: game.board,
    })
  );

  if (p2.ws) {
    p2.ws.send(
      JSON.stringify({
        type: "start_game",
        youAre: "player2",
        opponent: p1.name,
        board: game.board,
      })
    );
  }
}

// ===================== MOVE =====================

async function handleMove(ws, col) {
  const game = ws.game;
  if (!game) return;

  let player = ws === game.players[0].ws ? 1 : 2;
  if (player !== game.turn) return;

  const ok = dropDisc(game.board, col, player);
  if (!ok) return;

  sendEvent("move_played", {
    player: game.players[player - 1].name,
    col,
    board: game.board,
    turn: player,
    timestamp: Date.now(),
  });

  if (checkWin(game.board, player)) {
    sendEvent("game_ended", {
      winner: game.players[player - 1].name,
      loser: game.players[player === 1 ? 1 : 0].name,
      draw: false,
      timestamp: Date.now(),
    });

    await recordWin(game.players[player - 1].name);
    await saveGameHistory(game, game.players[player - 1].name);
    broadcast(game);
    game.players.forEach((p, i) => {
      if (p.ws) {
        p.ws.send(
          JSON.stringify({
            type: "game_over",
            winner: player,
            youWin: i + 1 === player,
          })
        );
      }
    });
    game.players.forEach((p) => {
      if (p.ws) {
        p.ws.game = null;
      }
    });
    removeGame(game);

    return;
  }

  if (isBoardFull(game.board)) {
    sendEvent("game_ended", {
      winner: null,
      player1: game.players[0].name,
      player2: game.players[1].name,
      draw: true,
      timestamp: Date.now(),
    });

    await saveGameHistory(game, null, true);
    game.players.forEach((p) => {
      if (p.ws)
        p.ws.send(
          JSON.stringify({
            type: "game_over",
            draw: true,
            youWin: null,
          })
        );
    });
    game.players.forEach((p) => {
      if (p.ws) {
        p.ws.game = null;
      }
    });
    removeGame(game);

    return;
  }

  game.turn = player === 1 ? 2 : 1;

  const opponent = game.players[game.turn - 1];
  if (opponent.ws === null) {
    botMove(game);
    if (checkWin(game.board, 2)) {
      broadcast(game);
      game.players.forEach((p, i) => {
        if (p.ws) {
          p.ws.send(
            JSON.stringify({
              type: "game_over",
              winner: 2,
              youWin: i + 1 === 2,
            })
          );
        }
      });
      game.players.forEach((p) => {
        if (p.ws) {
          p.ws.game = null;
        }
      });
      removeGame(game);

      return;
    }
    game.turn = 1;
  }

  broadcast(game);
}

// ===================== BOT =====================

function botMove(game) {
  for (let c = 0; c < 7; c++) if (simMove(game, c, 2)) return;
  for (let c = 0; c < 7; c++) if (simMove(game, c, 1)) return;
  if (tryCol(game, 3)) return;
  for (let c = 0; c < 7; c++) if (tryCol(game, c)) return;
}

function simMove(game, col, player) {
  const temp = game.board.map((r) => [...r]);
  if (!dropDisc(temp, col, player)) return false;
  if (checkWin(temp, player)) {
    dropDisc(game.board, col, 2);
    return true;
  }
  return false;
}

function tryCol(game, col) {
  return dropDisc(game.board, col, 2);
}

// ===================== RECONNECT =====================

function handleReconnect(ws, name) {
  for (const game of activeGames) {
    for (const p of game.players) {
      if (p.name === name) {
        p.ws = ws;
        ws.game = game;
        ws.disconnected = false;
        ws.send(
          JSON.stringify({
            type: "reconnected",
            board: game.board,
            turn: game.turn,
          })
        );
        return;
      }
    }
  }
}

// ==================== DISCONNECT ====================

function handleDisconnect(ws) {
  const game = ws.game;
  if (!game) return;

  ws.disconnected = true;

  setTimeout(() => {
    if (!ws.disconnected || !ws.game) return;

    const currentGame = ws.game;

    const winner = currentGame.players.find((p) => p.ws !== ws)?.name;
    const loser = currentGame.players.find((p) => p.ws === ws)?.name;

    sendEvent("game_ended", {
      winner,
      loser,
      draw: false,
      reason: "disconnect",
      timestamp: Date.now(),
    });

    currentGame.players.forEach((p) => {
      if (p.ws) {
        p.ws.send(
          JSON.stringify({
            type: "game_over",
            reason: "disconnect",
            youWin: p.ws !== ws,
          })
        );
      }
    });

    currentGame.players.forEach((p) => {
      if (p.ws) p.ws.game = null;
    });

    removeGame(currentGame);
  }, 30000);
}

// ===================== UTILS =====================

function broadcast(game) {
  game.players.forEach((p, i) => {
    if (p.ws) {
      const isMyTurn = game.turn === i + 1;
      p.ws.send(
        JSON.stringify({
          type: "update",
          board: game.board,
          turn: game.turn,
          yourTurn: isMyTurn,
          opponentTurn: !isMyTurn,
        })
      );
    }
  });
}

function removeGame(game) {
  const i = activeGames.indexOf(game);
  if (i > -1) activeGames.splice(i, 1);
}

function createBoard() {
  return Array.from({ length: 6 }, () => Array(7).fill(0));
}

function dropDisc(board, col, player) {
  for (let r = 5; r >= 0; r--) {
    if (board[r][col] === 0) {
      board[r][col] = player;
      return true;
    }
  }
  return false;
}

function isBoardFull(board) {
  return !board.flat().includes(0);
}

//===================== CHECKWIN =====================

function checkWin(board, player) {
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < 4; c++)
      if (
        board[r][c] === player &&
        board[r][c + 1] === player &&
        board[r][c + 2] === player &&
        board[r][c + 3] === player
      )
        return true;
  for (let c = 0; c < 7; c++)
    for (let r = 0; r < 3; r++)
      if (
        board[r][c] === player &&
        board[r + 1][c] === player &&
        board[r + 2][c] === player &&
        board[r + 3][c] === player
      )
        return true;
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 4; c++)
      if (
        board[r][c] === player &&
        board[r + 1][c + 1] === player &&
        board[r + 2][c + 2] === player &&
        board[r + 3][c + 3] === player
      )
        return true;
  for (let r = 3; r < 6; r++)
    for (let c = 0; c < 4; c++)
      if (
        board[r][c] === player &&
        board[r - 1][c + 1] === player &&
        board[r - 2][c + 2] === player &&
        board[r - 3][c + 3] === player
      )
        return true;
  return false;
}
