const shortid = require('shortid');


class Game {

    constructor(io, events) {

        this.roomID = shortid.generate();
        this.players = {};
        this.disconnectedPlayers = {};
        this.state = {type: 'waiting', payload: {roomID: this.roomID}};
        this.io = io;
        this.customEvents = events;

    };

    destroyPlayer(socket) {
        Object.entries(this.customEvents).forEach(([event, action]) => {
            socket.removeAllListeners(event);
        })
    }

    joinRoom(args, socket) {


        let player;

        // Check player secret
        if (args.secret && this.disconnectedPlayers[args.secret]) {

            player = this.disconnectedPlayers[args.secret];
            player.destroy = ()=> (this.destroyPlayer(socket));
            delete this.disconnectedPlayers[args.secret];
        } else {
            const playerID = shortid.generate();
            let nom = (!args.name || args.name === "") ? ('Anonyme_' + playerID) : args.name;

            player = {id: playerID, name: nom, score: 0, secret: shortid.generate(), meta: {},destroy: ()=> (this.destroyPlayer(socket))};
        }

        this.players[player.id] = player;
        socket.join(this.roomID);


        // Bind custom Events to new socket
        Object.entries(this.customEvents).forEach(([event, action]) => {
            socket.on(event, (args) => {action(this, socket, player, args)});
        })

        // Refresh scoreboard
        this.refresh();

        // Emit Welcome message to new player
        socket.emit('welcome', {roomID: this.roomID, playerID: player.id, name: player.name, secret: player.secret});

        return player.id;
    }

    refresh() {
        const baseMsg = Object.assign({}, this.state);
        baseMsg.scoreboard = this.getScoreboard();

        this.io.to(this.roomID).emit('stateChanged', baseMsg);
    }

    leaveRoom(id, force) {
        const player = this.players[id];
        if (player) {

            player.meta = {};
            if (!force) {
                this.disconnectedPlayers[player.secret] = player;
                player.destroy();
            }
            delete this.players[id];
            this.refresh();
        }
        return Object.keys(this.players).length;
    }

    getScoreboard() {
        return Object.entries(this.players).map(([key, value]) => {
            return {key, name: value.name, score: value.score, meta: value.meta}
        })
    }

    resetScoreBoard() {
        Object.values(this.players).forEach(it => {
            it.score = 0;
        })
    }


}

exports.Game = Game;