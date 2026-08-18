const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

let board = Array(9).fill("");
let currentPlayer = "X";
let winner = null;
let gameOver = false;

let players = {
  X: null,
  O: null,
};

const checkWinner = () => {
  const combinations = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const [a, b, c] of combinations) {
    if (
      board[a] &&
      board[a] === board[b] &&
      board[a] === board[c]
    ) {
      return board[a];
    }
  }

  return null;
};

const sendGameState = () => {
  io.emit("gameState", {
    board,
    currentPlayer,
    winner,
    gameOver,
  });
};

io.on("connection", (socket) => {
  console.log("🟢 Player connected:", socket.id);

  // Assign X
  if (!players.X) {
    players.X = socket.id;

    socket.emit("playerAssigned", "X");

    console.log("❌ Player X joined");
  }

  // Assign O
  else if (!players.O) {
    players.O = socket.id;

    socket.emit("playerAssigned", "O");

    console.log("⭕ Player O joined");
  }

  // Game full
  else {
    socket.emit("gameFull");

    console.log("⚠️ Game full");

    return;
  }

  // Send current state
  socket.emit("gameState", {
    board,
    currentPlayer,
    winner,
    gameOver,
  });

  // Make move
  socket.on("makeMove", (index) => {
    const player =
      players.X === socket.id
        ? "X"
        : players.O === socket.id
        ? "O"
        : null;

    if (!player) return;

    // Game already finished
    if (gameOver) return;

    // Wrong player's turn
    if (player !== currentPlayer) return;

    // Invalid cell
    if (board[index] !== "") return;

    // Make move
    board[index] = player;

    // Check winner
    winner = checkWinner();

    if (winner) {
      gameOver = true;
      console.log(`🏆 Player ${winner} wins!`);
    }

    // Check draw
    else if (board.every((cell) => cell !== "")) {
      gameOver = true;
      winner = "DRAW";

      console.log("🤝 Game draw!");
    }

    // Change turn
    else {
      currentPlayer = player === "X" ? "O" : "X";
    }

    sendGameState();
  });

  // Restart
  socket.on("restartGame", () => {
    board = Array(9).fill("");
    currentPlayer = "X";
    winner = null;
    gameOver = false;

    console.log("🔄 Game restarted");

    sendGameState();
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log("🔴 Player disconnected:", socket.id);

    if (players.X === socket.id) {
      players.X = null;
    }

    if (players.O === socket.id) {
      players.O = null;
    }

    board = Array(9).fill("");
    currentPlayer = "X";
    winner = null;
    gameOver = false;

    sendGameState();
  });
});

app.get("/", (req, res) => {
  res.send("XO WebSocket Server Running 🚀");
});

server.listen(5000, () => {
  console.log("🚀 Server running on http://localhost:5000");
});