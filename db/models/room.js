const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const utils = require('../../services/utils');

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
        type: String,
        required: true,
        trim: true
    },
    play: {
        type: Boolean,
        require: true,
        default: false
    },
    dataBoard: {
        type: Object,
        required: true,
        default: utils.getDefaultBoard()
    },
}, { timestamps: true }, { collection: 'room' }
);

const RoomModel = mongoose.model('room', RoomSchema);

module.exports = RoomModel;