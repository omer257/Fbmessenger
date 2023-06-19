require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { Configuration, OpenAIApi,OpenAI } = require("openai");

const AICode = process.env.OPEN_AI_KEY;

const configuration = new Configuration({
    apiKey: AICode,
});
const openai = new OpenAIApi(configuration);

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
        try {
          await handleMessage(senderId, webhookEvent.message);
        } catch (error) {
          console.error('Error handling the message:', error);
        }
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

app.get('/aitest', async (req, res) => {
  try {
    const response = await getGpt3Response("The assistant should answer the following question: What's the weather like today?");
    console.log('OpenAI response:', response);
    res.send(response);
  } catch (error) {
    console.error('Error with OpenAI:', error);
    res.status(500).send('Error with OpenAI');
  }
});

async function handleMessage(senderId, receivedMessage) {
  let messageText = receivedMessage.text;

  if (messageText) {
    console.log('Processing message:', messageText);
    const response = await getGpt3Response(messageText);
    console.log('OpenAI response:', response);
    await callSendAPI(senderId, response);
  }
}

async function getGpt3Response(message) {
  try {
    console.log(OpenAIApi);
    const gptResponse = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "אתה נציג מנוסה של ווידו 7, ווידו 7 היא כמו תמי 4אתה נותן שירות לקוחות אדיב ומקצועי ויודע לענות שאלות ולזהות אם אפשר למכור ללקוח מכשיר חדש ולהציע מבצע על מכשיר חדש או שירות נוסף של אחריות או מוצרים כמו פילטר או נורה למכשיר השם שלך הוא ירון בורוכוב, בכל תחילת שיחה תציג את עצמך.אתה תזכור את זה לאורך כל השיחה",
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    return gptResponse.data['choices'][0]['message']['content'];
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
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

app.listen(3000, () => console.log('webhook server is listening, port 3000-**********************************************'));
