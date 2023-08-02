require("dotenv").config();
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const { Configuration, OpenAIApi } = require("openai");
const translate = require("translate-google");
const { config, createAudioFromText } = require("tiktok-tts");
config(process.env.TT_TOKEN);
const { TiktokDL } = require("@tobyg74/tiktok-api-dl");
const googleTTS = require("google-tts-api");
const qrcode = require("qrcode-terminal");
// clien config
const client = new Client({
  authStrategy: new LocalAuth(),
});
// openai config
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

async function runCompletion(message) {
  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content: message,
      },
    ],
  });
  return completion.data.choices[0].message.content;
}

async function ttsTiktok(message) {
  await createAudioFromText(message, "audio", "id_001");
}

async function ttdl(url) {
  const result = await TiktokDL(url);
  return result.result.video[1];
}

client.on("loading_screen", (percent, message) => {
  console.log("LOADING SCREEN", percent, message);
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("authenticated", () => {
  console.log("AUTHENTICATED");
});

client.on("auth_failure", (msg) => {
  console.error("AUTHENTICATION FAILURE", msg);
});

client.on("ready", () => {
  console.log("READY!");
});

client.initialize();

client.on("message", async (msg) => {
  // info command
  if (msg.body === "!info") {
    const message = `🤖---BOT COMMAND---🤖\n1. *!everyone* = to mention everyone in group.\n2. *!sticker* = to create sticker from image/video.\n3. *!gpt* _prompt_ = communicate with chatgpt.\n4. *!trans* *#lang* _text_ = to using translate ex : !trans #id i want to eat.\n5. *!ttsgg* _text_ = to using text to speech from google voice.\n6. *!ttstt* _text_ = to using text to speech from tiktok voice\n7. *!tiktok* _url_ = to download tiktok video\n\n follow ig @digiding.id`;
    const media = await MessageMedia.fromUrl(process.env.URL_LOGO);
    client.sendMessage(msg.from, message, { media: media });
  }
  // mention everyone in group
  if (msg.body === "!everyone") {
    const chat = await msg.getChat();

    let text = "";
    let mentions = [];

    for (let participant of chat.participants) {
      const contact = await client.getContactById(participant.id._serialized);

      mentions.push(contact);
      text += `@${participant.id.user} `;
    }

    await chat.sendMessage(text, { mentions });
  }
  // img to sticker
  if (msg.body === "!sticker") {
    const attachmentData = await msg.downloadMedia();
    client.sendMessage(msg.from, attachmentData, { sendMediaAsSticker: true });
  }
  // translate
  if (msg.body.slice(0, 6) === "!trans") {
    const lang = msg.body.slice(8, 10);
    const message = msg.body.slice(11);
    translate(message, { to: lang })
      .then((res) => {
        msg.reply(res);
      })
      .catch((err) => {
        console.error(err);
      });
  }
  // text to speech google
  if (msg.body.slice(0, 6) === "!ttsgg") {
    const message = msg.body.slice(7);
    const url = googleTTS.getAudioUrl(message, {
      lang: "id",
      slow: false,
      host: "https://translate.google.com",
    });
    const media = await MessageMedia.fromUrl(url, { unsafeMime: true });
    client.sendMessage(msg.from, media);
  }
  // text to speech tiktok
  if (msg.body.slice(0, 6) === "!ttstt") {
    const message = msg.body.slice(7);
    await ttsTiktok(message);
    const media = MessageMedia.fromFilePath("./audio.mp3");
    client.sendMessage(msg.from, media);
  }
  // tiktok downloader
  if (msg.body.slice(0, 7) === "!tiktok") {
    const tiktok_url = msg.body.slice(8);
    const result = await ttdl(tiktok_url);
    const media = await MessageMedia.fromUrl(result, { unsafeMime: true });
    client.sendMessage(msg.from, media, { caption: "Download Success ✅" });
  }
  // chatgpt
  if (msg.body.slice(0, 4) === "!gpt") {
    // chatgpt
    const message = msg.body.slice(4);
    runCompletion(message).then((result) => msg.reply(result));
  }
});
