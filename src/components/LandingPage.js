import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './landingPage.css';

const LandingPage = ({ setGameCode, setPlayerColor }) => {
  const [code, setCode] = useState('');
  const [createdCode, setCreatedCode] = useState('');
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const createGame = () => {
    const newCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    setGameCode(newCode);
    setPlayerColor('B');
    setCreatedCode(newCode);
    setCopied(false); // Reset copied state
  };

  const joinGame = () => {
    setGameCode(code);
    setPlayerColor('W');
    navigate(`/game/${code}`);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(createdCode);
    setCopied(true);
  };

  const startGame = () => {
    navigate(`/game/${createdCode}`);
  };

  return (
      <div className="landing-page">
        <h1>Welcome to Othello with Duckies</h1>
        <button onClick={createGame}>Create Game</button>
        {createdCode && (
            <div className="game-code">
              <p>Game Code: {createdCode}</p>
              <button
                  onClick={copyToClipboard}
                  style={{ backgroundColor: copied ? 'green' : '' }}
              >
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
              <button onClick={startGame}>Start Game</button>
            </div>
        )}
        <input
            type="text"
            placeholder="Enter game code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
        />
        <button onClick={joinGame}>Join Game</button>
      </div>
  );
};

export default LandingPage;
