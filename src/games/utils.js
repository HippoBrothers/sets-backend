function checkSet(cards, board) {
    if (cards.length !== 3) {
        return false;
    }

    let errorFlag = false;

    // Check if picked cards form a set
    const reducer = (acc, cur) => {
        const card = board[cur];
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
        return false;
    }

    for (let item of res) {
        if (item !== 0) {
            // Not a set
            return false;
        }
    }
    // Is a set
    return true;
}

function changeCards(game, cards) {
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
}

function howManySetsLeft(board) {
    const combs = findAllCombinations(board);
    let cpt = 0;
    combs.forEach((it) => {
            if (checkSet(it, board)) {
                cpt++;
            }
        }
    )
    return cpt;
}

function findAllCombinations(board) {
    const comb = [];
    for (let i = 0; i < board.length; i++) {
        for (let j = i + 1; j < board.length; j++) {
            for (let k = j + 1; k < board.length; k++) {
                comb.push([i, j, k]);
            }
        }
    }
    return comb;
}


exports.checkSet = checkSet;
exports.changeCards = changeCards;
exports.howManySetsLeft = howManySetsLeft;