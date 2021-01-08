const {Card} = require("./Card");

class Deck {
    constructor() {

        this.cards = [];
        for (let i = 1; i < 4; i++) {
            for (let j = 1; j < 4; j++) {
                for (let k = 1; k < 4; k++) {
                    for (let l = 1; l < 4; l++) {
                        this.cards.push(new Card(i, j, k, l));
                    }
                }
            }
        }

        this.shuffle();

    }

    isEmpty() {
        return (this.cards.length === 0)
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            let x = this.cards[i];
            this.cards[i] = this.cards[j];
            this.cards[j] = x;
        }
    }

    draw(number) {
        const returnedCards = [];

        for (let i = 0; i < number; i++) {
            returnedCards.push(this.cards.pop());
        }

        return returnedCards;
    }
}

exports.Deck = Deck;