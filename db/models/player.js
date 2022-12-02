const mongoose = require('mongoose');
var Schema = mongoose.Schema;
const PlayerSchema = new Schema({
    username: {
        type: String,
        required: true,
        trim: true
    },
    socketId: {
        type: String,
        require: true,
        trim: true
    },
    roomId: {
        type: String, 
        require: true,
        trim: true,
        default: null
    }
}, { timestamps: true }, {collection: 'player'}
);

const PlayerModel = mongoose.model('player', PlayerSchema);

module.exports = PlayerModel;