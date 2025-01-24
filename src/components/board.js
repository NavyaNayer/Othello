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

  const isValidMove = (board, row, col, player, type) => {
    if (board[row][col].player !== null) return false; // Cell must be empty
    const opponent = player === 'B' ? 'W' : 'B';
    let valid = false;

    directions.forEach(([dx, dy]) => {
      let x = row + dx;
      let y = col + dy;
      let hasOpponentBetween = false;

      while (x >= 0 && x < 8 && y >= 0 && y < 8 && board[x][y].player === opponent) {
        if (type === 'blocker') break; // Blocker stops the flipping process
        hasOpponentBetween = true;
        x += dx;
        y += dy;
      }

      if (hasOpponentBetween && x >= 0 && x < 8 && y >= 0 && y < 8 && board[x][y].player === player) {
        valid = true;
      }
      if (type === 'jumper' && x >= 0 && x < 8 && y >= 0 && y < 8 && board[x][y].player === player) {
        // Jumper can jump over a single opponent piece
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

  const flipPieces = (board, row, col, player, type) => {
    const opponent = player === 'B' ? 'W' : 'B';
    const newBoard = board.map(row => row.slice());

    directions.forEach(([dx, dy]) => {
      let x = row + dx;
      let y = col + dy;
      const piecesToFlip = [];

      while (x >= 0 && x < 8 && y >= 0 && y < 8 && board[x][y].player === opponent) {
        piecesToFlip.push([x, y]);
        x += dx;
        y += dy;
      }

      if (x >= 0 && x < 8 && y >= 0 && y < 8 && board[x][y].player === player) {
        piecesToFlip.forEach(([fx, fy]) => {
          newBoard[fx][fy] = { type: board[fx][fy].type, player };
        });
      }

      if (type === 'jumper') {
        // For jumper, flip the opponent's piece after the gap
        const jumperPiecesToFlip = [];
        x = row + dx;
        y = col + dy;
        let jumped = false;
        while (x >= 0 && x < 8 && y >= 0 && y < 8) {
          if (board[x][y].player === opponent) {
            jumped = true;
            x += dx;
            y += dy;
          } else if (jumped && board[x][y].player === player) {
            jumperPiecesToFlip.push([x, y]);
            break;
          } else {
            break;
          }
        }
        jumperPiecesToFlip.forEach(([fx, fy]) => {
          newBoard[fx][fy] = { type: board[fx][fy].type, player };
        });
      }
    });

    newBoard[row][col] = { type, player };
    return newBoard;
  };

  const handleClick = (row, col) => {
    if (!isValidMove(board, row, col, currentPlayer, selectedDucky)) return;

    const newBoard = flipPieces(board, row, col, currentPlayer, selectedDucky);
    setBoard(newBoard);
    setCurrentPlayer(currentPlayer === 'B' ? 'W' : 'B');
  };

  useEffect(() => {
    calculateValidMoves(board, currentPlayer);
  }, [board, currentPlayer]);

  const renderCell = (row, col) => {
    const isValid = validMoves.some(([validRow, validCol]) => validRow === row && validCol === col);
    const piece = board[row][col];

    return (
      <div
        key={`${row}-${col}`}
        className={`cell ${isValid ? 'valid-move' : ''}`}
        onClick={() => handleClick(row, col)}
      >
        {piece.player && <div className={`piece ${piece.player} ${piece.type}`} />}
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
      <div className="ducky-selection">
        <button onClick={() => setSelectedDucky('regular')}>Regular Ducky</button>
        <button onClick={() => setSelectedDucky('jumper')}>Jumper Ducky</button>
        <button onClick={() => setSelectedDucky('blocker')}>Blocker Ducky</button>
      </div>
    </div>
  );
};

export default Board;
