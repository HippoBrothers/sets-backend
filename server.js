require('dotenv-flow').config()
const express = require('express');

const app = express();

const http = require('http').createServer(app);

const io = require('socket.io')(http, {
    cors: {
        origin: process.env.FRONT_ADDR,
        methods: ["GET", "POST"]
    }
});

const path = require('path');
const {GameServer} = require("./src/GameServer");

const PORT = process.env.PORT || 4000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname + '/public/index.html'));
});


const classic = require('./src/games/set_classic');
console.log(classic)
new GameServer(io, {
    classic
});

http.listen(PORT, function () {
    console.log('listening on *:', PORT);
});