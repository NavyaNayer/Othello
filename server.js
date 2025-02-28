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
    board[3][3] = { type: 'regular', player: 'R' };
    board[3][4] = { type: 'regular', player: 'B' };
    board[4][3] = { type: 'regular', player: 'B' };
    board[4][4] = { type: 'regular', player: 'R' };
    return board;
};

const games = {};

const directions = [
    [0, 1], [1, 0], [0, -1], [-1, 0],
    [-1, -1], [-1, 1], [1, -1], [1, 1]
];

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

const flipPieces = (board, row, col, player, type, shieldedCells) => {
    const opponent = player === 'B' ? 'R' : 'B';
    const newBoard = board.map(row => row.slice());

    directions.forEach(([dx, dy]) => {
        let x = row + dx;
        let y = col + dy;
        const piecesToFlip = [];

        while (x >= 0 && x < 8 && y >= 0 && y < 8 && board[x][y].player === opponent) {
            const isShielded =
                shieldedCells['B'].some(([shieldRow, shieldCol]) => shieldRow === x && shieldCol === y) ||
                shieldedCells['R'].some(([shieldRow, shieldCol]) => shieldRow === x && shieldCol === y);

            if (!isShielded) {
                piecesToFlip.push([x, y]);
            } else {
                break; // Stop flipping when encountering a shielded cell
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

const calculateValidMoves = (board, player) => {
    const moves = [];
    board.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
            if (isValidMove(board, rowIndex, colIndex, player, 'regular')) {
                moves.push([rowIndex, colIndex]);
            }
        });
    });
    return moves; // Return the array of valid moves
};

const makeComputerMove = (game) => {
    const validMoves = calculateValidMoves(game.board, 'R');
    if (validMoves.length > 0) {
        const [row, col] = validMoves[Math.floor(Math.random() * validMoves.length)];
        game.board = flipPieces(game.board, row, col, 'R', 'regular', game.shieldedCells);
        game.currentPlayer = 'B';
        io.to(game.gameCode).emit('gameState', game); // Emit game state after computer move
    } else {
        // No valid moves for computer, pass turn back to player
        game.currentPlayer = 'B';
        io.to(game.gameCode).emit('gameState', game);
        io.to(game.gameCode).emit('notification', "Computer has no valid moves, your turn again!");
    }
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
                players: {},
                shieldedCells: { B: [], R: [] },
                gameCode
            };
        }

        const game = games[gameCode];
        // Check if the user is already in the game
        if (game.players.B === socket.id || game.players.R === socket.id) {
            console.log(`⛔ User ${socket.id} is already in game ${gameCode}`);
            return;
        }

        // Assign players strictly as 'B' or 'R'
        if (!game.players.B) {
            game.players.B = socket.id;
            socket.emit('assignedColor', 'B');
            console.log(`✅ User ${socket.id} assigned Blue (B)`);
        } else if (!game.players.R) {
            game.players.R = socket.id;
            socket.emit('assignedColor', 'R');
            console.log(`✅ User ${socket.id} assigned Red (R)`);
        } else {
            // Reject extra players
            socket.emit('error', 'Game is full.');
            console.log(`⛔ User ${socket.id} tried to join a full game.`);
            return;
        }

        if (gameCode === 'computer') {
            game.currentPlayer = 'B';
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

        // Validate shield placement
        if (type === 'shield' && game.shieldedCells[player].some(([r, c]) => r === row && c === col)) {
            console.log(`Invalid move: Shield already placed in this cell.`);
            return;
        }

        // Update board and shielded cells
        if (type === 'shield') {
            game.shieldedCells[player].push([row, col]);
            io.to(gameCode).emit('shieldsUpdated', game.shieldedCells); // Sync shielded cells
        }

        game.board = flipPieces(game.board, row, col, player, type, game.shieldedCells);
        const nextPlayer = player === 'B' ? 'R' : 'B';
        const nextValidMoves = calculateValidMoves(game.board, nextPlayer);

        if (nextValidMoves.length > 0) {
            game.currentPlayer = nextPlayer;
        } else {
            game.currentPlayer = player;
            io.to(gameCode).emit('notification', `${nextPlayer === 'B' ? 'Blue' : 'Red'} has no valid moves, your turn again!`);
        }

        io.to(gameCode).emit('gameState', {
            board: game.board,
            currentPlayer: game.currentPlayer,
            shieldedCells: game.shieldedCells
        });
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
