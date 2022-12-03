const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const helpers = require('../../utils/helpers');

const RoomSchema = new Schema({
    players: {
        type: Array,
        required: true,
        default: [
            {
                type: 'person',
                color: null,
                username: null,
                socketId: null,
                isBlocked: false
            },
            {
                type: 'person',
                color: null,
                username: null,
                socketId: null,
                isBlocked: false
            },
            {
                type: 'person',
                color: null,
                username: null,
                socketId: null,
                isBlocked: false
            },
            {
                type: 'person',
                color: null,
                username: null,
                socketId: null,
                isBlocked: false
            }
        ]
    },
    owner: {
        type: Object,
        required: true,
        default: {
            username: null,
            socketId: null
        }
    },
    play: {
        type: Boolean,
        require: true,
        default: false
    },
    dataBoard: {
        type: Object,
        require: true,
        default: {}
    },
}, { timestamps: true }, { collection: 'room' }
);

const RoomModel = mongoose.model('room', RoomSchema);

module.exports = RoomModel;