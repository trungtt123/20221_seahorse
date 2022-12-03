const roomService = require('../services/room');
const playerService = require('../services/player');
const constant = require('../utils/constant');
const helpers = require('../utils/helpers');
module.exports = function (socket) {
    setInterval(async () => {
        let res = await roomService.getListRoom();
        socket.emit(constant.SERVER_SEND_LIST_WAIT_ROOM, res);
    }, 1000);
    socket.on('disconnect', async () => {
        const playerInfo = (await playerService.getInfo(socket.id));
        if (playerInfo.message === 'success' && playerInfo.roomId !== null) {
            // xoa player trong phong choi, phong cho
            const { player } = playerInfo;
            let res = await roomService.leaveWaitRoom(player);
            if (res.message === 'success') {
                socket.leave(player.roomId);
            }
            // thông báo cho cả phòng khi người dùng disconnect rời phòng
            _io.in(player.roomId).emit(constant.WAIT_ROOM_SEND_DATA, res);
        }
        // xóa người dùng
        await playerService.remove(socket.id);
    });
    socket.on(constant.CLIENT_REGISTER, async (data) => {
        const d = {
            username: data.username,
            socketId: socket.id
        }
        let res = await playerService.register(d);
        socket.emit(constant.SERVER_CREATE_USER, res);
    });

    socket.on(constant.CLIENT_CREATE_ROOM, async () => {
        let data = await playerService.getInfo(socket.id);
        if (data.message === 'success') {
            let res = await roomService.createRoom(data.player);
            socket.emit(constant.SERVER_CREATE_ROOM, res);
        }
    });

    socket.on(constant.CLIENT_GET_INFO, async () => {
        let res = await playerService.getInfo(socket.id);
        socket.emit(constant.SERVER_SEND_CLIENT_INFO, res);
    });

    socket.on(constant.CLIENT_JOIN_WAIT_ROOM, async (data) => {
        const dataPlayer = await playerService.getInfo(socket.id);
        const { room } = data;
        if (dataPlayer.message === 'success') {
            let res = await roomService.joinWaitRoom(room._id, dataPlayer.player);
            if (res.message === 'success') {
                //console.log('join room', room._id);
                socket.join(room._id);
                // thông báo cho cả phòng khi người chơi vào đc phòng
                _io.in(room._id).emit(constant.WAIT_ROOM_SEND_DATA, res);
            }
            // thông báo cho người chơi đã yêu cầu vào phòng
            socket.emit(constant.SERVER_TO_CLIENT_JOINED_WAIT_ROOM, res);
        }
    });
    socket.on(constant.CLIENT_GET_LIST_WAIT_ROOM, async () => {
        let res = await roomService.getListRoom();
        socket.emit(constant.SERVER_SEND_LIST_WAIT_ROOM, res);
    });
    /* socket in wait room */
    /* trungtt123 */
    socket.on(constant.CLIENT_LEAVE_WAIT_ROOM, async () => {
        const dataPlayer = await playerService.getInfo(socket.id);
        if (dataPlayer.message === 'success') {
            const { player } = dataPlayer
            let res = await roomService.leaveWaitRoom(player);
            //console.log('player leave room', player);
            if (res.message === 'success') {
                socket.leave(player.roomId);
                // thông báo cho cả phòng khi người dùng rời phòng thành công
                _io.in(player.roomId).emit(constant.WAIT_ROOM_SEND_DATA, res);
            }
            // thông báo cho người dùng yêu cầu rời phòng
            socket.emit(constant.SERVER_TO_CLIENT_LEAVE_WAIT_ROOM, res);
        }
    });
    socket.on(constant.CLIENT_LEAVE_WAIT_ROOM_AFTER_KICKED, async (data) => {
        socket.leave(data.roomId);
    });
    socket.on(constant.CLIENT_GET_WAIT_ROOM, async (data) => {
        const { roomId } = data;
        let res = await roomService.getWaitRoom(roomId);
        _io.in(roomId).emit(constant.WAIT_ROOM_SEND_DATA, res);
    });
    socket.on(constant.ROOM_OWNER_BLOCK_PLAYER, async (data) => {
        const { roomId, playerIndex } = data;
        // NOTE: check socket là chủ room
        let res = await roomService.blockPlayer(socket, roomId, playerIndex);
        if (res.message === 'success') {
            //console.log('block room', res.room);
            _io.in(roomId).emit(constant.WAIT_ROOM_SEND_DATA, res);
        }
        else socket.emit(constant.WAIT_ROOM_SEND_DATA, res);
    });
    socket.on(constant.ROOM_OWNER_UNLOCK_PLAYER, async (data) => {
        const { roomId, playerIndex } = data;
        // NOTE: check socket là chủ room
        let res = await roomService.unlockPlayer(socket, roomId, playerIndex);
        if (res.message === 'success') {
            _io.in(roomId).emit(constant.WAIT_ROOM_SEND_DATA, res);
        }
        else socket.emit(constant.WAIT_ROOM_SEND_DATA, res);
    });
    socket.on(constant.ROOM_OWNER_CHANGE_TYPE_PLAYER, async (data) => {
        const { roomId, playerIndex, type } = data;
        // NOTE: check socket là chủ room
        let res = await roomService.changeTypePlayer(socket, roomId, playerIndex, type);
        if (res.message === 'success') {
            _io.in(roomId).emit(constant.WAIT_ROOM_SEND_DATA, res);
        }
        else socket.emit(constant.WAIT_ROOM_SEND_DATA, res);
    });
    socket.on(constant.ROOM_OWNER_KICK_PLAYER, async (data) => {
        const { roomId, playerIndex } = data;
        let res = await roomService.kickPlayer(socket, roomId, playerIndex);
        const kickSocketId = res?.kickSocketId;
        if (res.message === 'success' && kickSocketId !== undefined) {
            _io.to(kickSocketId).emit(constant.WAIT_ROOM_SEND_PLAYER_KICK, res);
            _io.in(roomId).emit(constant.WAIT_ROOM_SEND_DATA, res);
            // _io.to(kickSocketId).leave(roomId);
        }
        else socket.emit(constant.WAIT_ROOM_SEND_DATA, res);
    });
    socket.on(constant.CLIENT_START_GAME, async () => {
        const data = await playerService.getInfo(socket.id);
        if (data.message === 'success') {
            const { player } = data;
            let res = await roomService.startGame(socket, player.roomId);
            //console.log(res);
            if (res.message === 'success') {
                _io.to(player.roomId).emit(constant.SERVER_START_GAME, res);


                await helpers.delay(3000);

                // xử lý trường hợp máy quay đầu tiên
                const { currentTurn, dice } = res.room.dataBoard;
                if (currentTurn.socketId === null && dice === null) {
                    // xử lý trường hợp máy quay ra 6
                    while (1) {
                        let machineRes = await roomService.solve(null, player.roomId);

                        _io.to(player.roomId).emit(constant.PLAY_ROOM_SEND_DATA, machineRes);
                        // máy random nước đi
                        if (machineRes.message === 'success') {
                            await helpers.delay(3000);
                            const { cases, dice } = machineRes.room.dataBoard;
                            if (cases.length === 0) {
                                let newRes = await roomService.selectPath(null, player.roomId, null);
                                _io.to(player.roomId).emit(constant.PLAY_ROOM_SEND_DATA, newRes);
                            }
                            else {
                                let r = helpers.random(0, cases.length - 1);
                                let newRes = await roomService.selectPath(null, player.roomId, r);
                                _io.to(player.roomId).emit(constant.PLAY_ROOM_SEND_DATA, newRes);
                            }
                            if (dice !== 6) break;
                        }
                        else {
                            // player là máy bị đơ
                            throw e;
                        }
                    }
                }
            }
            else socket.emit(constant.SERVER_START_GAME, res);
        }

    });
}