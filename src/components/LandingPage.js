import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./landingPage.css";

const LandingPage = ({ setGameCode, setPlayerColor }) => {
  const [code, setCode] = useState("");
  const [createdCode, setCreatedCode] = useState("");
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const createGame = () => {
    const newCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    setGameCode(newCode);
    setPlayerColor("B");
    setCreatedCode(newCode);
    setCopied(false);
  };

  const joinGame = () => {
    if (code.trim() === "") return;
    setGameCode(code);
    setPlayerColor("W");
    navigate(`/game/${code}`);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(createdCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 5000);
  };

  const startGame = () => {
    navigate(`/game/${createdCode}`);
  };

  const startGameWithComputer = () => {
    const gameCode = "computer";
    setGameCode(gameCode);
    setPlayerColor("B");
    navigate(`/game/${gameCode}`);
  };

  return (
    <div className="landing-page">
      
      <h1>Welcome to Duckland!</h1>
      <p className="subtitle">Strategize, Play, and Win with your Duckie Companion!</p>

      <button className="glow-button" onClick={createGame}>
        🏆 Create Game
      </button>

      {createdCode && (
        <div className="game-code">
          <p>Game Code: <span className="game-code-text">{createdCode}</span></p>
          <button onClick={copyToClipboard} className={`copy-button ${copied ? "copied" : ""}`}>
            {copied ? "✅ Copied" : "📋 Copy Code"}
          </button>
          <button className="start-button" onClick={startGame}>🚀 Start Game</button>
        </div>
      )}

      <input
        type="text"
        className="game-input"
        placeholder="Enter game code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />

      <button className="glow-button" onClick={joinGame} disabled={!code.trim()}>
        🔗 Join Game
      </button>

      <button className="computer-button" onClick={startGameWithComputer}>
        🤖 Play Against Computer
      </button>
    </div>
  );
};

export default LandingPage;
