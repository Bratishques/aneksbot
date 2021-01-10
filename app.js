const express = require('express')
const app = express()
const { default: axios } = require("axios")
const fs = require("fs")
const mongoose = require('mongoose');
const Anekdot = require('./Models/Anekdot');
const connectMongo = require('./connectMongo');
const launchBot = require('./botApp');
const rawConfig = fs.readFileSync('config.json')


const config = JSON.parse(rawConfig)

const ACCESS_TOKEN = config.ACCESS_TOKEN || process.env.ACCESS_TOKEN
const V = config.V || process.env.V
const BASE_URL = "https://api.vk.com/method/"
const COMMUNITY_ID = "-85443458"


const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms))
}

connectMongo()

// Making the request url
const makeRequestUrl = (methodName, params, accessToken, V) => {
    let paramsString = ""
    params.map((a) => {
        paramsString += `${a.name}=${a.value}&`
    })

    const url = `${BASE_URL}${methodName}?${paramsString}access_token=${accessToken}&v=${V}`
    return url
}

class Parameter {
    constructor (name, value) {
        this.name = name
        this.value = value
    }
}


const owner_id = new Parameter("owner_id", COMMUNITY_ID)
let offset = new Parameter("offset", 0)

const getResponse = async (count, offset) => {
    const response = await axios.get(makeRequestUrl("wall.get", [owner_id, count, offset], ACCESS_TOKEN, V))
    const data = response.data.response
    return data
}

//Needs to be done
const getOnlyTextPost = () => {
    
}


const uploadToDb = async () => {

    let count = new Parameter("count", 1)
    const aneksData = await getResponse(count, offset)
    const total = aneksData.count
    const Dbtotal = await Anekdot.countDocuments()
    console.log(`Total aneks: ${total}`)
    await sleep(500)
    count = new Parameter("count", 100) 
    for (let i = 0; i < Math.ceil(total/count.value); i++) {
        const offset = new Parameter("offset", i * count.value)
        const aneksData = await getResponse(count, offset)
        console.log(`Uploading aneks from ${i*count.value} to ${(i*count.value) + 100}`)
        aneksData.items.map(async (anekData, j) => {
            const anek = new Anekdot({
              text: anekData.text,
              creation: new Date(anekData.date * 1000),
              number: (count.value * i) + j
            });
            await anek.save();
          });
          await sleep(500)
    }
    
}

const checkAneks = async () => {
    let count = new Parameter("count", 1)
    const aneksData = await getResponse(count, offset)
    const total = aneksData.count
    const Dbtotal = await Anekdot.countDocuments()

    console.log(`Aneks in DB: ${Dbtotal}, aneks available ${total}`)
    if (total <= Dbtotal) {
        console.log(`Aneks are OK, listening for new aneks...`)
    }
    else {
        console.log(`Refreshing the db with ${total - Dbtotal} aneks`)
        count = new Parameter("count", total - Dbtotal)
        const aneksData = await getResponse(count, offset)
        let counter = Dbtotal
        aneksData.items.map(async (anekData, i) => {
            const anek = new Anekdot({
              text: anekData.text,
              creation: new Date(anekData.date * 1000),
              number: counter - 1
            });
            await anek.save();
            counter++
          });
          await sleep(500)
    }
}


//Schedule hourly checks for new aneks
const scheduleCheck = async (func) => {
    setInterval(async () => {
        func()
    }, 1000 * 60 * 60)
}

launchBot()


//uploadToDb()
checkAneks()
scheduleCheck(checkAneks)