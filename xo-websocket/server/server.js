const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const { Server } = require("socket.io");

const app = express();

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// React / Client static files serve பண்ண
app.use(express.static(path.join(__dirname, "../client/dist")));

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

  if (!players.X) {
    players.X = socket.id;
    socket.emit("playerAssigned", "X");
    console.log("❌ Player X joined");
  } else if (!players.O) {
    players.O = socket.id;
    socket.emit("playerAssigned", "O");
    console.log("⭕ Player O joined");
  } else {
    socket.emit("gameFull");
    console.log("⚠️ Game full");
    return;
  }

  socket.emit("gameState", {
    board,
    currentPlayer,
    winner,
    gameOver,
  });

  socket.on("makeMove", (index) => {
    const player =
      players.X === socket.id
        ? "X"
        : players.O === socket.id
        ? "O"
        : null;

    if (!player) return;
    if (gameOver) return;
    if (player !== currentPlayer) return;
    if (board[index] !== "") return;

    board[index] = player;
    winner = checkWinner();

    if (winner) {
      gameOver = true;
      console.log(`🏆 Player ${winner} wins!`);
    } else if (board.every((cell) => cell !== "")) {
      gameOver = true;
      winner = "DRAW";
      console.log("🤝 Game draw!");
    } else {
      currentPlayer = player === "X" ? "O" : "X";
    }

    sendGameState();
  });

  socket.on("restartGame", () => {
    board = Array(9).fill("");
    currentPlayer = "X";
    winner = null;
    gameOver = false;
    console.log("🔄 Game restarted");
    sendGameState();
  });

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

// Any route -> Frontend index.html-க்கு redirect பண்ணும்
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});