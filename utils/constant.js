const RED = 'red';
const BLUE = 'blue';
const GREEN = 'green';
const YELLOW = 'yellow';
const STATUS_OUT = 'out';
const STATUS_RUNNING = 'running';
const STATUS_DOOR = 'door';
const STATUS_INSTABLE = 'instable';
const RED_START = 1;
const BLUE_START = 15;
const GREEN_START = 29;
const YELLOW_START = 43;

const RED_DOOR = 0;
const BLUE_DOOR = 14;
const GREEN_DOOR = 28;
const YELLOW_DOOR = 42;

//all
//client
const CLIENT_GET_INFO = 'client get info';
//server
const SERVER_SEND_CLIENT_INFO = 'server send client info';
const SERVER_SEND_STATUS = 'server send status';
const SERVER_SEND_NUMBER_OF_PLAYERS = 'server send number of players';
/* socket in home */
//client
const CLIENT_REGISTER = 'client register';
const CLIENT_REMOVE = 'client remove';
const CLIENT_GET_LIST_WAIT_ROOM= 'client get list wait room';
const CLIENT_CREATE_ROOM = 'client create room';
const CLIENT_JOIN_WAIT_ROOM = 'client join wait room';
//server
const SERVER_CREATE_USER = 'server create user';
const SERVER_REMOVE_USER = 'server remove user';
const SERVER_SEND_LIST_WAIT_ROOM = 'server send list wait room';
const SERVER_CREATE_ROOM = 'server create room';
const SERVER_TO_CLIENT_JOINED_WAIT_ROOM = 'server to client joined wait room'
/* --- */

/*socket in wait room*/
//client
const CLIENT_GET_WAIT_ROOM = 'client get wait room';
const CLIENT_LEAVE_WAIT_ROOM = 'client leave wait room';
const CLIENT_LEAVE_WAIT_ROOM_AFTER_KICKED = 'client leave wait room after kicked';
const ROOM_OWNER_BLOCK_PLAYER = 'room owner block player';
const ROOM_OWNER_UNLOCK_PLAYER = 'room owner unlock player';
const ROOM_OWNER_KICK_PLAYER = 'room owner kick player';
const ROOM_OWNER_CHANGE_TYPE_PLAYER = 'room owner change type player';
const CLIENT_START_GAME = 'client start game';
//room
const WAIT_ROOM_SEND_DATA = 'wait room send data';
const WAIT_ROOM_SEND_PLAYER_KICK = 'wait room send player kick';
const SERVER_TO_CLIENT_LEAVE_WAIT_ROOM = 'server to client leave wait room';
const SERVER_START_GAME = 'server start game';
const CLIENT_JOIN_PLAY_ROOM = 'client join play room';
/*socket in play room*/
//client
const CLIENT_SPIN = 'client spin';
const CLIENT_SELECT_PATH = 'client select path';
//server
const PLAY_ROOM_SEND_DATA = 'play room send data';

module.exports = {
    RED,
    BLUE,
    GREEN,
    YELLOW,
    STATUS_OUT,
    STATUS_RUNNING,
    STATUS_DOOR,
    STATUS_INSTABLE,
    RED_START,
    BLUE_START,
    GREEN_START,
    YELLOW_START,
    RED_DOOR,
    BLUE_DOOR,
    GREEN_DOOR,
    YELLOW_DOOR,
    SERVER_SEND_STATUS,
    CLIENT_REGISTER,
    CLIENT_CREATE_ROOM,
    CLIENT_GET_WAIT_ROOM,
    WAIT_ROOM_SEND_DATA,
    SERVER_CREATE_ROOM,
    SERVER_SEND_LIST_WAIT_ROOM,
    CLIENT_GET_LIST_WAIT_ROOM,
    CLIENT_JOIN_WAIT_ROOM,
    SERVER_TO_CLIENT_JOINED_WAIT_ROOM,
    CLIENT_JOIN_PLAY_ROOM,
    SERVER_CREATE_USER,
    CLIENT_REMOVE,
    SERVER_REMOVE_USER,
    CLIENT_GET_INFO,
    SERVER_SEND_CLIENT_INFO,
    CLIENT_LEAVE_WAIT_ROOM,
    SERVER_TO_CLIENT_LEAVE_WAIT_ROOM,
    ROOM_OWNER_BLOCK_PLAYER,
    ROOM_OWNER_UNLOCK_PLAYER,
    ROOM_OWNER_KICK_PLAYER,
    WAIT_ROOM_SEND_PLAYER_KICK,
    ROOM_OWNER_CHANGE_TYPE_PLAYER,
    CLIENT_LEAVE_WAIT_ROOM_AFTER_KICKED,
    SERVER_SEND_NUMBER_OF_PLAYERS,
    CLIENT_START_GAME,
    SERVER_START_GAME,
    CLIENT_SPIN,
    PLAY_ROOM_SEND_DATA,
    CLIENT_SELECT_PATH
}