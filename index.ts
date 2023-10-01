require("dotenv").config();

const Eris = require("eris");
const Constants = Eris.Constants;

const axios = require("axios").default;
const path = require('path');
const fs = require('fs');

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
    // Make an HTTP GET request to the URL to download the file
    const response = await axios.get(url, { responseType: 'stream' });

    // Check if the response status code is OK (200)
    if (response.status !== 200) {
      throw new Error(`Failed to fetch audio, status code: ${response.status}`);
    }

    // Define the path where you want to save the downloaded file
    const filePath = path.join(__dirname, 'audio', 'file.mp3'); // Adjust the file path as needed

    // Create a writable stream to save the file
    const fileStream = fs.createWriteStream(filePath);

    // Pipe the response data (stream) to the file stream
    response.data.pipe(fileStream);

    // Wait for the file to finish downloading
    await new Promise((resolve, reject) => {
      fileStream.on('finish', resolve);
      fileStream.on('error', reject);
    });

    // Create a Readable stream from the downloaded file
    const audioReadStream = fs.createReadStream(filePath);

    return audioReadStream;
  } catch (error: any) {
    console.error(`Error fetching audio: ${error.message}`);
    throw error; // Re-throw the error to handle it where the function is called
  }
}

bot.on("interactionCreate", async (interaction: any) => {
  await interaction.acknowledge();
  console.log(interaction.data);
  const message = interaction.data.resolved.messages.get(interaction.data.target_id);
  console.log(message);
  // check if interaction has any files
  if (message.attachments.length > 0) {
    // check if any of the files is an audio file
    const audioFiles = message.attachments.filter((attachment: any) => {
      console.log(attachment);
      return attachment.content_type.startsWith("audio");
    });
    if (audioFiles.length > 0) {
      for (const audioFile of audioFiles) {
        console.log(audioFile);
        // get read stream from audioFile
        getAudioStream(audioFile.url)
          .then((stream: any) => {
            console.log(stream);
            // send readStream to OpenAI
            console.log("Sending audio to OpenAI...");
            openai.audio.transcriptions.create({
              file: stream,
              model: "whisper-1",
            })
              .then((transcription: any) => {
                console.log(transcription);
                // send transcription to channel
                interaction.createFollowup({
                  content: transcription.text,
                })
              })
              .catch((err: any) => {
                console.error(err);
              });
          })
          .catch((err: any) => {
            console.error(err);
          });
      }
    }
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