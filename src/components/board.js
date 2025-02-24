import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './board.css';
import { placeBomb, triggerExplosion, checkForBomb } from '../logic/bomberLogic';

const directions = [
  [0, 1], [1, 0], [0, -1], [-1, 0],
  [-1, -1], [-1, 1], [1, -1], [1, 1]
];

const initialBoard = Array(8).fill(null).map(() => Array(8).fill({ type: 'empty', player: null }));
initialBoard[3][3] = { type: 'regular', player: 'W' };
initialBoard[3][4] = { type: 'regular', player: 'B' };
initialBoard[4][3] = { type: 'regular', player: 'B' };
initialBoard[4][4] = { type: 'regular', player: 'W' };

const Board = ({ playerColor }) => {
  const { gameCode } = useParams();
  const [board, setBoard] = useState(initialBoard);
  const [currentPlayer, setCurrentPlayer] = useState('B');
  const [validMoves, setValidMoves] = useState([]);
  const [selectedDucky, setSelectedDucky] = useState('regular');
  const [blackCount, setBlackCount] = useState(2);
  const [whiteCount, setWhiteCount] = useState(2);
  const [shieldedCells, setShieldedCells] = useState({ B: [], W: [] });
  const [selectedCell, setSelectedCell] = useState(null); // To highlight the cell where the bomb is placed
  const [bombs, setBombs] = useState({ B: null, W: null });
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);

  const calculatePieceCount = (board) => {
    let black = 0;
    let white = 0;
    board.forEach(row => {
      row.forEach(cell => {
        if (cell.player === 'B') black++;
        if (cell.player === 'W') white++;
      });
    });
    setBlackCount(black);
    setWhiteCount(white);
  };

  const isValidMove = (board, row, col, player, type) => {
    if (board[row][col].player !== null) return false; // Cell must be empty
    const opponent = player === 'B' ? 'W' : 'B';
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
    setValidMoves(moves);
  };

  const flipPieces = (board, row, col, player, type, shieldedCells) => {
    const opponent = player === 'B' ? 'W' : 'B';
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

      if (x >= 0 && x < 8 && y >= 0 && y < 8 && board[x][y].player === player) {
        piecesToFlip.forEach(([fx, fy]) => {
          newBoard[fx][fy] = { type: board[fx][fy].type, player };
        });
      }
    });

    newBoard[row][col] = { type, player };
    return newBoard;
  };

  const canGetShielded = (player, shieldedCells, row, col) => {
    if (shieldedCells[player].length >= 1) {
      alert('can only use one shield!');
      return false;
    }
    const opponent = player === 'B' ? 'W' : 'B';
    if (board[row][col].player === opponent) {
      alert("Cannot shield opponent's cell!");
      return false;
    }
    return true;
  };

  const checkGameOver = (board) => {
    const isBoardFull = board.every(row => row.every(cell => cell.player !== null));
    if (isBoardFull) {
      setGameOver(true);
      if (blackCount > whiteCount) {
        setWinner('Black');
      } else if (whiteCount > blackCount) {
        setWinner('White');
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
    setBlackCount(2);
    setWhiteCount(2);
    setShieldedCells({ B: [], W: [] });
    setSelectedCell(null);
    setBombs({ B: null, W: null });
    setGameOver(false);
    setWinner(null);
  };

  useEffect(() => {
    calculateValidMoves(board, currentPlayer);
    checkGameOver(board);
  }, [board, currentPlayer]);

  const handleClick = (row, col) => {
    if (board[row][col].player !== null) {
      alert('This cell is already occupied!');
      return;
    }
    const isValid = validMoves.some(([validRow, validCol]) => validRow === row && validCol === col);
    if (!isValid) {
      alert('This is not a valid move!');
      return;
    }
    if (selectedDucky === 'shield' && !canGetShielded(currentPlayer, shieldedCells, row, col)) return;
    if (selectedDucky === 'bomb') {
      // Handle bomb placement
      if (bombs[currentPlayer] !== null) {
        alert('You can only place one bomb per game!');
        return;
      }
      const newBombs = { ...bombs, [currentPlayer]: [row, col] };
      setBombs(newBombs);

      const newBoard = board.map(rowArr => rowArr.slice());
      newBoard[row][col] = { type: 'bomb', player: currentPlayer }; // Place bomb on board
      setBoard(newBoard);

    } else if (selectedDucky === 'shield') {
      setShieldedCells((prev) => {
        const newShielded = [...prev[currentPlayer], [row, col]];
        console.log(`Shielded cells for ${currentPlayer}:`, newShielded);

        // Set the board piece color for shielded cells
        const newBoard = board.map((rowArr, rowIndex) => rowArr.map((cell, colIndex) => {
          if (rowIndex === row && colIndex === col) {
            return { type: 'shield', player: currentPlayer };
          }
          return cell;
        }));
        setBoard(newBoard);

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

    setCurrentPlayer(currentPlayer === 'B' ? 'W' : 'B');
  };

  const renderCell = (row, col) => {
    const isValid = validMoves.some(([validRow, validCol]) => validRow === row && validCol === col);
    const isShielded = shieldedCells[currentPlayer].some(([shieldRow, shieldCol]) => shieldRow === row && shieldCol === col);
    const piece = board[row][col];
    const shieldClass = piece.type === 'shield'? 'shielded-piece': '';
    const bombClass = piece.type === 'bomb' ? 'bomb-cell' : '';

    return (
        <div
            key={`${row}-${col}`}
            className={`cell ${isValid ? 'valid-move' : ''} ${isShielded ? 'shielded-cell' : ''}`}
            onClick={() => handleClick(row, col)}
        >
          {piece.player && <div className={`piece ${piece.player} ${piece.type} ${shieldClass}`} />}
        </div>
    );
  };

  return (
      <div className="board-container">
        {gameOver && (
          <div className="game-over">
            <h2>Game Over</h2>
            <p>{winner === 'Draw' ? "It's a Draw!" : `${winner} Wins!`}</p>
            <button onClick={restartGame}>Restart Game</button>
          </div>
        )}
        <div className={`board ${gameOver ? 'disabled' : ''}`}>
          {board.map((row, rowIndex) =>
              row.map((_, colIndex) => renderCell(rowIndex, colIndex))
          )}
        </div>
        <div className="piece-count">
          <div>Black: {blackCount}</div>
          <div>White: {whiteCount}</div>
        </div>
        <div className="ducky-selection">
          <button
              onClick={() => setSelectedDucky('regular')}
              className={selectedDucky === 'regular' ? 'selected' : ''}
          >
            Regular Ducky
          </button>
          <button
              onClick={() => setSelectedDucky('shield')}
              className={selectedDucky === 'shield' ? 'selected' : ''}
          >
            Shield Ducky
          </button>
          <button
          onClick={() => setSelectedDucky('bomb')}
          className={selectedDucky === 'bomb' ? 'selected' : ''}
        >
          Bomber Ducky
        </button>
        </div>

      </div>
  );
};

export default Board;
