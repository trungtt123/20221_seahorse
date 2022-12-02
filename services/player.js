const PlayerModel = require('../db/models/player');
async function getInfo(socketId){
    try {
        let player = await PlayerModel.findOne({ socketId: socketId });
        if (player !== null) {
            return {
                message: 'success',
                player: player
            };
        }
        else {
            return {
                message: 'failed',
                reason: 'Người chơi không tồn tại'
            }
        }
    }
    catch (e) {
        throw e;
    }
}
async function register(data) {
    try {
        const { username } = data;

        let usernameOther = await PlayerModel.findOne({ username: username });
        if (usernameOther === null) {
            
            let player = await PlayerModel.create(data);
            return {
                message: 'success',
                player: player
            };
        }
        else {
            return {
                message: 'failed',
                reason: 'username đã tồn tại'
            }
        }
    }
    catch (e) {
        throw e;
    }
}
async function remove(socketId) {
    try {
        let player = await PlayerModel.findOne({ socketId: socketId });
        if (player !== null) {
            
            await PlayerModel.deleteOne(player);
            return {
                message: 'success'
            };
        }
        else {
            return {
                message: 'failed',
                reason: 'Người chơi không tồn tại'
            }
        }
    }
    catch (e) {
        throw e;
    }
}
async function joinRoom(socketId, roomId) {
    try {
        let player = await PlayerModel.findOne({ socketId: socketId });
        if (player !== null) {
            //player.roomId = roomId;
            const updateData = await PlayerModel.findOneAndUpdate({ socketId: socketId }, {roomId: roomId}, {new: true});
            return {
                message: 'success',
                player: updateData
            }
        }
        else {
            return {
                message: 'failed',
                reason: 'Người chơi không tồn tại'
            }
        }
    }
    catch (e) {
        throw e;
    }
}
async function leaveRoom(socketId) {
    try {
        let player = await PlayerModel.findOne({ socketId: socketId });
        if (player !== null) {
            //player.roomId = null;
            let updateData = await PlayerModel.findOneAndUpdate({ socketId: socketId }, {roomId: null}, {new: true});
            return {
                message: 'success',
                player: updateData
            }
        }
        else {
            return {
                message: 'failed',
                reason: 'Người chơi không tồn tại'
            }
        }
    }
    catch (e) {
        throw e;
    }
}
module.exports = {
    register,
    remove,
    getInfo,
    joinRoom,
    leaveRoom
}