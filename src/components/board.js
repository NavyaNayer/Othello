import React, { useState, useEffect } from 'react';
import './board.css';

const directions = [
  [0, 1], [1, 0], [0, -1], [-1, 0],
  [-1, -1], [-1, 1], [1, -1], [1, 1]
];

const initialBoard = Array(8).fill(null).map(() => Array(8).fill({ type: 'empty', player: null }));
initialBoard[3][3] = { type: 'regular', player: 'W' };
initialBoard[3][4] = { type: 'regular', player: 'B' };
initialBoard[4][3] = { type: 'regular', player: 'B' };
initialBoard[4][4] = { type: 'regular', player: 'W' };

const Board = () => {
  const [board, setBoard] = useState(initialBoard);
  const [currentPlayer, setCurrentPlayer] = useState('B');
  const [validMoves, setValidMoves] = useState([]);
  const [selectedDucky, setSelectedDucky] = useState('regular');
  const [blackCount, setBlackCount] = useState(2);
  const [whiteCount, setWhiteCount] = useState(2);
  const [shieldedCells, setShieldedCells] = useState({ B: [], W: [] });

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

  useEffect(() => {
    calculateValidMoves(board, currentPlayer);
  }, [board, currentPlayer]);

  const handleClick = (row, col) => {
    if (selectedDucky === 'shield' && !canGetShielded(currentPlayer, shieldedCells, row, col)) return;
    if (!isValidMove(board, row, col, currentPlayer, selectedDucky)) return;

    if (selectedDucky === 'shield') {
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

    setCurrentPlayer(currentPlayer === 'B' ? 'W' : 'B');
  };

  const renderCell = (row, col) => {
    const isValid = validMoves.some(([validRow, validCol]) => validRow === row && validCol === col);
    const isShielded = shieldedCells[currentPlayer].some(([shieldRow, shieldCol]) => shieldRow === row && shieldCol === col);
    const piece = board[row][col];
    const shieldClass = piece.type === 'shield'? 'shielded-piece': '';

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
        <div className="board">
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
        </div>

      </div>
  );
};

export default Board;
