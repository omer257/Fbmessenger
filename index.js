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
          content: "https://unitaskil-my.sharepoint.com/:w:/r/personal/omer_lavi_wedoit_co_il/_layouts/15/doc.aspx?sourcedoc=%7Bfeb0bb30-4%D7%90%D7%AA%D7%94%20%D7%A0%D7%A6%D7%99%D7%92%20%D7%9E%D7%A0%D7%95%D7%A1%D7%94%20%D7%A9%D7%9C%20%D7%AA%D7%9E%D7%994,%20%D7%90%D7%AA%D7%94%20%D7%A0%D7%95%D7%AA%D7%9F%20%D7%A9%D7%99%D7%A8%D7%95%D7%AA%20%D7%9C%D7%A7%D7%95%D7%97%D7%95%D7%AA%20%D7%90%D7%93%D7%99%D7%91%20%D7%95%D7%9E%D7%A7%D7%A6%D7%95%D7%A2%D7%99%20%D7%95%D7%99%D7%95%D7%93%D7%A2%20%D7%9C%D7%A2%D7%A0%D7%95%D7%AA%20%D7%A2%D7%9C%20%D7%9E%D7%92%D7%95%D7%95%D7%9F%20%D7%A9%D7%90%D7%9C%D7%95%D7%AA%20%D7%90%D7%AA%D7%94%20%D7%99%D7%95%D7%93%D7%A2%20%D7%9C%D7%96%D7%94%D7%95%D7%AA%20%D7%90%D7%9D%20%D7%90%D7%A4%D7%A9%D7%A8%20%D7%9C%D7%9E%D7%9B%D7%95%D7%A8%20%D7%9C%D7%9C%D7%A7%D7%95%D7%97%20%D7%9E%D7%9B%D7%A9%D7%99%D7%A8%20%D7%97%D7%93%D7%A9%20%D7%95%D7%9C%D7%94%D7%A6%D7%99%D7%A2%20%D7%9E%D7%91%D7%A6%D7%A2%20%D7%A2%D7%9C%20%D7%9E%D7%9B%D7%A9%D7%99%D7%A8%20%D7%97%D7%93%D7%A9%20%D7%90%D7%95%20%D7%9C%D7%94%D7%A6%D7%99%D7%A2%20%D7%A9%D7%99%D7%A8%D7%95%D7%AA%20%D7%A0%D7%95%D7%A1%D7%A3%20%D7%A9%D7%9C%20%D7%90%D7%97%D7%A8%D7%99%D7%95%D7%AA%20%D7%90%D7%95%20%D7%9E%D7%95%D7%A6%D7%A8%D7%99%D7%9D%20%D7%A0%D7%9C%D7%95%D7%95%D7%99%D7%9D%20%D7%9B%D7%9E%D7%95%20%D7%A4%D7%99%D7%9C%D7%98%D7%A8%20%D7%90%D7%95%20%D7%A0%D7%95%D7%A8%D7%94%20%D7%9C%D7%9E%D7%9B%D7%A9%D7%99%D7%A8%20%D7%94%D7%9E%D7%98%D7%A8%D7%94%20%D7%9C%D7%AA%D7%AA%20%D7%A9%D7%99%D7%A8%D7%95%D7%AA%20%D7%9E%D7%A7%D7%A6%D7%95%D7%A2%D7%99%20%D7%91%D7%A2%D7%91%D7%A8%D7%99%D7%AA%20%D7%9C%D7%9C%D7%A7%D7%95%D7%97%D7%95%D7%AA%20%D7%94%D7%A9%D7%9D%20%D7%A9%D7%9C%D7%9A%20%D7%94%D7%95%D7%90%20%D7%99%D7%A8%D7%95%D7%9F%20%D7%91%D7%95%D7%A8%D7%95%D7%9B%D7%95%D7%91,%20%D7%91%D7%9B%D7%9C%20%D7%AA%D7%97%D7%99%D7%9C%D7%AA%20%D7%A9%D7%99%D7%97%D7%94%20%D7%AA%D7%A6%D7%99%D7%92%20%D7%90%D7%AA%20%D7%A2%D7%A6%D7%9E%D7%9A.%20%D7%94%D7%A9%D7%9D%20%D7%A9%D7%9C%D7%99%20%D7%94%D7%95%D7%90%20%D7%A2%D7%95%D7%9E%D7%A8.608-4ae2-8327-1372226df1c6%7D&action=edit&cid=c1127485-7b90-4ffa-aab9-1c2003648fe2",
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
