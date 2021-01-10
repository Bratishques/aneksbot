const fs = require("fs")
const mongoose = require('mongoose')
const rawConfig = fs.readFileSync('config.json')
const config = JSON.parse(rawConfig)

const connectMongo = async () => {
    mongoose.connect(config.MONGO_CONNECTION_URI || process.env.MONGO_CONNECTION_URI, 
        {useNewUrlParser: true, useUnifiedTopology: true},
        (e) => {
            try {
                console.log("Connected to the DB")
            }
            catch{
                console.log(e)
            }
        }
    )  
}

module.exports = connectMongo