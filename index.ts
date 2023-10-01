require("dotenv").config();

const Eris = require("eris");
const Constants = Eris.Constants;

const axios = require("axios").default;
const path = require('path');
const fs = require('fs');

const bannedWords = require("./bannedWords").bannedwords;

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


const bot = new Eris(`Bot ${process.env.TOKEN}`, {
  intents: [],
  restMode: true,
});


console.info(`Starting up...`);
bot.on("ready", () => {
  console.info(`Bot is ready!`);
});

async function getAudioStream(url: string) {
  try {
    const response = await axios.get(url, {responseType: 'stream'});

    if (response.status !== 200) {
      throw new Error(`Failed to fetch audio, status code: ${response.status}`);
    }

    const filePath = path.join(__dirname, 'audio', 'file.mp3');
    const fileStream = fs.createWriteStream(filePath);

    response.data.pipe(fileStream);

    await new Promise((resolve, reject) => {
      fileStream.on('finish', resolve);
      fileStream.on('error', reject);
    });

    const audioReadStream = fs.createReadStream(filePath);

    return audioReadStream;
  } catch (error: any) {
    console.error(`Error fetching audio: ${error.message}`);
    throw error;
  }
}

function censorBannedWords(text: string) {
  for (const word of bannedWords) {
    text = text.replace(word, word.length > 1 ? "*".repeat(word.length) : "*");
  }
  return text;
}

bot.on("interactionCreate", async (interaction: any) => {
  console.log("Interaction received!");
  //console.log(interaction.data);
  const message = interaction.data.resolved.messages.get(interaction.data.target_id);
  //console.log(message);
  // check if interaction has any files
  if (message.attachments.length > 0) {
    console.log("Interaction has files!");
    await interaction.acknowledge();
    // check if any of the files is an audio file
    const audioFiles = message.attachments.filter((attachment: any) => {
      //console.log(attachment);
      return attachment.content_type.startsWith("audio");
    });
    if (audioFiles.length > 0) {
      console.log("Interaction has audio files!");
      for (const audioFile of audioFiles) {
        console.log("Processing audio file...");
        //console.log(audioFile);
        // get read stream from audioFile
        getAudioStream(audioFile.url)
          .then((stream: any) => {
            //console.log(stream);
            // send readStream to OpenAI
            console.log("Sending audio to OpenAI...");
            openai.audio.transcriptions.create({
              file: stream,
              model: "whisper-1",
            })
              .then((transcription: any) => {
                console.log(transcription);
                // send transcription to channel
                let transcriptionText = transcription.text;
                // censor banned words
                transcriptionText = censorBannedWords(transcriptionText);
                // check if transcription is longer than 4096 characters
                if (transcriptionText.length > 4096) {
                  // add transcription to hastebin
                  axios.post("https://hastebin.com/documents", transcriptionText).then(
                    (response: any) => {
                      // truncate transcription
                      transcriptionText = transcriptionText.substring(0, 4096);
                      // send transcription to channel
                      interaction.createFollowup({
                        content: "",
                        embeds: [
                          {
                            title: "Transcription",
                            description: transcriptionText,
                            color: 0x4a8aff,
                          },
                          {
                            title: "Full Transcription",
                            description: `https://hastebin.com/share/${response.data.key}`,
                            color: 0x0000ff,
                          },
                        ],
                      })
                    }
                  ).catch((err: any) => {
                    console.error(err);
                    interaction.createFollowup({
                      content: "",
                      embeds: [
                        {
                          title: "Transcription",
                          description: transcriptionText.substring(0, 4096),
                        },
                      ],
                      color: 0x4a8aff,
                    });
                  });
                } else {
                  interaction.createFollowup({
                    content: "",
                    embeds: [
                      {
                        title: "Transcription",
                        description: transcription.text,
                      },
                    ],
                    color: 0x4a8aff,
                  });
                }
              }).catch((err: any) => {
              console.error(err);
            });
          }).catch((err: any) => {
          console.error(err);
        });
      }
    } else {
      console.log("Interaction has no audio files!");
      return interaction.createMessage({
        content: "This message has no audio files!",
        flags: 1 << 6,
      })
    }
  } else {
    console.log("Interaction has no files!");
    return interaction.createMessage({
      content: "This message has no files!",
      flags: 1 << 6,
    })
  }
});

bot.on("error", (err: any) => {
  console.error(err);
});

console.info(`Connecting to Discord...`);
bot.connect().then(() => {
  console.info(`Connected!`);
  console.info(`Setting status...`);
  bot.editStatus("online", {
    name: "with audio cables",
    type: Constants.ActivityTypes.GAME,
  })
  console.info(`Status set!`);
});