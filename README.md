## AneksBot 

To initialze the app run  `npm init`

Then you can launch the server by using `npm start`

Beforehand you need to create config.json file in the root folder with 5 parameters in it:

    "BASE_URL": "https://api.vk.com/method/",
    "V": "5.126" (current version of VK API used),
    "ACCESS_TOKEN": "VK access token", (can be delegated to process.env)
    "MONGO_CONNECTION_URI": "Your mongoDB connection string", (can be delegated to process.env)
    "BOT_TOKEN": "Your telegram bot token" (can be delegated to process.env)

##### Filling the DB
Firstly, to fill the DB comment the following functions
`checkAneks() `
`scheduleCheck(checkAneks)`

You need to uncomment` uploadToDB()` function to initially fill the database, comment it back and then uncomment following functions to enable hourly checks
`checkAneks() `
`scheduleCheck(checkAneks)`

I will merge them together in the next updates

##### App is built using 4 deps

- Mongoose
- Telegraf
- Nodemon
- Axios