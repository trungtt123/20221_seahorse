const cst = require('../utils/constant');
class SeaHorse {
    color;
    status;
    /*
    'out': ngoài bàn cờ, 
    'running': đang trên bàn cờ/đang di chuyển, 
    'door': đã hoàn thành 1 vòng di chuyển, đang ở trước cửa chuồng,
    'inStable': lên chuồng
    */
    position;
    index;
    constructor(color, index) {
        this.color = color;
        this.index = index;
        this.status = cst.STATUS_OUT;
        this.position = -1;
    }
}
function getDefaultBoard() {
    let mockData = {
        mainRoad: [],
        meadow: {
            red: [],
            blue: [],
            green: [],
            yellow: []
        },
        stable: {
            red: [],
            blue: [],
            green: [],
            yellow: []
        },
        currentTurn: null,
        nextTurn: null
    }

    for (let i = 0; i <= 55; i++) {
        mockData.mainRoad.push(null);
    }
    for (let i = 0; i < 4; i++) {
        mockData.meadow['red'].push(new SeaHorse(cst.RED, i + 1));
        mockData.meadow['blue'].push(new SeaHorse(cst.BLUE, i + 1));
        mockData.meadow['green'].push(new SeaHorse(cst.GREEN, i + 1));
        mockData.meadow['yellow'].push(new SeaHorse(cst.YELLOW, i + 1));
    }
    for (let i = 0; i < 6; i++) {
        mockData.stable['red'].push(null);
        mockData.stable['blue'].push(null);
        mockData.stable['green'].push(null);
        mockData.stable['yellow'].push(null);
    }
    let randomFirstTurn = random(1, 4);
    mockData.currentTurn = randomFirstTurn === 1 ? cst.RED 
    : randomFirstTurn === 2 ? cst.BLUE : randomFirstTurn === 3 ? cst.GREEN : cst.YELLOW;
    return mockData;
}
function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
module.exports = {
    random,
    getDefaultBoard
}