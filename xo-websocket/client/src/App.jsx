import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";

// Connect to local server in dev, production server otherwise
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.DEV
    ? "http://localhost:5002"
    : "https://my-website-oj8d.onrender.com");

const socket = io(SOCKET_URL);

function App() {
  const [board, setBoard] = useState(Array(9).fill(""));
  const [currentPlayer, setCurrentPlayer] = useState("X");
  const [myPlayer, setMyPlayer] = useState(null);
  const [winner, setWinner] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState("Connecting...");

  useEffect(() => {
    socket.on("connect", () => {
      setMessage("Connected 🟢");
    });

    socket.on("playerAssigned", (player) => {
      setMyPlayer(player);
      setMessage(`You are Player ${player}`);
    });

    socket.on("gameState", (data) => {
      setBoard(data.board);
      setCurrentPlayer(data.currentPlayer);
      setWinner(data.winner);
      setGameOver(data.gameOver);
    });

    socket.on("gameFull", () => {
      setMessage("Game Full ❌");
    });

    return () => {
      socket.off("connect");
      socket.off("playerAssigned");
      socket.off("gameState");
      socket.off("gameFull");
    };
  }, []);

  const handleClick = (index) => {
    if (!myPlayer || gameOver || currentPlayer !== myPlayer || board[index] !== "") return;
    socket.emit("makeMove", index);
  };

  const restartGame = () => {
    socket.emit("restartGame");
  };

  const getStatus = () => {
    if (winner === "DRAW") return "🤝 It's a Draw!";
    if (winner) return `🏆 Player ${winner} Wins!`;
    if (currentPlayer === myPlayer) return "🔥 Your Turn!";
    return `⏳ Player ${currentPlayer}'s Turn`;
  };

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <span>✕</span> XO ARENA <span>◯</span>
        </div>
        <div className="connection">
          <span className="status-dot"></span>
          {message}
        </div>
      </header>

      <main className="game-container">
        <h1>Multiplayer XO</h1>
        <p className="subtitle">Real-Time Tic-Tac-Toe</p>

        <div className="players">
          <div className={`player-card ${currentPlayer === "X" && !gameOver ? "active" : ""}`}>
            <div className="player-symbol x">X</div>
            <div>
              <h3>Player X</h3>
              <p>{myPlayer === "X" ? "You" : "Opponent"}</p>
            </div>
          </div>
          <div className="vs">VS</div>
          <div className={`player-card ${currentPlayer === "O" && !gameOver ? "active" : ""}`}>
            <div className="player-symbol o">O</div>
            <div>
              <h3>Player O</h3>
              <p>{myPlayer === "O" ? "You" : "Opponent"}</p>
            </div>
          </div>
        </div>

        <div className={`game-status ${winner ? "finished" : ""}`}>
          {getStatus()}
        </div>

        <div className="board">
          {board.map((cell, index) => (
            <button
              key={index}
              className={`cell ${cell}`}
              onClick={() => handleClick(index)}
            >
              {cell}
            </button>
          ))}
        </div>

        <button className="restart-btn" onClick={restartGame}>
          🔄 Restart Game
        </button>
      </main>

      <footer>XO Arena • WebSocket Multiplayer</footer>
    </div>
  );
}

export default App;