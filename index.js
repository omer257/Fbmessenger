require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const OpenAI = require('openai');

const openai = new OpenAI(process.env.OPEN_AI_KEY);

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/facebook', (req, res) => {
  let body = req.body;
  console.log('Webhook POST request received.');

  if (body.object === 'page') {
    body.entry.forEach(async (entry) => {
      let webhookEvent = entry.messaging[0];
      let senderId = webhookEvent.sender.id;
      console.log('Webhook event received from sender ID:', senderId);

      if (webhookEvent.message) {
        console.log('Message received:', webhookEvent.message);
        await handleMessage(senderId, webhookEvent.message);
      }
    });
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

app.get('/facebook', (req, res) => {
  let VERIFY_TOKEN = process.env.VERIFY_TOKEN;

  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  console.log('Webhook GET request received.');

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook verified.');
      res.status(200).send(challenge);
    } else {
      console.log('Webhook verification failed.');
      res.sendStatus(403);
    }
  }
});

async function handleMessage(senderId, receivedMessage) {
  let messageText = receivedMessage.text;

  if (messageText) {
    console.log('Processing message:', messageText);
    try {
      const response = await getGpt3Response("The assistant should answer the following question: " + messageText);
      console.log('OpenAI response:', response);
      await callSendAPI(senderId, response);
    } catch (err) {
      console.error('Error with OpenAI:', err);
    }
  }
}

async function getGpt3Response(message) {
  const gptResponse = await openai.ChatCompletion.create({
    model: "text-davinci-002", // Update the model as per your needs
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant.",
      },
      {
        role: "user",
        content: message,
      },
    ],
  });

  return gptResponse.data['choices'][0]['message']['content'];
}

async function callSendAPI(senderId, response) {
  let requestBody = {
    recipient: {
      id: senderId,
    },
    message: {
      text: response,
    },
  };

  try {
    await axios.post(`https://graph.facebook.com/v13.0/me/messages?access_token=${process.env.PAGE_ACCESS_TOKEN}`, requestBody);
    console.log('Message sent to Facebook Messenger.');
  } catch (err) {
    console.error('Unable to send message:' + err);
  }
}

app.listen(3000, () => console.log('webhook server is listening, port 3000'));
