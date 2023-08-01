require("dotenv").config();
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const { Configuration, OpenAIApi } = require("openai");
const translate = require("translate-google");
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
    const message = `🤖---BOT COMMAND---🤖\n1. *!everyone* = to mention everyone in group.\n2. *!sticker* = to create sticker from image/video.\n3. *!gpt* _prompt_ = communicate with chatgpt.\n4. *!trans* *#lang* _text_ = to using translate ex : !trans #id i want to eat.\n5. *!tts* _text_ = to using text to speech.\n\n follow ig @digiding.id`;
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
  // text to speech
  if (msg.body.slice(0, 4) === "!tts") {
    const message = msg.body.slice(5);
    const url = googleTTS.getAudioUrl(message, {
      lang: "id",
      slow: false,
      host: "https://translate.google.com",
    });

    const media = await MessageMedia.fromUrl(url, { unsafeMime: true });
    client.sendMessage(msg.from, media);
  }
  // chatgpt
  if (msg.body.slice(0, 4) === "!gpt") {
    // chatgpt
    const message = msg.body.slice(4);
    runCompletion(message).then((result) => msg.reply(result));
  }
});
