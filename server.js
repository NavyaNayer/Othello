const http = require("http");
const express = require("express");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.static("public"));

const createNewBoard = () => {
    return Array(8).fill(null).map(() => Array(8).fill({ type: 'empty', player: null }));
};

const getInitialBoard = () => {
    const board = createNewBoard();
    board[3][3] = { type: 'regular', player: 'W' };
    board[3][4] = { type: 'regular', player: 'B' };
    board[4][3] = { type: 'regular', player: 'B' };
    board[4][4] = { type: 'regular', player: 'W' };
    return board;
};

const games = {};

const directions = [
  [0, 1], [1, 0], [0, -1], [-1, 0],
  [-1, -1], [-1, 1], [1, -1], [1, 1]
];

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
  
      if (piecesToFlip.length > 0 && x >= 0 && x < 8 && y >= 0 && y < 8 && board[x][y].player === player) {
        piecesToFlip.forEach(([fx, fy]) => {
          newBoard[fx][fy] = { type: board[fx][fy].type, player };
        });
      }
    });
  
    newBoard[row][col] = { type, player };
    return newBoard;
  };

io.on("connection", (socket) => {
    console.log(`✅ A user connected: ${socket.id}`);

    socket.on('joinGame', ({ gameCode }) => {
        console.log(`User ${socket.id} requested to join game ${gameCode}`);
        socket.join(gameCode);
    
        if (!games[gameCode]) {
            games[gameCode] = { 
                board: getInitialBoard(), 
                currentPlayer: 'B', 
                players: {} // Ensure we properly track players
            };
        }
    
        const game = games[gameCode];
        // Check if the user is already in the game
        if (game.players.B === socket.id || game.players.W === socket.id) {
            console.log(`⛔ User ${socket.id} is already in game ${gameCode}`);
            return;
        }
    
        // Assign players strictly as 'B' or 'W'
        if (!game.players.B) {
            game.players.B = socket.id;
            socket.emit('assignedColor', 'B');
            console.log(`✅ User ${socket.id} assigned Black (B)`);
        } else if (!game.players.W) {
            game.players.W = socket.id;
            socket.emit('assignedColor', 'W');
            console.log(`✅ User ${socket.id} assigned White (W)`);
        } else {
            // Reject extra players
            socket.emit('error', 'Game is full.');
            console.log(`⛔ User ${socket.id} tried to join a full game.`);
            return;
        }
    
        io.to(gameCode).emit('gameState', game);
    });
    

    socket.on('makeMove', ({ gameCode, move }) => {
        console.log(`Move made in game ${gameCode}:`, move);
        const game = games[gameCode];
        if (!game) return;

        const { row, col, player, type } = move;

        // Validate turn
        if (game.currentPlayer !== player) {
            console.log(`Invalid move: It's ${game.currentPlayer}'s turn.`);
            return;
        }

        // Validate player identity
        if (game.players[player] !== socket.id) {
            console.log(`Invalid move: ${socket.id} is not playing as ${player}.`);
            return;
        }

        // Update board
        game.board = flipPieces(game.board, row, col, player, type, { B: [], W: [] });
        game.currentPlayer = player === 'B' ? 'W' : 'B';

        io.to(gameCode).emit('gameState', game);
    });

    socket.on("disconnect", () => {
        console.log(`❌ User disconnected: ${socket.id}`);
        
        for (const gameCode in games) {
            const game = games[gameCode];
            for (const color in game.players) {
                if (game.players[color] === socket.id) {
                    console.log(`Player ${color} disconnected from game ${gameCode}`);
                    game.players[color] = null; // Keep their spot reserved
                }
            }
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
