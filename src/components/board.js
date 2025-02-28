import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import './board.css';
import { placeBomb, triggerExplosion, checkForBomb } from '../logic/bomberLogic';

const socket = io('http://localhost:3000'); // Ensure this points to the backend server

socket.on('connect', () => {
  console.log('Connected to server:', socket.id);
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

const directions = [
  [0, 1], [1, 0], [0, -1], [-1, 0],
  [-1, -1], [-1, 1], [1, -1], [1, 1]
];

const initialBoard = Array(8).fill(null).map(() => Array(8).fill({ type: 'empty', player: null }));
initialBoard[3][3] = { type: 'regular', player: 'R' };
initialBoard[3][4] = { type: 'regular', player: 'B' };
initialBoard[4][3] = { type: 'regular', player: 'B' };
initialBoard[4][4] = { type: 'regular', player: 'R' };

const Board = () => {
  const { gameCode } = useParams();
  const [board, setBoard] = useState(initialBoard);
  const [currentPlayer, setCurrentPlayer] = useState('B');
  const [validMoves, setValidMoves] = useState([]);
  const [selectedDucky, setSelectedDucky] = useState('regular');
  const [blueCount, setBlueCount] = useState(2);
  const [redCount, setRedCount] = useState(2);
  const [shieldedCells, setShieldedCells] = useState({ B: [], R: [] });
  const [shieldUsed, setShieldUsed] = useState({ B: false, R: false });
  const [selectedCell, setSelectedCell] = useState(null); // To highlight the cell where the bomb is placed
  const [bombs, setBombs] = useState({ B: null, R: null });
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [assignedColor, setAssignedColor] = useState(null); // Store assigned color

  useEffect(() => {
    console.log('Joining game:', gameCode);
    socket.emit('joinGame', { gameCode });

    if (gameCode === 'computer') {
      setAssignedColor('B');
    }

    socket.on('assignedColor', (color) => {
      setAssignedColor(color);
      console.log(`Assigned color: ${color}`);
    });

    socket.on('gameState', (gameState) => {
      console.log('Received game state:', gameState);
      setBoard(gameState.board);
      setCurrentPlayer(gameState.currentPlayer);
      calculatePieceCount(gameState.board);
      setValidMoves(calculateValidMoves(gameState.board, gameState.currentPlayer));
    });

    return () => {
      socket.off('assignedColor');
      socket.off('gameState');
    };
  }, [gameCode]);

  const calculatePieceCount = (board) => {
    let blue = 0;
    let red = 0;
    board.forEach(row => {
      row.forEach(cell => {
        if (cell.player === 'B') blue++;
        if (cell.player === 'R') red++;
      });
    });
    setBlueCount(blue);
    setRedCount(red);
  };

  const isValidMove = (board, row, col, player, type) => {
    if (board[row][col].player !== null) return false; // Cell must be empty
    const opponent = player === 'B' ? 'R' : 'B';
    let valid = false;

    directions.forEach(([dx, dy]) => {
      let x = row + dx;
      let y = col + dy;
      let hasOpponentBetween = false;

      while (x >= 0 && x < 8 && y >= 0 && y < 8 && board[x][y].player === opponent) {
        hasOpponentBetween = true;
        x += dx;
        y += dy;
      }

      if (hasOpponentBetween && x >= 0 && x < 8 && y >= 0 && y < 8 && board[x][y].player === player) {
        valid = true;
      }
    });

    return valid;
  };

  const calculateValidMoves = (board, player) => {
    const moves = [];
    board.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (isValidMove(board, rowIndex, colIndex, player, selectedDucky)) {
          moves.push([rowIndex, colIndex]);
        }
      });
    });
    return moves; // Return the array of valid moves
  };

  const flipPieces = (board, row, col, player, type, shieldedCells) => {
    const opponent = player === 'B' ? 'R' : 'B';
    const newBoard = board.map(row => row.slice());

    directions.forEach(([dx, dy]) => {
      let x = row + dx;
      let y = col + dy;
      const piecesToFlip = [];

      while (x >= 0 && x < 8 && y >= 0 && y < 8 && board[x][y].player === opponent) {
        // Skip shielded opponent's cells
        if (!shieldedCells[opponent].some(([shieldRow, shieldCol]) => shieldRow === x && shieldCol === y)) {
          piecesToFlip.push([x, y]);
        }
        x += dx;
        y += dy;
      }

      if (piecesToFlip.length > 0 && x >= 0 && x < 8 && y >= 0 && y < 8 && board[x][y].player === player) {
        piecesToFlip.forEach(([fx, fy]) => {
          newBoard[fx][fy] = { type: board[fx][fy].type, player };
        });
      }
    });

    newBoard[row][col] = { type, player };
    return newBoard;
  };

  const showNotification = (message) => {
    // Remove existing notification if any
    const existingBox = document.querySelector('.notification-box');
    if (existingBox) {
      existingBox.remove();
    }

    // Create the notification box
    const notificationBox = document.createElement('div');
    notificationBox.classList.add('notification-box');
    notificationBox.innerText = message;
    document.body.appendChild(notificationBox);

    // Remove the box after 2.5 seconds with fade-out effect
    setTimeout(() => {
      notificationBox.classList.add('fade-out');
      setTimeout(() => notificationBox.remove(), 500);
    }, 2000);
  };

  const canGetShielded = (player, shieldedCells, row, col) => {
    const opponent = player === 'B' ? 'R' : 'B';
    if (board[row][col].player === opponent) {
      showNotification("Cannot shield opponent's cell!");
      return false;
    }
    return true;
  };

  const checkGameOver = (board) => {
    const isBoardFull = board.every(row => row.every(cell => cell.player !== null));
    if (isBoardFull) {
      setGameOver(true);
      if (blueCount > redCount) {
        setWinner('Blue');
      } else if (redCount > blueCount) {
        setWinner('Red');
      } else {
        setWinner('Draw');
      }
    }
  };

  const restartGame = () => {
    setBoard(initialBoard);
    setCurrentPlayer('B');
    setValidMoves([]);
    setSelectedDucky('regular');
    setBlueCount(2);
    setRedCount(2);
    setShieldedCells({ B: [], R: [] });
    setSelectedCell(null);
    setBombs({ B: null, R: null });
    setGameOver(false);
    setWinner(null);
  };

  useEffect(() => {
    setValidMoves(calculateValidMoves(board, currentPlayer));
    checkGameOver(board);
  }, [board, currentPlayer]);

  const makeComputerMove = () => {
    const validMoves = calculateValidMoves(board, 'R');
    if (validMoves.length > 0) {
      const [row, col] = validMoves[Math.floor(Math.random() * validMoves.length)];
      const newBoard = flipPieces(board, row, col, 'R', 'regular', shieldedCells);
      setBoard(newBoard);
      calculatePieceCount(newBoard);
      setCurrentPlayer('B');
    } else {
      // No valid moves for computer, pass turn back to player
      setCurrentPlayer('B');
      showNotification("Computer has no valid moves, your turn again!");
    }
  };

  useEffect(() => {
    if (gameCode === 'computer' && currentPlayer === 'R') {
      setTimeout(makeComputerMove, 1000); // Delay for computer move
    }
  }, [currentPlayer, gameCode]);

  const handleClick = (row, col) => {
    console.log(`handleClick: row=${row}, col=${col}, currentPlayer=${currentPlayer}, assignedColor=${assignedColor}`);
    if (board[row][col].player !== null) {
      showNotification("This cell is already occupied!");
      return;
    }
    if (currentPlayer !== assignedColor) {
      showNotification("Opponent's turn!");
      return;
    }
    if (gameCode === 'computer' && currentPlayer === 'R') {
      showNotification("Opponent's turn!");
      return;
    }
    const isValid = validMoves.some(([validRow, validCol]) => validRow === row && validCol === col);
    if (!isValid) {
      showNotification("This is not a valid move!");
      return;
    }
    if (selectedDucky === 'shield' && !canGetShielded(currentPlayer, shieldedCells, row, col)) return;
    if (selectedDucky === 'bomb') {
      // Handle bomb placement
      if (bombs[currentPlayer] !== null) {
        showNotification("You can only place one bomb per game!");
        return;
      }
      const newBombs = { ...bombs, [currentPlayer]: [row, col] };
      setBombs(newBombs);

      const newBoard = board.map(rowArr => rowArr.slice());
      newBoard[row][col] = { type: 'bomb', player: currentPlayer }; // Place bomb on board
      setBoard(newBoard);

    } else if (selectedDucky === 'shield') {
      if (!canGetShielded(currentPlayer, shieldedCells, row, col)) return;

      setShieldedCells((prev) => {
        const newShielded = [...prev[currentPlayer], [row, col]];
        console.log(`Shielded cells for ${currentPlayer}:`, newShielded);

        // Set the board piece color for shielded cells
        const newBoard = board.map((rowArr, rowIndex) =>
            rowArr.map((cell, colIndex) => {
              if (rowIndex === row && colIndex === col) {
                return { type: 'shield', player: currentPlayer };
              }
              return cell;
            })
        );
        setBoard(newBoard);

        // Mark shield as used for the current player
        setShieldUsed((prev) => ({ ...prev, [currentPlayer]: true }));

        // Change selected ducky back to 'regular' after placing a shield
        setSelectedDucky('regular');

        return { ...prev, [currentPlayer]: newShielded };
      });
    } else {
      const newBoard = flipPieces(board, row, col, currentPlayer, selectedDucky, shieldedCells);
      setBoard(newBoard);
      calculatePieceCount(newBoard);
    }

    // Check for bomb explosion
    if (bombs[currentPlayer] && [row, col].toString() === bombs[currentPlayer].toString()) {
      triggerExplosion(row, col, currentPlayer, board, setBoard); // Trigger explosion if bomb is stepped on
    }

    const nextPlayer = currentPlayer === 'B' ? 'R' : 'B';
    const nextValidMoves = calculateValidMoves(board, nextPlayer);
    if (nextValidMoves.length > 0) {
      setCurrentPlayer(nextPlayer);
    } else {
      showNotification(`${nextPlayer === 'B' ? 'Blue' : 'Red'} has no valid moves, your turn again!`);
    }
    socket.emit('makeMove', { gameCode, move: { row, col, player: currentPlayer, type: selectedDucky } });
  };

  const renderCell = (row, col) => {
    const isValid = validMoves.some(([validRow, validCol]) => validRow === row && validCol === col);
    const isShielded = shieldedCells[currentPlayer].some(([shieldRow, shieldCol]) => shieldRow === row && shieldCol === col);
    const piece = board[row][col];
    const shieldClass = piece.type === 'shield'? 'shielded-piece': '';
    const bombClass = piece.type === 'bomb' ? 'bomb-cell' : '';

    let imageSrc = '';
    if (piece.player === 'B') {
      if(piece.type === 'regular'){
        imageSrc = '/images/blue_duckie.png';
      } else if (piece.type === 'shield') {
        imageSrc = '/images/blue_shield_duckie.png';
      } else if (piece.type === 'bomb') {
        imageSrc = '/images/blue_bomb_duckie.png';
      }
    } else {
      if(piece.type === 'regular'){
        imageSrc = '/images/red_duckie.png';
      } else if (piece.type === 'shield') {
        imageSrc = '/images/red_shield_duckie.png';
      } else if (piece.type === 'bomb') {
        imageSrc = '/images/red_bomb_duckie.png';
      }
    }

    return (
        <div
            key={`${row}-${col}`}
            className={`cell ${isValid ? 'valid-move' : ''}`}
            onClick={() => handleClick(row, col)}
        >
          {imageSrc && <img src={imageSrc} alt={piece.type} className="piece-image" />}
        </div>
    );
  };

  return (
      <div className="board-container">
        {/* Piece Count */}
        <div className="piece-count">
          <div>
            <img
                className="duckie-img"
                src={'/images/blue_duckie.png'}
                alt="Blue Ducky"
            />
            : {blueCount}
          </div>
          <div>
            <img
                className="duckie-img"
                src={'/images/red_duckie.png'}
                alt="Red Ducky"
            />
            : {redCount}
          </div>
        </div>

        {/* Game Over Message */}
        {gameOver && (
            <div className="game-over">
              <h2>Game Over</h2>
              <p>{winner === 'Draw' ? "It's a Draw!" : `${winner} Wins!`}</p>
              <button onClick={restartGame}>Restart Game</button>
            </div>
        )}

        {/* Game Board */}
        <div className={`board ${gameOver ? 'disabled' : ''}`}>
          {board.map((row, rowIndex) =>
              row.map((_, colIndex) => renderCell(rowIndex, colIndex))
          )}
        </div>

        {/* Ducky Selection */}
        <div className="ducky-selection">
          {/* Regular Ducky */}
          <button
              onClick={() => setSelectedDucky('regular')}
              className={selectedDucky === 'regular' ? 'selected' : ''}
          >
            <p className="button-text">Regular Ducky</p>
            <img
                className="duckie-img"
                src={assignedColor === 'B' ? '/images/blue_duckie.png' : '/images/red_duckie.png'}
                alt="Regular Ducky"
            />
          </button>

          {/* Shield Ducky */}
          <button
              onClick={() => {
                if (shieldUsed[assignedColor]) {
                  showNotification('You can only use the shield once!'); // Show notification if disabled
                } else {
                  setSelectedDucky('shield');
                }
              }}
              className={`${selectedDucky === 'shield' ? 'selected' : ''} ${
                  shieldUsed[assignedColor] ? 'disabled' : ''
              }`}
          >
            <p className="button-text">Shield Ducky</p>
            <img
                className="duckie-img"
                src={assignedColor === 'B' ? '/images/blue_shield_duckie.png' : '/images/red_shield_duckie.png'}
                alt="Shield Ducky"
            />
          </button>

          {/* Bomber Ducky */}
          <button
              onClick={() => setSelectedDucky('bomb')}
              className={selectedDucky === 'bomb' ? 'selected' : ''}
          >
            <p className="button-text">Bomber Ducky</p>
            <img
                className="duckie-img"
                src={assignedColor === 'B' ? '/images/blue_bomb_duckie.png' : '/images/red_bomb_duckie.png'}
                alt="Bomber Ducky"
            />
          </button>
        </div>

      </div>
  );
};

export default Board;
