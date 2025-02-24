import React from 'react';
import { useNavigate } from 'react-router-dom';
import './landingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();

  const startGame = () => {
    navigate('/game');
  };

  return (
    <div className="landing-page">
      <h1>Welcome to Othello with Duckies</h1>
      <button onClick={startGame}>Start Game</button>
    </div>
  );
};

export default LandingPage;
