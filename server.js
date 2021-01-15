require('dotenv-flow').config()
const express = require('express');

const app = express();

const http = require('http').createServer(app);

console.log(process.env.FRONT_ADDR)
const io = require('socket.io')(http, {
    cors: {
        origin: process.env.FRONT_ADDR,
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
            game.state.selectedCards = [];
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

        const onBuzzEnd = () => {
            socket.removeAllListeners("validation");
            socket.removeAllListeners("select");
            game.state.selectedCards = [];
        };

        const tm = setTimeout(() => {
            onBuzzEnd();
            clearInterval(interval);
            onBadSet(game, player);
        }, CHOICETIME - 50);

        const validate = () => {
            const cards = game.state.selectedCards;
            console.log("Validation, cards:", cards)
            onBuzzEnd();
            clearInterval(interval);
            clearTimeout(tm);
            if (cards.length !== 3) {
                onBadSet(game, player);
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
                console.log("c", cards)
                onBadSet(game, player);
                return;
            }

            for (let item of res) {
                if (item !== 0) {
                    // Not a set
                    onBadSet(game, player);
                    return;
                }
            }
            // Is a set
            onGoodSet(game, player, cards);
        }
        socket.addListener('select', (card) => {
            const index = game.state.selectedCards.indexOf(card);
            if (index === -1) {
                game.state.selectedCards.push(card);
            } else {
                game.state.selectedCards.splice(index, 1);
            }

            if (game.state.selectedCards.length === 3) {
                clearTimeout(tm);
                socket.removeAllListeners("validation");
                socket.removeAllListeners("select");
                game.refresh();
                setTimeout(validate, 1000)
            } else {
                game.refresh();
            }
        })
        socket.addListener("validation", validate);


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

function onBadSet(game, player) {
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


new GameServer(io, {events});

http.listen(PORT, function () {
    console.log('listening on *:', PORT);
});