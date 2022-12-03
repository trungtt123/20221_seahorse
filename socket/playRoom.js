const roomService = require('../services/room');
const playerService = require('../services/player');
const constant = require('../utils/constant');
const helpers = require('../utils/helpers');
module.exports = function (socket) {
    socket.on(constant.CLIENT_SPIN, async () => {
        const data = await playerService.getInfo(socket.id);
        if (data.message === 'success') {
            const { player } = data;
            let res = await roomService.solve(socket, player.roomId);
            if (res.message === 'success') {
                _io.to(player.roomId).emit(constant.PLAY_ROOM_SEND_DATA, res);
                // xử lý trường hợp quay xong không có lượt đi
                await helpers.delay(3000);
                if (res.room.dataBoard.cases.length === 0) {
                    let resNoPath = await roomService.selectPath(socket, player.roomId, null);
                    console.log('resNoPath', resNoPath.room.dataBoard.currentTurn);
                    _io.to(player.roomId).emit(constant.PLAY_ROOM_SEND_DATA, resNoPath);
                    // xử lý trường hợp turn tiếp theo là máy
                    const { currentTurn, dice } = resNoPath.room.dataBoard;
                    console.log(currentTurn, dice);
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
            }
            else socket.emit(constant.PLAY_ROOM_SEND_DATA, res);
        }
    });
    socket.on(constant.CLIENT_SELECT_PATH, async (dataIndexPath) => {
        const data = await playerService.getInfo(socket.id);
        const { pathIndex } = dataIndexPath;
        console.log(data.message);
        if (data.message === 'success') {
            const { player } = data;
            let res = await roomService.selectPath(socket, player.roomId, pathIndex);
            _io.to(player.roomId).emit(constant.PLAY_ROOM_SEND_DATA, res);
            // xử lý trường hợp turn tiếp theo là máy
            const { currentTurn, dice } = res.room.dataBoard;
            //console.log(currentTurn, dice);
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
        else socket.emit(constant.PLAY_ROOM_SEND_DATA, res);
    });
}