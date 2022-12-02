const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require("body-parser");
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = require('socket.io')(server, { cors: { origin: '*' } });
require('./db/connection');
global._io = io;
const constant = require('./utils/constant');



app.use(express.json());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors());


app.post('/', async (req, res) => {
	return res.send("server game");
})

_io.on('connection', async (socket) => {
	console.log('Có người chơi kết nối: ' + socket.id);
	const sockets = await _io.fetchSockets()
	socket.emit(constant.SERVER_SEND_NUMBER_OF_PLAYERS, sockets.length);
	require('./socket/waitRoom')(socket);

	socket.on('disconnect', async () => {
		console.log('disconnect', socket.id);
	})
	
});


server.listen(8080, () => {
	console.log('listening on *:8080');
});