const express = require('express');

const app = express();

const http = require('http').createServer(app);

const io = require('socket.io')(http, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

const path = require('path');
const {Deck} = require("./src/Deck");
const {GameServer} = require("./src/GameServer");

//app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname + '/public/index.html'));
});

const CHOICETIME = 6000;
const INTTIME = 1000;


const events = {
    "voteStart": (game, socket, player, args) => {

        if (game.state.type !== "waiting") {
            return;
        }

        // If everybody voted start game
        if (vote(game, player)) {


            // Start the game
            game.deck = new Deck();

            // Draw 12 cards
            game.state.board = game.deck.draw(12);
            game.state.cardsLeft = game.deck.cards.length;
            game.state.type = "playing";
            game.resetScoreBoard();
            cleanVote(game);

        }
        // Send new state
        game.refresh();
    },
    "buzz": (game, socket, player, args) => {

        // Check if no one buzz before
        if (game.state.type === "buzzed") {
            return;
        }

        // Someone buzz, stop the game and trigger countdown
        game.state.type = "buzzed";
        game.state.payload = {playerID: player.id, time: CHOICETIME};
        // send new state
        game.refresh();
        let time = CHOICETIME
        const interval = setInterval(() => {
            time -= INTTIME;
            game.state.payload = {playerID: player.id, time};
            game.refresh();
        }, INTTIME)
        const tm = setTimeout(() => {
            clearInterval(interval);
            onBadSet(game, player);
        }, CHOICETIME+50);

        socket.addListener("validation", (cards) => {
            socket.removeAllListeners("validation");
            clearInterval(interval);
            clearTimeout(tm);

            // Check if picked cards form a set
            const reducer = (acc, cur) => {
                const card = game.state.board[cur];
                acc[0] = (acc[0] + card.shape) % 3;
                acc[1] = (acc[1] + card.number) % 3;
                acc[2] = (acc[2] + card.color) % 3;
                acc[3] = (acc[3] + card.fill) % 3;
                return acc;
            }

            const res = cards.reduce(reducer, [0, 0, 0, 0])

            for (let item of res) {
                if (item !== 0) {
                    // Not a set
                    onBadSet(game, player);
                    return;
                }
            }
            // Is a set
            onGoodSet(game, player, cards);
        })


    },
    "voteAddCards": (game, socket, player, args) => {
        if (game.state.type !== "playing" && game.state.type !== "end") {
            return;
        }

        if (vote(game, player)) {
            if (game.deck.isEmpty()) {
                // End the game
                endGame(game);
            } else {
                // Add 3 more cards to game board
                game.state.board = game.state.board.concat(game.deck.draw(3));
                game.state.cardsLeft = game.deck.cards.length;

            }
            game.refresh();
        }


    }
}

function endGame(game) {
    game.state.type = "end";
    game.refresh();

}

function vote(game, player) {

    player.meta.vote = true;

    return (Object.values(game.players).filter(it => it.meta.vote).length === Object.values(game.players).length);
}

function onGoodSet(game, player, cards) {
    cleanVote(game);
    player.score++;
    game.state.type = "playing";
    game.state.payload={};


    if (game.state.board.length === 0) {
        endGame(game);
        return;
    }

    // Replace set cards if less then 12 on board
    if (game.state.board.length < 12 && game.state.cardsLeft > 0) {
        const newCards = game.deck.draw(3);
        game.state.cardsLeft = game.deck.cards.length;
        cards.forEach((card, index) => {
            game.state.board[card] = newCards[index];
        })
    }

    game.refresh();
}

function onBadSet(game, player) {

    if (player.score > 0) {
        player.score--;
    }
    game.state.type = "playing";
    game.state.payload={};
    game.refresh();

}

function cleanVote(game) {
    Object.values(game.players).forEach((it) => it.meta.vote = false);
}


new GameServer(io, events);

http.listen(4000, function () {
    console.log('listening on *:4000');
});