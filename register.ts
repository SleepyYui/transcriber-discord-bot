require("dotenv").config();

const Eris = require("eris");
const Constants = Eris.Constants;

const bot = new Eris(`Bot ${process.env.TOKEN}`, {});

bot.on("error", (err: any) => {
  console.error(err);
});

bot.on("ready", () => {
  console.info(`Ready!`);
  // register app command for messages
  bot.createCommand({
    name: "Transcribe",
    type: Constants.ApplicationCommandTypes.MESSAGE,
  }).then((command: any) => {
    console.log(`Registered command ${command.name}`);
    // exit
    process.exit(0);
  }).catch((err: any) => {
    console.error(err);
    // exit
    process.exit(1);
  });
});

console.info(`Connecting to Discord...`);
bot.connect().then(() => {
  console.info(`Connected!`);
});