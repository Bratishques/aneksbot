const mongoose = require('mongoose')
const { Schema } =  mongoose;

const anekdotSchema = new Schema({
    text: String,
    creation: Date,
    number: Number
})

module.exports = mongoose.model("Anekdot", anekdotSchema)