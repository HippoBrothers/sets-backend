const {Game} = require("./Game");

class GameServer {
    constructor(io, events) {
        this.games = {};

        io.on('connection', (socket) => {
            console.log("Player connected")
            socket.on('create', (args) => {
                console.log("create received", args);
                const game = new Game(io, events);
                this.games[game.roomID] = game;
                args.roomID = game.roomID;
                this.joinGame(socket, args);
                console.log(game.players);

            });

            socket.on('roomExist', (args) => {
                if (this.games[args.roomID]) {
                    socket.emit('scoreboard', {scoreboard: this.games[args.roomID].getScoreboard()})
                } else {
                    socket.emit('err', {msg: 'Salle inexistante'});
                }
            });

            socket.on('join', (args) => {
                console.log("join received", args);
                if (this.games[args.roomID]) {
                    this.joinGame(socket, args)
                } else {
                    socket.emit('err', {msg: 'Salle inexistante'})
                }

            });


        });
    }

    joinGame(socket, args) {
        const id = this.games[args.roomID].joinRoom(args, socket);

        socket.on('leave', () => {
            console.log("Leave received");

            if (this.games[args.roomID]) {
                if (this.games[args.roomID].leaveRoom(id, true) === 0) {
                    delete this.games[args.roomID];
                }
                socket.removeAllListeners('leave');
                socket.removeAllListeners('disconnect');
            }
        });
        socket.on('disconnect', () => {
            console.log("dc")
            if (this.games[args.roomID]) {
                if (this.games[args.roomID].leaveRoom(id) === 0) {
                    delete this.games[args.roomID];
                }
            }
        })
    }
}


exports.GameServer = GameServer;