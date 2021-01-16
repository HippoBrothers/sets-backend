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


exports.checkSet = checkSet;