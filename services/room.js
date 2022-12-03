const cst = require('../utils/constant');
const helpers = require('../utils/helpers');
const RoomModel = require('../db/models/room');
const playerService = require('./player');
const PlayerModel = require('../db/models/player');
function updateDataBoard(data, pathIndex, players) {
    /*
        source {
            position,
            status
            index
            color
        }
        target {
            position,
            statusmainRoad
            index
            color
        }
    */
    const {
        mainRoad,
        cases,
        currentTurn,
        dice
    } = data;
    data.dice = null;
    data.cases = [];
    data.currentTurn = getNextTurn(dice, currentTurn, players);
    if (pathIndex === null) return data;
    const { source, target } = cases[pathIndex];
    //console.log('source', source);
    //console.log('target', target);
    // trường hợp xuất quân
    if (source.status === cst.STATUS_OUT && target.status === cst.STATUS_RUNNING) {
        let door = cst.RED_DOOR; // currentTurn = RED
        if (currentTurn.color === cst.BLUE) {
            door = cst.BLUE_DOOR;
        }
        else if (currentTurn.color === cst.GREEN) {
            door = cst.GREEN_DOOR;
        }
        else if (currentTurn.color === cst.YELLOW) {
            door = cst.YELLOW_DOOR;
        }
        // trường hợp xuất quân mà không có quân địch nào cản
        if (mainRoad[door] === null) {
            // thêm quân cờ vào mainRoad
            data.mainRoad[door] = {
                color: currentTurn.color,
                index: source.index,
                status: target.status,
                position: target.position,
            }
            // xóa quân cờ khỏi thảo nguyên
            data.meadow[currentTurn.color][source.index - 1] = null;
        }
        // trường hợp xuất quân mà có quân địch cản -> đá quân địch 
        else if (mainRoad[door].color !== currentTurn.color) {
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
                color: currentTurn.color,
                index: source.index,
                status: target.status,
                position: target.position,
            }
            // xóa quân cờ được xuất trân khỏi thảo nguyên
            data.meadow[currentTurn.color][source.index - 1] = null;

        }
    }
    // trường hợp di chuyển
    else if (source.status === cst.STATUS_RUNNING
        && (target.status === cst.STATUS_RUNNING || target.status === cst.STATUS_DOOR)) {
        // trường hợp di chuyển đến vị trí không có quân địch nào
        if (mainRoad[target.position] === null) {
            // chuyển vị trí của quân cờ trong mainRoad
            data.mainRoad[target.position] = {
                color: currentTurn.color,
                index: source.index,
                status: target.status,
                position: target.position,
            }
            data.mainRoad[source.position] = null;
        }
        // trường hợp di chuyển đến vị trí có quân địch cản -> đá quân địch 
        // NOTE: phần này có khi gặp lỗi, chưa tái hiện được
        else if (mainRoad[target.position].color !== currentTurn.color) {
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
                color: currentTurn.color,
                index: source.index,
                status: target.status,
                position: target.position,
            }
            data.mainRoad[source.position] = null;
        }
        // khi ngựa di chuyển đến cửa chuồng -> thêm ngựa vào vị trí 0 của chuồng
        // if (target.position === cst.STATUS_DOOR) {
        //     data.stable[currentTurn][0] = {
        //         color: currentTurn.color,
        //         index: source.index,
        //         status: target.status,
        //         position: target.position,
        //     }
        // }
    }
    // trường hợp ngựa từ cửa được lên chuồng
    else if (source.status === cst.STATUS_DOOR && target.status === cst.STATUS_INSTABLE) {
        // xóa ngựa trong mainRoad
        data.mainRoad[source.position] = null;
        // thêm ngựa vào chuồng
        data.stable[currentTurn.color][target.position] = {
            color: currentTurn.color,
            index: source.index,
            status: target.status,
            position: target.position
        }
    }
    // trường hợp ngựa chuyển vị trí trong chuồng
    else if (source.status === cst.STATUS_INSTABLE && target.status === cst.STATUS_INSTABLE) {
        // xóa vị trí ngựa ở chuồng cũ
        data.stable[currentTurn.color][source.position] = null;
        // thêm ngựa vào chuồng mới
        data.stable[currentTurn.color][target.position] = {
            color: currentTurn.color,
            index: source.index,
            status: target.status,
            position: target.position
        }
    }
    return data;
}
async function solve(socket, roomId) {
    try {
        const room = await RoomModel.findOne({ _id: roomId });
        if (room === null) return {
            message: 'failed',
            reason: 'Phòng không tồn tại'
        }
        if (socket !== null && room.dataBoard.currentTurn.socketId !== socket.id) return {
            message: 'failed',
            reason: 'Không phải lượt của bạn'
        }
        if (room.dataBoard.dice !== null) return {
            message: 'failed',
            reason: 'Không phải lượt của bạn'
        }
        let result = [];
        const dice = helpers.random(1, 6);
        let { dataBoard } = room;
        // truong hop xuat quan
        if (dice === 6) {
            result = result.concat(xulyTruongHopXuatQuan(dataBoard));
        }

        // truong hop di chuyen binh thuong
        result = result.concat(xulyTruongHopDiChuyen(dataBoard, dice));
        // truong hop len chuong
        result = result.concat(xylyTruongHopLenChuong(dataBoard, dice));

        dataBoard.dice = dice;
        dataBoard.cases = result;

        const dataUpdate = await RoomModel.findOneAndUpdate({ _id: roomId }, { dataBoard: dataBoard }, { new: true });

        return {
            message: 'success',
            room: dataUpdate
        };
    }
    catch (e) {
        throw e;
    }
}
async function selectPath(socket, roomId, pathIndex) {
    try {
        const room = await RoomModel.findOne({ _id: roomId });
        if (room === null) return {
            message: 'failed',
            reason: 'Phòng không tồn tại'
        }
        if (socket !== null && room.dataBoard.currentTurn.socketId !== socket.id) return {
            message: 'failed',
            reason: 'Không phải lượt của bạn'
        }
        let dataBoard = updateDataBoard(room.dataBoard, pathIndex, room.players);
        const dataUpdate = await RoomModel.findOneAndUpdate({ _id: roomId }, { dataBoard: dataBoard }, { new: true });
        ////console.log(dataUpdate);
        return {
            message: 'success',
            room: dataUpdate
        };
    }
    catch (e) {
        throw e;
    }
}
function getNextTurn(dice, currentTurn, players) {
    if (dice === 6) return currentTurn;
    let data = {
        color: null,
        socketId: null
    }
    if (currentTurn.color === cst.RED) {
        for (let i = 0; i < 4; i++) {
            if (players[i].color === cst.BLUE) {
                data.color = players[i].color;
                data.socketId = players[i].socketId;
                break;
            }
            else if (players[i].color === cst.GREEN) {
                data.color = players[i].color;
                data.socketId = players[i].socketId;
                break;
            }
            else if (players[i].color === cst.YELLOW) {
                data.color = players[i].color;
                data.socketId = players[i].socketId;
                break;
            }
        }
    }
    else if (currentTurn.color === cst.BLUE) {
        for (let i = 0; i < 4; i++) {
            if (players[i].color === cst.GREEN) {
                data.color = players[i].color;
                data.socketId = players[i].socketId;
                break;
            }
            else if (players[i].color === cst.YELLOW) {
                data.color = players[i].color;
                data.socketId = players[i].socketId;
                break;
            }
            else if (players[i].color === cst.RED) {
                data.color = players[i].color;
                data.socketId = players[i].socketId;
                break;
            }
        }
    }
    else if (currentTurn.color === cst.GREEN) {
        for (let i = 0; i < 4; i++) {
            if (players[i].color === cst.YELLOW) {
                data.color = players[i].color;
                data.socketId = players[i].socketId;
                break;
            }
            else if (players[i].color === cst.RED) {
                data.color = players[i].color;
                data.socketId = players[i].socketId;
                break;
            }
            else if (players[i].color === cst.BLUE) {
                data.color = players[i].color;
                data.socketId = players[i].socketId;
                break;
            }
        }
    }
    else if (currentTurn.color === cst.YELLOW) {
        for (let i = 0; i < 4; i++) {
            if (players[i].color === cst.RED) {
                data.color = players[i].color;
                data.socketId = players[i].socketId;
                break;
            }
            else if (players[i].color === cst.BLUE) {
                data.color = players[i].color;
                data.socketId = players[i].socketId;
                break;
            }
            else if (players[i].color === cst.GREEN) {
                data.color = players[i].color;
                data.socketId = players[i].socketId;
                break;
            }
        }
    }
    return data;
}
function xulyTruongHopXuatQuan(data) {
    const {
        mainRoad,
        meadow,
        currentTurn
    } = data;
    let res = [];
    for (let i = 0; i < 4; i++) {
        if (currentTurn.color === cst.RED && mainRoad[0]?.color !== cst.RED && meadow[cst.RED][i] !== null)
            res.push(
                {
                    source: meadow[cst.RED][i],
                    target: {
                        position: 0,
                        status: cst.STATUS_RUNNING,
                        index: i + 1,
                        color: currentTurn.color
                    }
                }
            );
        if (currentTurn.color === cst.BLUE && mainRoad[14]?.color !== cst.BLUE && meadow[cst.BLUE][i] !== null)
            res.push(
                {
                    source: meadow[cst.BLUE][i],
                    target: {
                        position: 14,
                        status: cst.STATUS_RUNNING,
                        index: i + 1,
                        color: currentTurn.color
                    }
                }
            );
        if (currentTurn.color === cst.GREEN && mainRoad[28]?.color !== cst.GREEN && meadow[cst.GREEN][i] !== null)
            res.push(
                {
                    source: meadow[cst.GREEN][i],
                    target: {
                        position: 28,
                        status: cst.STATUS_RUNNING,
                        index: i + 1,
                        color: currentTurn.color
                    }
                }
            );
        if (currentTurn.color === cst.YELLOW && mainRoad[42]?.color !== cst.YELLOW && meadow[cst.YELLOW][i] !== null)
            res.push(
                {
                    source: meadow[cst.YELLOW][i],
                    target: {
                        position: 42,
                        status: cst.STATUS_RUNNING,
                        index: i + 1,
                        color: currentTurn.color
                    }
                }
            );
    }
    return res;
}
function xulyTruongHopDiChuyen(data, dice) {
    const {
        mainRoad,
        currentTurn
    } = data;
    let res = [];
    if (currentTurn.color === cst.RED) {
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
            if (kt) res.push(
                {
                    source: seahorse,
                    target: {
                        position: (i + dice === 56) ? 0 : i + dice,
                        status: (i + dice === 56) ? cst.STATUS_DOOR : cst.STATUS_RUNNING,
                        index: seahorse?.index,
                        color: currentTurn.color
                    }
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
                if (kt) res.push(
                    {
                        source: seahorse,
                        target: {
                            position: 14,
                            status: cst.STATUS_RUNNING,
                            index: seahorse?.index
                        }
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
                if (kt) res.push(
                    {
                        source: seahorse,
                        target: {
                            position: 28,
                            status: cst.STATUS_RUNNING,
                            index: seahorse?.index
                        }
                    }
                );
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
                if (kt) res.push(
                    {
                        source: seahorse,
                        target: {
                            position: 42,
                            status: cst.STATUS_RUNNING,
                            index: seahorse?.index
                        }
                    }
                );
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
                if (kt) res.push(
                    {
                        source: seahorse,
                        target: {
                            position: 0,
                            status: cst.STATUS_DOOR,
                            index: seahorse?.index
                        }
                    }
                );
            }
        }
    }
    else if (currentTurn.color === cst.BLUE) {
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
                    //console.log(tmpStep, kt);
                    kt = false;
                    break;
                }
            }

            if (i < 14 && i + dice > 14) kt = false;
            let blueTarget = (i + dice >= 56) ? i + dice - 56 : i + dice;
            if (kt) res.push(
                {
                    source: seahorse,
                    target: {
                        position: blueTarget,
                        status: (blueTarget === 14) ? cst.STATUS_DOOR : cst.STATUS_RUNNING,
                        index: seahorse?.index,
                        color: currentTurn.color
                    }
                }
            );
            // di chuyen dac biet khi dice = 1
            if (dice !== 1) continue;
            if (0 <= i && i <= 12) {
                kt = true;
                for (let step = i + 1; step <= 14; step++) {
                    let seaHorseOther = mainRoad[step];
                    if (seaHorseOther === null) continue;
                    if ((step < 14)
                        || (seaHorseOther?.color === cst.BLUE && step === 14)
                    ) {
                        kt = false;
                        break;
                    }
                }
                if (kt) res.push(
                    {
                        source: seahorse,
                        target: {
                            position: 14,
                            status: cst.STATUS_DOOR,
                            index: seahorse?.index,
                            color: currentTurn.color
                        }
                    }
                );
            }
            else if (14 <= i && i <= 26) {
                kt = true;
                for (let step = i + 1; step <= 28; step++) {
                    let seaHorseOther = mainRoad[step];
                    if (seaHorseOther === null) continue;
                    if ((step < 28)
                        || (seaHorseOther?.color === cst.BLUE && step === 28)
                    ) {
                        kt = false;
                        break;
                    }
                }
                if (kt) res.push(
                    {
                        source: seahorse,
                        target: {
                            position: 28,
                            status: cst.STATUS_RUNNING,
                            index: seahorse?.index,
                            color: currentTurn.color
                        }
                    }
                );
            }
            else if (28 <= i && i <= 40) {
                kt = true;
                for (let step = i + 1; step <= 42; step++) {
                    let seaHorseOther = mainRoad[step];
                    if (seaHorseOther === null) continue;
                    if ((step < 42)
                        || (seaHorseOther?.color === cst.BLUE && step === 42)
                    ) {
                        kt = false;
                        break;
                    }
                }
                if (kt) res.push(
                    {
                        source: seahorse,
                        target: {
                            position: 42,
                            status: cst.STATUS_RUNNING,
                            index: seahorse?.index,
                            color: currentTurn.color
                        }
                    }
                );
            }
            else if (42 <= i && i <= 54) {
                kt = true;
                for (let step = i + 1; step <= 56; step++) {
                    let tmpStep = (step == 56) ? 0 : step;
                    let seaHorseOther = mainRoad[tmpStep];
                    if (seaHorseOther === null) continue;
                    if ((step < 56)
                        || (seaHorseOther?.color === cst.BLUE && step === 56)
                    ) {
                        kt = false;
                        break;
                    }
                }
                if (kt) res.push(
                    {
                        source: seahorse,
                        target: {
                            position: 0,
                            status: cst.STATUS_RUNNING,
                            index: seahorse?.index,
                            color: currentTurn.color
                        }
                    }
                );
            }
        }
    }
    else if (currentTurn.color === cst.GREEN) {
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
            let greenTarget = (i + dice >= 56) ? i + dice - 56 : i + dice;
            if (kt) res.push(
                {
                    source: seahorse,
                    target: {
                        position: greenTarget,
                        status: (greenTarget === 28) ? cst.STATUS_DOOR : cst.STATUS_RUNNING,
                        index: seahorse?.index,
                        color: currentTurn.color
                    }
                }
            );
            // di chuyen dac biet khi dice = 1
            if (dice !== 1) continue;
            if (0 <= i && i <= 12) {
                kt = true;
                for (let step = i + 1; step <= 14; step++) {
                    let seaHorseOther = mainRoad[step];
                    if (seaHorseOther === null) continue;
                    if ((step < 14)
                        || (seaHorseOther?.color === cst.GREEN && step === 14)
                    ) {
                        kt = false;
                        break;
                    }
                }
                if (kt) res.push(
                    {
                        source: seahorse,
                        target: {
                            position: 14,
                            status: cst.STATUS_RUNNING,
                            index: seahorse?.index,
                            color: currentTurn.color
                        }
                    }
                );
            }
            else if (14 <= i && i <= 26) {
                kt = true;
                for (let step = i + 1; step <= 28; step++) {
                    let seaHorseOther = mainRoad[step];
                    if (seaHorseOther === null) continue;
                    if ((step < 28)
                        || (seaHorseOther?.color === cst.GREEN && step === 28)
                    ) {
                        kt = false;
                        break;
                    }
                }
                if (kt) res.push(
                    {
                        source: seahorse,
                        target: {
                            position: 28,
                            status: cst.STATUS_DOOR,
                            index: seahorse?.index,
                            color: currentTurn.color
                        }
                    }
                );
            }
            else if (28 <= i && i <= 40) {
                kt = true;
                for (let step = i + 1; step <= 42; step++) {
                    let seaHorseOther = mainRoad[step];
                    if (seaHorseOther === null) continue;
                    if ((step < 42)
                        || (seaHorseOther?.color === cst.GREEN && step === 42)
                    ) {
                        kt = false;
                        break;
                    }
                }
                if (kt) res.push(
                    {
                        source: seahorse,
                        target: {
                            position: 42,
                            status: cst.STATUS_RUNNING,
                            index: seahorse?.index,
                            color: currentTurn.color
                        }
                    }
                );
            }
            else if (42 <= i && i <= 54) {
                kt = true;
                for (let step = i + 1; step <= 56; step++) {
                    let tmpStep = (step == 56) ? 0 : step;
                    let seaHorseOther = mainRoad[tmpStep];
                    if (seaHorseOther === null) continue;
                    if ((step < 56)
                        || (seaHorseOther?.color === cst.GREEN && step === 56)
                    ) {
                        kt = false;
                        break;
                    }
                }
                if (kt) res.push(
                    {
                        source: seahorse,
                        target: {
                            position: 0,
                            status: cst.STATUS_RUNNING,
                            index: seahorse?.index,
                            color: currentTurn.color
                        }
                    }
                );
            }
        }
    }
    else if (currentTurn.color === cst.YELLOW) {
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
            let greenTarget = (i + dice >= 56) ? i + dice - 56 : i + dice;
            if (kt) res.push(
                {
                    source: seahorse,
                    target: {
                        position: greenTarget,
                        status: (greenTarget === 42) ? cst.STATUS_DOOR : cst.STATUS_RUNNING,
                        index: seahorse?.index,
                        color: currentTurn.color
                    }
                }
            );
            // di chuyen dac biet khi dice = 1
            if (dice !== 1) continue;
            if (0 <= i && i <= 12) {
                kt = true;
                for (let step = i + 1; step <= 14; step++) {
                    let seaHorseOther = mainRoad[step];
                    if (seaHorseOther === null) continue;
                    if ((step < 14)
                        || (seaHorseOther?.color === cst.YELLOW && step === 14)
                    ) {
                        kt = false;
                        break;
                    }
                }
                if (kt) res.push(
                    {
                        source: seahorse,
                        target: {
                            position: 14,
                            status: cst.STATUS_RUNNING,
                            index: seahorse?.index,
                            color: currentTurn.color
                        }
                    }
                );
            }
            else if (14 <= i && i <= 26) {
                kt = true;
                for (let step = i + 1; step <= 28; step++) {
                    let seaHorseOther = mainRoad[step];
                    if (seaHorseOther === null) continue;
                    if ((step < 28)
                        || (seaHorseOther?.color === cst.YELLOW && step === 28)
                    ) {
                        kt = false;
                        break;
                    }
                }
                if (kt) res.push(
                    {
                        source: seahorse,
                        target: {
                            position: 28,
                            status: cst.STATUS_RUNNING,
                            index: seahorse?.index,
                            color: currentTurn.color
                        }
                    }
                );
            }
            else if (28 <= i && i <= 40) {
                kt = true;
                for (let step = i + 1; step <= 42; step++) {
                    let seaHorseOther = mainRoad[step];
                    if (seaHorseOther === null) continue;
                    if ((step < 42)
                        || (seaHorseOther?.color === cst.YELLOW && step === 42)
                    ) {
                        kt = false;
                        break;
                    }
                }
                if (kt) res.push(
                    {
                        source: seahorse,
                        target: {
                            position: 42,
                            status: cst.STATUS_DOOR,
                            index: seahorse?.index,
                            color: currentTurn.color
                        }
                    }
                );
            }
            else if (42 <= i && i <= 54) {
                kt = true;
                for (let step = i + 1; step <= 56; step++) {
                    let tmpStep = (step == 56) ? 0 : step;
                    let seaHorseOther = mainRoad[tmpStep];
                    if (seaHorseOther === null) continue;
                    if ((step < 56)
                        || (seaHorseOther?.color === cst.YELLOW && step === 56)
                    ) {
                        kt = false;
                        break;
                    }
                }
                if (kt) res.push(
                    {
                        source: seahorse,
                        target: {
                            position: 0,
                            status: cst.STATUS_RUNNING,
                            index: seahorse?.index,
                            color: currentTurn.color
                        }
                    }
                );
            }
        }
    }
    return res;
}
function xylyTruongHopLenChuong(data, dice) {
    const {
        stable,
        currentTurn,
        mainRoad
    } = data;
    let res = [];
    let oldPosition;
    if (currentTurn.color == cst.RED) oldPosition = cst.RED_DOOR;
    else if (currentTurn.color == cst.BLUE) oldPosition = cst.BLUE_DOOR;
    else if (currentTurn.color == cst.GREEN) oldPosition = cst.GREEN_DOOR;
    else if (currentTurn.color == cst.YELLOW) oldPosition = cst.YELLOW_DOOR;
    if (mainRoad[oldPosition] !== null && mainRoad[oldPosition].status === cst.STATUS_DOOR) {
        const seahorse = mainRoad[oldPosition];
        let kt = true;
        for (let i = 1; i <= dice; i++) {
            let seaHorseOther = stable[currentTurn.color][i];
            if (seaHorseOther !== null) {
                kt = false;
                break;
            }
        }

        if (kt) res.push(
            {
                source: {
                    position: oldPosition,
                    status: cst.STATUS_DOOR,
                    index: seahorse?.index,
                    color: currentTurn.color
                },
                target:
                {
                    position: dice,
                    status: cst.STATUS_INSTABLE,
                    index: seahorse?.index,
                    color: currentTurn.color
                }
            }
        )
    }
    if (dice > 1 && stable[currentTurn.color][dice - 1] !== null && stable[currentTurn.color][dice] === null) {
        let seahorse = stable[currentTurn.color][dice - 1];
        res.push(
            {
                source: seahorse,
                target: {
                    position: dice,
                    status: cst.STATUS_INSTABLE,
                    index: seahorse?.index,
                    color: currentTurn.color
                }
            }
        )
    }
    return res;
}
//solve(utils.getDefaultBoard());
async function createRoom(owner) {
    try {
        if (owner.socketId !== null && owner.username !== null) {
            let room = await RoomModel.create({
                owner: {
                    username: owner.username,
                    socketId: owner.socketId
                }
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
async function blockPlayer(socket, roomId, playerIndex) {
    try {
        let room = await RoomModel.findOne({ _id: roomId });
        if (room !== null) {
            if (socket.id !== room.owner.socketId) {
                return {
                    message: 'failed',
                    reason: 'Bạn không phải là chủ room'
                }
            }
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
            const dataUpdate = await RoomModel.findOneAndUpdate({ _id: roomId }, { players: players }, { new: true });
            ////console.log('room', dataUpdate);
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
async function unlockPlayer(socket, roomId, playerIndex) {
    try {
        let room = await RoomModel.findOne({ _id: roomId });
        if (room !== null) {
            if (socket.id !== room.owner.socketId) {
                return {
                    message: 'failed',
                    reason: 'Bạn không phải là chủ room'
                }
            }
            let players = room.players;
            players[playerIndex].username = null;
            players[playerIndex].socketId = null;
            players[playerIndex].isBlocked = false;
            let dataUpdate = await RoomModel.findOneAndUpdate({ _id: roomId }, { players: players }, { new: true });
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
async function changeTypePlayer(socket, roomId, playerIndex, type) {
    try {
        let room = await RoomModel.findOne({ _id: roomId });
        if (room !== null) {
            if (socket.id !== room.owner.socketId) {
                return {
                    message: 'failed',
                    reason: 'Bạn không phải là chủ room'
                }
            }
            let players = room.players;
            players[playerIndex].type = type;
            let dataUpdate = await RoomModel.findOneAndUpdate({ _id: roomId }, { players: players }, { new: true });
            return {
                message: 'success',
                room: dataUpdate
            }
        }
        return {
            message: 'failed',
            reason: 'Phòng không tồn tại'
        }
    }
    catch (e) {
        throw e;
    }
}
async function kickPlayer(socket, roomId, playerIndex) {
    try {
        let room = await RoomModel.findOne({ _id: roomId });
        if (room !== null) {
            if (socket.id !== room.owner.socketId) {
                return {
                    message: 'failed',
                    reason: 'Bạn không phải là chủ room'
                }
            }
            let players = room.players;
            let kickSocketId = players[playerIndex].socketId;
            players[playerIndex].username = null;
            players[playerIndex].socketId = null;
            let res = await playerService.leaveRoom(kickSocketId);
            if (res.message === 'success') {
                room.players = players;
                const dataUpdate = await RoomModel.findOneAndUpdate({ _id: roomId }, { players: players }, { new: true });
                return {
                    message: 'success',
                    room: dataUpdate,
                    kickSocketId: kickSocketId
                }
            }
            else return {
                message: 'failed',
                reason: 'Rời phòng không thành công'
            }

        }
        return {
            message: 'failed',
            reason: 'Phòng không tồn tại'
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
        if (room === null) return {
            message: 'failed',
            reason: 'Phòng không tồn tại'
        }
        if (room.play) {
            return {
                message: 'failed',
                reason: 'Phòng đang chơi'
            }
        }
        let players = room.players;
        for (let i = 0; i < 4; i++) {
            let player = players[i];
            if (player.type == 'person' && player.username == null && !player.isBlocked) {
                players[i].username = username;
                players[i].socketId = socketId;
                // room.players = players;
                let playerJoinRoom = await playerService.joinRoom(socketId, roomId);
                if (playerJoinRoom.message === 'success') {
                    let dataUpdate = await RoomModel.findOneAndUpdate({ _id: roomId }, { players: players }, { new: true });
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
        let players = room.players;
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
                    let newOwner;
                    for (let j = 0; j < 4; j++) {
                        let nextOwner = players[j];
                        if (nextOwner.type === 'person'
                            && nextOwner.username !== null && nextOwner.socketId !== null && !nextOwner.isBlocked) {
                            kt = true;
                            newOwner = {
                                username: nextOwner.username,
                                socketId: nextOwner.socketId
                            }
                            //room.owner = nextOwner.username;
                            break;
                        }
                    }
                    if (kt) {
                        const updateData = await RoomModel.findOneAndUpdate({ _id: roomId }, { players: players, owner: newOwner }, { new: true });
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
async function startGame(socket, roomId) {
    try {
        const room = await RoomModel.findOne({ _id: roomId });
        if (room == null) return {
            message: 'failed',
            reason: 'Phòng không tồn tại'
        }
        if (room.play) {
            return {
                message: 'failed',
                reason: 'Phòng đang chơi'
            }
        }
        if (socket.id !== room.owner.socketId) {
            return {
                message: 'failed',
                reason: 'Bạn không phải là chủ room'
            }
        }
        let count = 0;
        for (let i = 0; i < 4; i++) {
            const player = room.players[i];
            if (player.isBlocked) continue;
            if ((player.username === null || player.socketId === null) && player.type === 'person') {
                count++;
            }
        }
        if (count > 0) return {
            message: 'failed',
            reason: `Còn ${count} vị trí còn trống`
        }
        // random màu cho mỗi người
        let players = randomColor(room.players);
        // khởi tạo dataBoard
        let dataBoard = initDataBoard(room.dataBoard, players);


        let updateData = await RoomModel.findOneAndUpdate({ _id: roomId }, {
            players: players,
            dataBoard: dataBoard,
            play: true
        }, { new: true });
        return {
            message: 'success',
            room: updateData
        }
    }
    catch (e) {
        throw e;
    }
}
function initDataBoard(dataBoard, players) {
    let currentTurn = randomFirstTurn(players);
    let meadow = {}, stable = {};
    for (let i = 0; i < 4; i++) {
        const color = players[i].color;
        if (color !== null) {
            ;
            meadow[color] = helpers.getDefaultMeadow(color);
            stable[color] = helpers.getDefaultStable();
        }
    }
    dataBoard.dice = null;
    dataBoard.currentTurn = currentTurn;
    dataBoard.cases = [];
    dataBoard.mainRoad = helpers.getDefaultMainRoad();
    dataBoard.meadow = meadow;
    dataBoard.stable = stable;
    return dataBoard;
}
function randomFirstTurn(players) {
    let colors = [];
    for (let i = 0; i < 4; i++) {
        if (players[i].color !== null) colors.push({
            color: players[i].color,
            socketId: players[i].socketId
        });
    }
    let index = helpers.random(0, colors.length - 1);
    return colors[index];
}
function randomColor(players) {
    let colors = [cst.RED, cst.BLUE, cst.YELLOW, cst.GREEN];
    for (let i = 0; i < players.length; i++) {
        if (!players[i].isBlocked) {
            let index = helpers.random(0, colors.length - 1);
            //console.log(index);
            players[i].color = colors[index];
            colors.splice(index, 1);
        }
    }
    return players;
}
module.exports = {
    solve,
    selectPath,
    createRoom,
    getWaitRoom,
    joinWaitRoom,
    leaveWaitRoom,
    getListRoom,
    blockPlayer,
    unlockPlayer,
    kickPlayer,
    changeTypePlayer,
    startGame
}