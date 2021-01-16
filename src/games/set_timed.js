const {Deck} = require("../Deck");
const utils = require('./utils');

const GAME_BASE_TIME = 30;


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
            game.state.timeLeft = GAME_BASE_TIME;
            cleanVote(game);

            //Start timer
            game.timerInt = setInterval(() => {
                game.state.timeLeft--;
                game.refresh();
                checkGameOver(game);

            }, 1000);

        }
        // Send new state
        game.refresh();
    },
    "select": (game, socket, player, card) => {
        const index = game.state.selectedCards.indexOf(card);
        if (index === -1) {
            game.state.selectedCards.push(card);
        } else {
            game.state.selectedCards.splice(index, 1);
        }

        if (game.state.selectedCards.length === 3) {
            // Validation du set
            const cards = game.state.selectedCards;
            if (utils.checkSet(cards, game.state.board)) {
                onGoodSet(game, player, cards);
            } else {
                onBadSet(game, player);
            }
        }
        game.refresh();
    },
    "voteAddCards": (game, socket, player, args) => {
        if (game.state.type !== "playing") {
            return;
        }

        if (vote(game, player)) {
            cleanVote(game);
            if (utils.howManySetsLeft(game.board > 0)) {
                onBadSet(game);
                return ;
            }
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

    }
}

function endGame(game) {
    game.state.type = "end";
    game.refresh();
}

function checkGameOver(game) {
    if (game.state.timeLeft <= 0) {
        endGame(game);
    }
}

function vote(game, player) {

    player.meta.vote = true;

    return (Object.values(game.players).filter(it => it.meta.vote).length === Object.values(game.players).length);
}

function onGoodSet(game, cards) {
    console.log("goodset")
    cleanVote(game);

    if (game.state.board.length === 3) {
        endGame(game);
        return;
    }

    utils.changeCards(game, cards);

    if (utils.howManySetsLeft(game.state.board) === 0 && game.state.cardsLeft === 0) {
        endGame(game);
        return;
    }
    game.state.timeLeft += 5;

    game.refresh();
}

function onBadSet(game) {

    game.state.timeLeft -= 2;
    checkGameOver(game);
    game.refresh();

}

function cleanVote(game) {
    Object.values(game.players).forEach((it) => it.meta.vote = false);
}

exports.events = events;