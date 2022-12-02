const cst = require('../utils/constant');
const utils = require('./utils');
const RoomModel = require('../db/models/room');
const playerService = require('./player');
const PlayerModel = require('../db/models/player');
function updateData(data, dataTurn) {
    /*
        dataTurn = {
            currentTurn,
            nextTurn
            source {
                position,
                status
                index
                color
            }
            target {
                position,
                status
                index
                color
            }
        }
    */
    const {
        mainRoad,
    } = data;
    const {
        currentTurn,
        nextTurn,
        source,
        target
    } = dataTurn;
    // thay đổi turn hiện tại, dữ liệu trong csdl là dữ liệu khi đã thực hiện xong currentTurn
    data.currentTurn = currentTurn;
    // thay đổi turn tiếp theo
    data.nextTurn = nextTurn;
    // trường hợp xuất quân
    if (source.position === cst.STATUS_OUT && target.position === cst.STATUS_RUNNING) {
        let door = cst.RED_DOOR; // currentTurn = RED
        if (currentTurn === cst.BLUE) {
            door = cst.BLUE_DOOR;
        }
        else if (currentTurn === cst.GREEN) {
            door = cst.GREEN_DOOR;
        }
        else if (currentTurn === cst.YELLOW) {
            door = cst.YELLOW_DOOR;
        }
        // trường hợp xuất quân mà không có quân địch nào cản
        if (mainRoad[door] === null) {
            // thêm quân cờ vào mainRoad
            data.mainRoad[door] = {
                color: currentTurn,
                index: source.index,
                status: target.status,
                position: target.position,
            }
            // xóa quân cờ khỏi thảo nguyên
            data.meadow[cst.RED][source.index - 1] = null;
        }
        // trường hợp xuất quân mà có quân địch cản -> đá quân địch 
        else if (mainRoad[door].color !== currentTurn) {
            // xóa quân cờ của đối thủ khỏi bàn cờ -> thêm nó lại vào thảo nguyên
            let seaHorseOther = mainRoad[door];
            data.meadow[seaHorseOther.color][seaHorseOther.index - 1] = {
                color: seaHorseOther.color,
                index: seaHorseOther.index,
                status: cst.STATUS_OUT,
                position: -1,
            };
            // thêm quân cờ vào mainRoad
            data.mainRoad[door] = {
                color: currentTurn,
                index: source.index,
                status: target.status,
                position: target.position,
            }
            // xóa quân cờ được xuất trân khỏi thảo nguyên
            data.meadow[currentTurn][source.index - 1] = null;

        }
    }
    // trường hợp di chuyển
    else if (source.position === cst.STATUS_RUNNING
        && (target.position === cst.STATUS_RUNNING || target.position === cst.STATUS_DOOR)) {
        // trường hợp di chuyển đến vị trí không có quân địch nào
        if (mainRoad[target.position] === null) {
            // chuyển vị trí của quân cờ trong mainRoad
            data.mainRoad[target.position] = {
                color: currentTurn,
                index: source.index,
                status: target.status,
                position: target.position,
            }
            data.mainRoad[source.position] = null;
        }
        // trường hợp di chuyển đến vị trí có quân địch cản -> đá quân địch 
        else if (mainRoad[target.position].color !== currentTurn) {
            // xóa quân cờ của đối thủ khỏi bàn cờ -> thêm nó lại vào thảo nguyên
            let seaHorseOther = mainRoad[target.position];
            data.meadow[seaHorseOther.color][seaHorseOther.index - 1] = {
                color: seaHorseOther.color,
                index: seaHorseOther.index,
                status: cst.STATUS_OUT,
                position: -1,
            };
            // chuyển vị trí của quân cờ trong mainRoad
            data.mainRoad[target.position] = {
                color: currentTurn,
                index: source.index,
                status: target.status,
                position: target.position,
            }
            data.mainRoad[source.position] = null;
        }
        // khi ngựa di chuyển đến cửa chuồng -> thêm ngựa vào vị trí 0 của chuồng
        if (target.position === cst.STATUS_DOOR) {
            data.stable[currentTurn][0] = {
                color: currentTurn,
                index: source.index,
                status: target.status,
                position: target.position,
            }
        }
    }
    // trường hợp ngựa từ cửa được lên chuồng
    else if (source.position === cst.STATUS_DOOR && target.position === cst.STATUS_INSTABLE) {
        // xóa ngựa trong mainRoad
        data.mainRoad[source.position] = null;
        // thêm ngựa vào chuồng
        data.stable[currentTurn][source.position] = null;
        data.stable[currentTurn][target.position] = {
            color: currentTurn,
            index: source.index,
            status: target.status,
            position: target.position
        }
    }
    // trường hợp ngựa chuyển vị trí trong chuồng
    else if (source.position === cst.STATUS_INSTABLE && target.position === cst.STATUS_INSTABLE) {
        // xóa ngựa ở chuồng cữ
        data.stable[currentTurn][source.position] = null;
        // thêm ngựa vào chuồng mới
        data.stable[currentTurn][target.position] = {
            color: currentTurn,
            index: source.index,
            status: target.status,
            position: target.position
        }
    }
    return data;
}
function solve(data) {
    const { currentTurn } = data;
    let result = [];
    const dice = utils.random(1, 6);
    // truong hop xuat quan
    if (dice === 6) {
        result = result.concat(xulyTruongHopXuatQuan(data));
    }
    // truong hop di chuyen binh thuong
    result = result.concat(xulyTruongHopDiChuyen(data, dice));
    // truong hop len chuong
    result = result.concat(xylyTruongHopLenChuong(data, dice));
    let dataExpect = {
        dice: dice,
        currentTurn: currentTurn,
        nextTurn: getNextTurn(dice, currentTurn),
        cases: result
    }
    return dataExpect;
}

function getNextTurn(dice, currentTurn) {
    if (dice === 6) return currentTurn;
    if (currentTurn === cst.RED) return cst.BLUE;
    if (currentTurn === cst.BLUE) return cst.GREEN;
    if (currentTurn === cst.GREEN) return cst.YELLOW;
    if (currentTurn === cst.YELLOW) return cst.RED;
}
function xulyTruongHopXuatQuan(data) {
    const {
        mainRoad,
        meadow,
        currentTurn
    } = data;
    let res = [];
    for (let i = 0; i < 4; i++) {
        if (currentTurn === cst.RED && mainRoad[0]?.color !== cst.RED && meadow[cst.RED][i] !== null)
            res.push({
                position: 0,
                status: cst.STATUS_RUNNING,
                index: i + 1
            });
        if (currentTurn === cst.BLUE && mainRoad[14]?.color !== cst.BLUE && meadow[cst.BLUE][i] !== null)
            res.push({
                position: 14,
                status: cst.STATUS_RUNNING,
                index: i + 1
            });
        if (currentTurn === cst.GREEN && mainRoad[28]?.color !== cst.GREEN && meadow[cst.GREEN][i] !== null)
            res.push({
                position: 28,
                status: cst.STATUS_RUNNING,
                index: i + 1
            });
        if (currentTurn === cst.YELLOW && mainRoad[42]?.color !== cst.YELLOW && meadow[cst.YELLOW][i] !== null)
            res.push({
                position: 42,
                status: cst.STATUS_RUNNING,
                index: i + 1
            });
    }
    return res;
}
function xulyTruongHopDiChuyen(data, dice) {
    const {
        mainRoad,
        currentTurn
    } = data;
    let res = [];
    if (currentTurn === cst.RED) {
        for (let i = 0; i <= 55; i++) { // có thể tối ưu = cách dùng mảng lưu 
            const seahorse = mainRoad[i];
            if (seahorse === null) continue;
            if (seahorse?.status !== cst.STATUS_RUNNING) continue;
            if (seahorse?.color !== cst.RED) continue;

            let kt = true;
            // di chuyen binh thuong
            for (let step = i + 1; step <= Math.min(56, i + dice); step++) {
                let seaHorseOther = mainRoad[step];
                if (seaHorseOther === null) continue;
                if ((step < Math.min(56, i + dice))
                    || (seaHorseOther?.color === cst.RED && step === Math.min(56, i + dice))
                ) {
                    kt = false;
                    break;
                }
            }
            if (i + dice > 56) kt = false;
            if (kt) res.push({
                position: (i + dice === 56) ? 0 : i + dice,
                status: (i + dice === 56) ? cst.STATUS_DOOR : cst.STATUS_RUNNING,
                index: seahorse?.index
            });
            // di chuyen dac biet khi dice = 1
            if (dice !== 1) continue;
            if (0 <= i && i <= 12) {
                kt = true;
                for (let step = i + 1; step <= 14; step++) {
                    let seaHorseOther = mainRoad[step];
                    if (seaHorseOther === null) continue;
                    if ((step < 14)
                        || (seaHorseOther?.color === cst.RED && step === 14)
                    ) {
                        kt = false;
                        break;
                    }
                }
                if (kt) res.push({
                    position: 14,
                    status: cst.STATUS_RUNNING,
                    index: seahorse?.index
                });
            }
            else if (14 <= i && i <= 26) {
                kt = true;
                for (let step = i + 1; step <= 28; step++) {
                    let seaHorseOther = mainRoad[step];
                    if (seaHorseOther === null) continue;
                    if ((step < 28)
                        || (seaHorseOther?.color === cst.RED && step === 28)
                    ) {
                        kt = false;
                        break;
                    }
                }
                if (kt) res.push({
                    position: 28,
                    status: cst.STATUS_RUNNING,
                    index: seahorse?.index
                });
            }
            else if (28 <= i && i <= 40) {
                kt = true;
                for (let step = i + 1; step <= 42; step++) {
                    let seaHorseOther = mainRoad[step];
                    if (seaHorseOther === null) continue;
                    if ((step < 42)
                        || (seaHorseOther?.color === cst.RED && step === 42)
                    ) {
                        kt = false;
                        break;
                    }
                }
                if (kt) res.push({
                    position: 42,
                    status: cst.STATUS_RUNNING,
                    index: seahorse?.index
                });
            }
            else if (42 <= i && i <= 54) {
                kt = true;
                for (let step = i + 1; step <= 56; step++) {
                    let tmpStep = (step == 56) ? 0 : step;
                    let seaHorseOther = mainRoad[tmpStep];
                    if (seaHorseOther === null) continue;
                    if ((step < 56)
                        || (seaHorseOther?.color === cst.RED && step === 56)
                    ) {
                        kt = false;
                        break;
                    }
                }
                if (kt) res.push({
                    position: 0,
                    status: cst.STATUS_DOOR,
                    index: seahorse?.index
                });
            }
        }
    }
    else if (currentTurn === cst.BLUE) {
        for (let i = 0; i <= 55; i++) {
            const seahorse = mainRoad[i];
            if (seahorse === null) continue;
            if (seahorse?.status !== cst.STATUS_RUNNING) continue;
            if (seahorse?.color !== cst.BLUE) continue;
            let kt = true;
            // di chuyen binh thuong
            for (let step = i + 1; step <= i + dice; step++) {
                let tmpStep = step;
                if (step >= 56) tmpStep = step - 56;
                let seaHorseOther = mainRoad[tmpStep];
                if (seaHorseOther === null) continue;
                if ((step < i + dice)
                    || (seaHorseOther?.color === cst.BLUE && step === i + dice)
                ) {
                    console.log(tmpStep, kt);
                    kt = false;
                    break;
                }
            }

            if (i < 14 && i + dice > 14) kt = false;
            let greenTarget = (i + dice > 56) ? i + dice - 56 : i + dice;
            if (kt) res.push({
                position: greenTarget,
                status: (greenTarget === 14) ? cst.STATUS_DOOR : cst.STATUS_RUNNING,
                index: seahorse?.index
            });
            // di chuyen dac biet khi dice = 1
            if (dice !== 1) continue;
            if (0 <= i && i <= 12) {
                kt = true;
                for (let step = i + 1; step <= 14; step++) {
                    let seaHorseOther = mainRoad[step];
                    if (seaHorseOther === null) continue;
                    if ((step < 14)
                        || (seaHorseOther?.color === cst.RED && step === 14)
                    ) {
                        kt = false;
                        break;
                    }
                }
                if (kt) res.push({
                    position: 14,
                    status: cst.STATUS_DOOR,
                    index: seahorse?.index
                });
            }
            else if (14 <= i && i <= 26) {
                kt = true;
                for (let step = i + 1; step <= 28; step++) {
                    let seaHorseOther = mainRoad[step];
                    if (seaHorseOther === null) continue;
                    if ((step < 28)
                        || (seaHorseOther?.color === cst.RED && step === 28)
                    ) {
                        kt = false;
                        break;
                    }
                }
                if (kt) res.push({
                    position: 28,
                    status: cst.STATUS_RUNNING,
                    index: seahorse?.index
                });
            }
            else if (28 <= i && i <= 40) {
                kt = true;
                for (let step = i + 1; step <= 42; step++) {
                    let seaHorseOther = mainRoad[step];
                    if (seaHorseOther === null) continue;
                    if ((step < 42)
                        || (seaHorseOther?.color === cst.RED && step === 42)
                    ) {
                        kt = false;
                        break;
                    }
                }
                if (kt) res.push({
                    position: 42,
                    status: cst.STATUS_RUNNING,
                    index: seahorse?.index
                });
            }
            else if (42 <= i && i <= 54) {
                kt = true;
                for (let step = i + 1; step <= 56; step++) {
                    let tmpStep = (step == 56) ? 0 : step;
                    let seaHorseOther = mainRoad[tmpStep];
                    if (seaHorseOther === null) continue;
                    if ((step < 56)
                        || (seaHorseOther?.color === cst.RED && step === 56)
                    ) {
                        kt = false;
                        break;
                    }
                }
                if (kt) res.push({
                    position: 0,
                    status: cst.STATUS_RUNNING,
                    index: seahorse?.index
                });
            }
        }
    }
    else if (currentTurn === cst.GREEN) {
        for (let i = 0; i <= 55; i++) {
            const seahorse = mainRoad[i];
            if (seahorse === null) continue;
            if (seahorse?.status !== cst.STATUS_RUNNING) continue;
            if (seahorse?.color !== cst.GREEN) continue;
            let kt = true;
            // di chuyen binh thuong
            for (let step = i + 1; step <= i + dice; step++) {
                let tmpStep = step;
                if (step >= 56) tmpStep = step - 56;
                let seaHorseOther = mainRoad[tmpStep];
                if (seaHorseOther === null) continue;
                if ((step < i + dice)
                    || (seaHorseOther?.color === cst.GREEN && step === i + dice)
                ) {
                    kt = false;
                    break;
                }
            }
            if (i < 28 && i + dice > 28) kt = false;
            let greenTarget = (i + dice > 56) ? i + dice - 56 : i + dice;
            if (kt) res.push({
                position: greenTarget,
                status: (greenTarget === 28) ? cst.STATUS_DOOR : cst.STATUS_RUNNING,
                index: seahorse?.index
            });
            // di chuyen dac biet khi dice = 1
            if (dice !== 1) continue;
            if (0 <= i && i <= 12) {
                kt = true;
                for (let step = i + 1; step <= 14; step++) {
                    let seaHorseOther = mainRoad[step];
                    if (seaHorseOther === null) continue;
                    if ((step < 14)
                        || (seaHorseOther?.color === cst.RED && step === 14)
                    ) {
                        kt = false;
                        break;
                    }
                }
                if (kt) res.push({
                    position: 14,
                    status: cst.STATUS_RUNNING,
                    index: seahorse?.index
                });
            }
            else if (14 <= i && i <= 26) {
                kt = true;
                for (let step = i + 1; step <= 28; step++) {
                    let seaHorseOther = mainRoad[step];
                    if (seaHorseOther === null) continue;
                    if ((step < 28)
                        || (seaHorseOther?.color === cst.RED && step === 28)
                    ) {
                        kt = false;
                        break;
                    }
                }
                if (kt) res.push({
                    position: 28,
                    status: cst.STATUS_DOOR,
                    index: seahorse?.index
                });
            }
            else if (28 <= i && i <= 40) {
                kt = true;
                for (let step = i + 1; step <= 42; step++) {
                    let seaHorseOther = mainRoad[step];
                    if (seaHorseOther === null) continue;
                    if ((step < 42)
                        || (seaHorseOther?.color === cst.RED && step === 42)
                    ) {
                        kt = false;
                        break;
                    }
                }
                if (kt) res.push({
                    position: 42,
                    status: cst.STATUS_RUNNING,
                    index: seahorse?.index
                });
            }
            else if (42 <= i && i <= 54) {
                kt = true;
                for (let step = i + 1; step <= 56; step++) {
                    let tmpStep = (step == 56) ? 0 : step;
                    let seaHorseOther = mainRoad[tmpStep];
                    if (seaHorseOther === null) continue;
                    if ((step < 56)
                        || (seaHorseOther?.color === cst.RED && step === 56)
                    ) {
                        kt = false;
                        break;
                    }
                }
                if (kt) res.push({
                    position: 0,
                    status: cst.STATUS_RUNNING,
                    index: seahorse?.index
                });
            }
        }
    }
    else if (currentTurn === cst.YELLOW) {
        for (let i = 0; i <= 55; i++) {
            const seahorse = mainRoad[i];
            if (seahorse === null) continue;
            if (seahorse?.status !== cst.STATUS_RUNNING) continue;
            if (seahorse?.color !== cst.YELLOW) continue;
            let kt = true;
            // di chuyen binh thuong
            for (let step = i + 1; step <= i + dice; step++) {
                let tmpStep = step;
                if (step >= 56) tmpStep = step - 56;
                let seaHorseOther = mainRoad[tmpStep];
                if (seaHorseOther === null) continue;
                if ((step < i + dice)
                    || (seaHorseOther?.color === cst.YELLOW && step === i + dice)
                ) {
                    kt = false;
                    break;
                }
            }
            if (i < 42 && i + dice > 42) kt = false;
            let greenTarget = (i + dice > 56) ? i + dice - 56 : i + dice;
            if (kt) res.push({
                position: greenTarget,
                status: (greenTarget === 42) ? cst.STATUS_DOOR : cst.STATUS_RUNNING,
                index: seahorse?.index
            });
            // di chuyen dac biet khi dice = 1
            if (dice !== 1) continue;
            if (0 <= i && i <= 12) {
                kt = true;
                for (let step = i + 1; step <= 14; step++) {
                    let seaHorseOther = mainRoad[step];
                    if (seaHorseOther === null) continue;
                    if ((step < 14)
                        || (seaHorseOther?.color === cst.RED && step === 14)
                    ) {
                        kt = false;
                        break;
                    }
                }
                if (kt) res.push({
                    position: 14,
                    status: cst.STATUS_RUNNING,
                    index: seahorse?.index
                });
            }
            else if (14 <= i && i <= 26) {
                kt = true;
                for (let step = i + 1; step <= 28; step++) {
                    let seaHorseOther = mainRoad[step];
                    if (seaHorseOther === null) continue;
                    if ((step < 28)
                        || (seaHorseOther?.color === cst.RED && step === 28)
                    ) {
                        kt = false;
                        break;
                    }
                }
                if (kt) res.push({
                    position: 28,
                    status: cst.STATUS_RUNNING,
                    index: seahorse?.index
                });
            }
            else if (28 <= i && i <= 40) {
                kt = true;
                for (let step = i + 1; step <= 42; step++) {
                    let seaHorseOther = mainRoad[step];
                    if (seaHorseOther === null) continue;
                    if ((step < 42)
                        || (seaHorseOther?.color === cst.RED && step === 42)
                    ) {
                        kt = false;
                        break;
                    }
                }
                if (kt) res.push({
                    position: 42,
                    status: cst.STATUS_DOOR,
                    index: seahorse?.index
                });
            }
            else if (42 <= i && i <= 54) {
                kt = true;
                for (let step = i + 1; step <= 56; step++) {
                    let tmpStep = (step == 56) ? 0 : step;
                    let seaHorseOther = mainRoad[tmpStep];
                    if (seaHorseOther === null) continue;
                    if ((step < 56)
                        || (seaHorseOther?.color === cst.RED && step === 56)
                    ) {
                        kt = false;
                        break;
                    }
                }
                if (kt) res.push({
                    position: 0,
                    status: cst.STATUS_RUNNING,
                    index: seahorse?.index
                });
            }
        }
    }
    return res;
}
function xylyTruongHopLenChuong(data, dice) {
    const {
        stable,
        currentTurn
    } = data;
    let res = [];
    if (stable[currentTurn][0] !== null) {
        let kt = true;
        for (let i = 1; i <= dice; i++) {
            let seaHorseOther = stable[currentTurn][i];
            if (seaHorseOther !== null) {
                kt = false;
                break;
            }
        }
        let seahorse = stable[currentTurn][0];
        if (kt) res.push({
            position: dice,
            status: cst.STATUS_INSTABLE,
            index: seahorse?.index
        })
    }
    if (dice > 1 && stable[currentTurn][dice - 1] !== null && stable[currentTurn][dice] === null) {
        let seahorse = stable[currentTurn][dice - 1];
        res.push({
            position: dice,
            status: cst.STATUS_INSTABLE,
            index: seahorse?.index
        })
    }
    return res;
}
//solve(utils.getDefaultBoard());
async function createRoom(owner) {
    try {
        if (owner !== null) {
            let room = await RoomModel.create({
                owner: owner.username
            });
            return {
                message: 'success',
                room: room
            }
        }
        else {
            return {
                message: 'failed',
                reason: `Username không tồn tại`
            }
        }
    }
    catch (e) {
        throw e;
    }
}
async function getWaitRoom(roomId) {
    try {
        let room = await RoomModel.findOne({ _id: roomId });
        if (room !== null) return {
            message: 'success',
            room: room
        }
        return {
            message: 'failed',
            reason: 'Room không tồn tại'
        }
    }
    catch (e) {
        throw e;
    }
}
async function blockPlayer(roomId, playerIndex) {
    try {
        let room = await RoomModel.findOne({ _id: roomId });
        if (room !== null) {
            let players = room.players;
            players[playerIndex].username = null;
            players[playerIndex].socketId = null;
            players[playerIndex].isBlocked = true;
            let count = 0;
            for (let i = 0; i < 4; i++) {
                if (!players[i].isBlocked) count++;
            }
            if (count <= 1) {
                return {
                    message: 'failed',
                    reason: 'Phòng cần ít nhất 2 slots'
                }
            }
            //room.players = players;
            const dataUpdate = await RoomModel.findOneAndUpdate({ _id: roomId }, {players: players}, {new: true});
            //console.log('room', dataUpdate);
            return {
                message: 'success',
                room: dataUpdate
            }
        }
        return {
            message: 'failed',
            reason: 'Room không tồn tại'
        }
    }
    catch (e) {
        throw e;
    }
}
async function unlockPlayer(roomId, playerIndex) {
    try {
        let room = await RoomModel.findOne({ _id: roomId });
        if (room !== null) {
            let players = JSON.parse(JSON.stringify(room.players));
            players[playerIndex].username = null;
            players[playerIndex].socketId = null;
            players[playerIndex].isBlocked = false;
            let dataUpdate = await  RoomModel.findOneAndUpdate({ _id: roomId }, {players: players}, {new: true});
            return {
                message: 'success',
                room: dataUpdate
            }
        }
        return {
            message: 'failed',
            reason: 'Room không tồn tại'
        }
    }
    catch (e) {
        throw e;
    }
}
async function changeTypePlayer(roomId, playerIndex, type) {
    try {
        let room = await RoomModel.findOne({ _id: roomId });
        if (room !== null) {
            let players = JSON.parse(JSON.stringify(room.players));
            players[playerIndex].type = type;
            let dataUpdate = await RoomModel.findOneAndUpdate({ _id: roomId }, {players: players}, {new: true});
            return {
                message: 'success',
                room: dataUpdate
            }
        }
        return {
            message: 'failed',
            reason: 'Room không tồn tại'
        }
    }
    catch (e) {
        throw e;
    }
}
async function kickPlayer(roomId, playerIndex) {
    try {
        let room = await RoomModel.findOne({ _id: roomId });
        if (room !== null) {
            let players = JSON.parse(JSON.stringify(room.players));
            let kickSocketId = players[playerIndex].socketId;
            players[playerIndex].username = null;
            players[playerIndex].socketId = null;
            let res = await playerService.leaveRoom(kickSocketId);
            if (res.message === 'success') {
                room.players = players;
                const dataUpdate = await RoomModel.findOneAndUpdate({ _id: roomId }, {players: players}, {new: true});
                return {
                    message: 'success',
                    room: dataUpdate,
                    kickSocketId: kickSocketId
                }
            }
            else return {
                message: 'failed',
                reason: 'Rời room không thành công'
            }

        }
        return {
            message: 'failed',
            reason: 'Room không tồn tại'
        }
    }
    catch (e) {
        throw e;
    }
}
async function joinWaitRoom(roomId, player) {
    try {
        const { socketId, username } = player;
        let room = await RoomModel.findOne({ _id: roomId });
        if (room.play) {
            return {
                message: 'failed',
                reason: 'Phòng đang chơi'
            }
        }
        let players = JSON.parse(JSON.stringify(room.players));
        for (let i = 0; i < 4; i++) {
            let player = players[i];
            if (player.type == 'person' && player.username == null && !player.isBlocked) {
                players[i].username = username;
                players[i].socketId = socketId;
                // room.players = players;
                let playerJoinRoom = await playerService.joinRoom(socketId, roomId);
                if (playerJoinRoom.message === 'success') {
                    let dataUpdate = await RoomModel.findOneAndUpdate({ _id: roomId }, {players: players}, {new: true});
                    console.log('data update', dataUpdate);
                    return {
                        message: 'success',
                        room: dataUpdate
                    }
                }
            }
        }
        return {
            message: 'failed',
            reason: 'Phòng đã đầy'
        }
    }
    catch (e) {
        throw e;
    }

}
async function leaveWaitRoom(player) {
    try {
        const { socketId, username, roomId } = player;
        let room = await RoomModel.findOne({ _id: roomId });
        if (room === null) {
            return {
                message: 'failed',
                reason: 'Phòng không tồn tại'
            }
        }
        if (room.play) {
            return {
                message: 'failed',
                reason: 'Phòng đang chơi'
            }
        }
        let players = JSON.parse(JSON.stringify(room.players));
        // xoa nguoi choi trong room
        for (let i = 0; i < 4; i++) {
            let player = players[i];
            if (player.username == username && player.socketId == socketId) {
                players[i].username = null;
                players[i].socketId = null;
                //room.players = players;

                let playerLeaveRoom = await playerService.leaveRoom(socketId);
                // nguoi choi roi room thanh cong
                if (playerLeaveRoom.message === 'success') {
                    //chuyển chủ room thành người kế tiếp hoặc xóa room khi hết người chơi trong phòng
                    let kt = false;
                    let usernameNewOwner;
                    for (let j = 0; j < 4; j++) {
                        let nextOwner = players[j];
                        if (nextOwner.type === 'person'
                            && nextOwner.username !== null && nextOwner.socketId !== null && !nextOwner.isBlocked) {
                            kt = true;
                            usernameNewOwner = nextOwner.username;
                           //room.owner = nextOwner.username;
                            break;
                        }
                    }
                    if (kt) {
                        const updateData = await RoomModel.findOneAndUpdate({_id: roomId}, {players: players, owner: usernameNewOwner}, {new: true});
                        return {
                            message: 'success',
                            room: updateData
                        }
                    }
                    else {
                        await RoomModel.findByIdAndRemove(roomId);
                        return {
                            message: 'success',
                            room: null
                        }
                    }
                }
            }
        }
        return {
            message: 'failed',
            reason: 'Rời phòng thất bại'
        }
    }
    catch (e) {
        throw e;
    }

}
async function getListRoom() {
    try {
        let rooms = await RoomModel.find({});
        return {
            message: 'success',
            rooms: rooms
        }
    }
    catch (e) {
        throw e;
    }
}

module.exports = {
    solve,
    updateData,
    createRoom,
    getWaitRoom,
    joinWaitRoom,
    leaveWaitRoom,
    getListRoom,
    blockPlayer,
    unlockPlayer,
    kickPlayer,
    changeTypePlayer
}