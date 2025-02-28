import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './lobby.css';

const Lobby = ({ setGameCode, setPlayerColor }) => {
  const [code, setCode] = useState('');
  const navigate = useNavigate();

  const createGame = () => {
    const newCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    setGameCode(newCode);
    setPlayerColor('B');
    navigate(`/game/${newCode}`);
  };

  const joinGame = () => {
    setGameCode(code);
    setPlayerColor('R');
    navigate(`/game/${code}`);
  };

  return (
    <div className="lobby">
      <h1>Join or Create a Game</h1>
      <button onClick={createGame}>Create Game</button>
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

export default Lobby;
