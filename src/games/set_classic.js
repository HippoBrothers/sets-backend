const {Deck} = require("../Deck");
const utils = require('./utils');

const CHOICETIME = 6000;
const INTTIME = 1000;


const events = {
    "voteStart": (game, socket, player, args) => {

        console.log("votestart received")
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
            game.state.lastSet = [];
            game.state.winner = undefined;

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

            if (utils.checkSet(cards, game.state.board)) {
                onGoodSet(game, player, cards);
            } else {
                onBadSet(game, player);
            }
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
    const sorted = game.getScoreboard().sort((a, b) => {
        return b.score-a.score;
    })
    game.state.winner = sorted[0];
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


    if (game.state.board.length === 3) {
        endGame(game);
        return;
    }
    game.state.lastSet = cards.map(it => {
        return game.state.board[it];
    })
    utils.changeCards(game, cards);

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

exports.events = events;