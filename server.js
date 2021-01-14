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

const PORT = process.env.PORT || 4000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname + '/public/index.html'));
});

const CHOICETIME = 6000;
const INTTIME = 1000;


const events = {
    "voteStart": (game, socket, player, args) => {

        if (game.state.type !== "waiting" && game.state.type !== "end") {
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
            socket.removeAllListeners("validation");
            clearInterval(interval);
            onBadSet(game, player,0);
        }, CHOICETIME - 50);

        socket.addListener("validation", (cards) => {
            console.log("Validation, cards:",cards)
            socket.removeAllListeners("validation");
            clearInterval(interval);
            clearTimeout(tm);
            if (cards.length !== 3) {
                onBadSet(game, player,1);
                return;
            }
            let errorFlag = false;

            // Check if picked cards form a set
            const reducer = (acc, cur) => {
                const card = game.state.board[cur];
                if (!card) {
                    errorFlag = true;
                    return acc;
                }
                acc[0] = (acc[0] + card.shape) % 3;
                acc[1] = (acc[1] + card.number) % 3;
                acc[2] = (acc[2] + card.color) % 3;
                acc[3] = (acc[3] + card.fill) % 3;
                return acc;
            };

            const res = cards.reduce(reducer, [0, 0, 0, 0]);

            if (errorFlag) {
                console.log("c",cards)
                onBadSet(game, player,2);
                return;
            }

            for (let item of res) {
                if (item !== 0) {
                    // Not a set
                    onBadSet(game, player,3);
                    return;
                }
            }
            // Is a set
            onGoodSet(game, player, cards);
        })


    },
    "voteAddCards": (game, socket, player, args) => {
        if (game.state.type !== "playing") {
            return;
        }

        if (vote(game, player)) {
            cleanVote(game);
            if (game.deck.isEmpty()) {
                // End the game
                endGame(game);
            } else {
                // Add 3 more cards to game board
                game.state.board = game.state.board.concat(game.deck.draw(3));
                game.state.cardsLeft = game.deck.cards.length;

            }
        }
        game.refresh();
        console.log(game.state.players)


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
    console.log("goodset")
    cleanVote(game);
    player.score++;
    game.state.type = "playing";
    game.state.payload = {};


    if (game.state.board.length === 0) {
        endGame(game);
        return;
    }

    // Replace set cards if less then 12 on board
    if (game.state.board.length <= 12 && game.state.cardsLeft > 0) {
        const newCards = game.deck.draw(3);
        game.state.cardsLeft = game.deck.cards.length;
        cards.forEach((card, index) => {
            game.state.board[card] = newCards[index];
        })
    } else {
        game.state.board = game.state.board.filter((_, index) => {
            return !cards.includes(index)
        })
    }

    game.refresh();
}

function onBadSet(game, player,nb) {
    console.log("badset",nb)
    if (player.score > 0) {
        player.score--;
    }
    game.state.type = "playing";
    game.state.payload = {};
    game.refresh();

}

function cleanVote(game) {
    Object.values(game.players).forEach((it) => it.meta.vote = false);
}


new GameServer(io, events);

http.listen(PORT, function () {
    console.log('listening on *:', PORT);
});