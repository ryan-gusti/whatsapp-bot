require("dotenv").config();
const { Client, LocalAuth } = require("whatsapp-web.js");
const { Configuration, OpenAIApi } = require("openai");
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
    const message = `🤖---BOT COMMAND---🤖\n1. *!everyone* = to mention everyone in group.\n2. *!sticker* = to create sticker from image.\n3. *!gpt* _prompt_ = communicate with chatgpt`;
    client.sendMessage(msg.from, message);
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
  // chatgpt
  if (msg.body.slice(0, 4) === "!gpt") {
    const message = msg.body.slice(4);
    runCompletion(message).then((result) => msg.reply(result));
  }
});
