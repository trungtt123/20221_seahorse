const mongoose = require('mongoose');

const DATABASE_URL = `mongodb://localhost:27017/seahorse`;

mongoose.connect(DATABASE_URL, {useUnifiedTopology: true,useNewUrlParser: true})
.then(() => console.log('DB Connected!'))
.catch(err => {
console.log(err);
});