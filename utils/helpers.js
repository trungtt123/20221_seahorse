const cst = require('./constant');
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
function getDefaultMeadow(color){
    let data = [];
    for (let i = 0; i < 4; i++) {
        data.push(new SeaHorse(color, i + 1));
    }
    return data;
}
function getDefaultStable(){
    let data = [];
    for (let i = 0; i <= 6; i++) {
        data.push(null);
    }
    return data;
}
function getDefaultMainRoad(){
    let data = [];
    for (let i = 0; i <= 55; i++) {
        data.push(null);
    }
    return data;
}
function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function delay(delayInms) {
    return new Promise(resolve => setTimeout(resolve, delayInms));
  }
module.exports = {
    random,
    getDefaultMainRoad,
    getDefaultMeadow,
    getDefaultStable,
    delay
}