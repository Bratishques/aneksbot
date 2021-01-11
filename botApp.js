const { Telegraf } = require("telegraf");
const WizardScene = require("telegraf/scenes/wizard");
const session = require("telegraf/session");
const Stage = require("telegraf/stage");
const Anekdot = require("./Models/Anekdot");
const fs = require("fs")
const rawConfig = fs.readFileSync('config.json')
const config = JSON.parse(rawConfig)



const bot = new Telegraf(process.env.BOT_TOKEN || config.BOT_TOKEN);

//Shorten the text. Simple
const shortText = (string) => {
  if (string.length > 25) {
    string = string.substring(0, 24) + "...";
  }
  return string;
};

//Utility function to fill the menu with skipped aneks
const skipMenu = (skip, foundAnenks) => {
    return Telegraf.Extra.markdown().markup((m) => {
      const kb = [];
      for (let i = skip; i < skip + 4; i++) {
        if (foundAnenks[i]) {
          kb.push([
            m.callbackButton(
              shortText(foundAnenks[i].text),
              `${foundAnenks[i].number}`
            ),
          ]);
        }
      }
      const utilArray = () => {
        const util = [];
        if (skip != 0) {
          util.push(m.callbackButton("Назад", "back"));
        }
        util.push(m.callbackButton("Новый поиск", "search"));
        if (skip < foundAnenks.length - 4) {
          util.push(m.callbackButton("Вперед", "forward"));
        }
        return util;
      };
      kb.push(utilArray());
      return m.inlineKeyboard(kb);
    });
  };



//Start menu
const startMenu = Telegraf.Extra.markdown().markup((m) =>
  m.inlineKeyboard([
    m.callbackButton("Поиск по строке", "search"),
    m.callbackButton("Рандомный анек", "random"),
  ])
);

//Handling errors
const errorMenu = (ctx) => {
  ctx.reply(
    "Oшибочка! Среди анеков много мусора, поэтому бывают ошибочки\nПопробуй еще раз",
    startMenu
  );
}

//Scene for searching the anekdote
const searchScene = new WizardScene(
  "SEARCH_SCENE",

  //First stage
  (ctx) => {
    try {
      ctx.wizard.state.data = {};
      ctx.wizard.state.data.skip = 0;
      ctx.reply("Введи строку, по которой должен идти поиск, без кавычек");
      return ctx.wizard.next();
    } catch {}
  },

  //Second Stage
  async (ctx) => {
    try {  
      ctx.wizard.state.data.search = ctx.message.text;
      ctx.wizard.state.data.aneks = await Anekdot.find({
        text: {
          $regex: `${ctx.wizard.state.data.search}`,
          $options: "im",
        },
      });
   
      const foundAnenks = ctx.wizard.state.data.aneks;
      const skip = ctx.wizard.state.data.skip;
      
      ctx.reply(
        `Нашлось около ${foundAnenks.length} анекдота, выдаю список\n`,
        skipMenu(skip, foundAnenks)
      );
      return ctx.wizard.next()
    } catch (e) {
      console.log(e)
      ctx.reply(
 
        "Oшибочка! Среди анеков много мусора, поэтому бывают ошибочки\nПопробуй еще раз",
        startMenu
      );
      console.log(e);
      return ctx.scene.leave();
    }
  },

  //Third stage
  (ctx) => {

    try {
        const foundAnenks = ctx.wizard.state.data.aneks;
        const callbackData = ctx.update.callback_query.data
        const numRegex = /([0-9])+/;
        if (callbackData === "forward") {
            ctx.wizard.state.data.skip += 4
            ctx.reply(
                `Нашлось около ${foundAnenks.length} анекдота, выдаю список\n`,
                skipMenu( ctx.wizard.state.data.skip, foundAnenks)
              );
        }
        else if (callbackData === "back") {
            ctx.wizard.state.data.skip -= 4
            ctx.reply(
                `Нашлось около ${foundAnenks.length} анекдота, выдаю список\n`,
                skipMenu( ctx.wizard.state.data.skip, foundAnenks)
              );
        }
        else if (callbackData == "search") {
            ctx.scene.leave()
            ctx.scene.enter("SEARCH_SCENE");
        }
        else if (callbackData == "random") {
            ctx.scene.leave()
            ctx.scene.enter("RANDOM_SCENE");
        }
        else if (numRegex.test(callbackData))  {
            const anekText = foundAnenks.find((anek) => anek.number == callbackData)
            replyWithAnek(ctx, anekText.text)
          }

    }
    catch (e) {
      errorMenu(ctx)
      }
   
  }

);

//For random anek
const randomScene = new WizardScene("RANDOM_SCENE", async (ctx) => {
  try {
    const aneksCount = await Anekdot.countDocuments();
    const number = Math.floor(Math.random() * aneksCount);
    const anekText = await Anekdot.findOne({ number: number });
    replyWithAnek(ctx, anekText.text)
    return ctx.scene.leave();
  } catch (e) {
    errorMenu(ctx)
  }
});

//Split into substrings if too long
const replyWithAnek = (ctx, string) => {
  if (string.length > 4000) {
    ctx.reply(string.substring(0,4000))
    ctx.reply(string.substring(4000, string.length), startMenu)
  }
  else {
    ctx.reply(string,startMenu)
  }
}

const launchBot = () => {
  try {
    const stage = new Stage();
    stage.register(randomScene, searchScene);
    bot.use(session());
    bot.use(stage.middleware());
    bot.start(async (ctx) => {
      const Dbtotal = await Anekdot.countDocuments()
      const greetingString =
  `Привет! \n \nЭто бот с анекдотами, намжи на кнпоку и введи строку, по которой бот должен начать поиск, чтобы найти анекдот \n \nНапример, введи, 'Грузин'\nНу или не вводи, мне вообще плевать \n\nВсего анеков: ${Dbtotal}`;
      ctx.reply(greetingString, startMenu);
    });
    bot.action("random", (ctx) => {
      ctx.scene.leave()
      ctx.scene.enter("RANDOM_SCENE");
    });
    bot.action("search", (ctx) => {
      ctx.scene.leave()
      ctx.scene.enter("SEARCH_SCENE");
    });
    bot.on("callback_query", async (ctx) => {

        try {
            const callbackData = ctx.callbackQuery.data;
        const numRegex = /([0-9])+/;
        if (numRegex.test(callbackData)) {
          const anekText = await Anekdot.findOne({ number: callbackData });
          console.log(anekText.text.length)
          replyWithAnek(ctx, anekText.text)
        }
        }
        catch (e) {
          errorMenu(ctx)
          }
        
      });
    bot.launch();
    console.log("Bot is on");

    // Enable graceful stop
    process.once("SIGINT", () => bot.stop("SIGINT"));
    process.once("SIGTERM", () => bot.stop("SIGTERM"));
  } catch {
    console.log("Bot error");
  }
};

module.exports = launchBot;
