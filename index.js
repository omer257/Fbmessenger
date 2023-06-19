// Import required modules
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const openai = require('openai');
dotenv.config();

// Initialize Express app
const app = express();
app.use(bodyParser.json());

// Setup OpenAI
openai.apiKey = process.env.OPENAI_KEY;

// Facebook API URL
const FACEBOOK_API_URL = `https://graph.facebook.com/v13.0/me/messages`;

// Engine and initial prompt
const ENGINE = 'text-davinci-002'; // or other engine you'd like to use
const INITIAL_PROMPT = 'Translate the following English text to French:';

// ChatGPT API
async function getChatGPTResponse(message, initialPrompt = INITIAL_PROMPT) {
  const prompt = initialPrompt + message;

  try {
    const response = await openai.Completion.create({
      engine: ENGINE,
      prompt: prompt,
      max_tokens: 60,
      temperature: 0.8
    });

    return response.data.choices[0].text.trim();
  } catch (error) {
    console.error('Error calling ChatGPT:', error);
    throw error;
  }
}

// Facebook API
async function sendMessageToFb(recipientId, message) {
  const payload = {
    recipient: { id: recipientId },
    message: { text: message },
  };

  try {
    await axios.post(`${FACEBOOK_API_URL}?access_token=${process.env.FACEBOOK_ACCESS_TOKEN}`, payload);
  } catch (error) {
    console.error('Error sending message to Facebook:', error);
    throw error;
  }
}

// Webhook setup for Facebook approval
app.get('/webhook', (req, res) => {
  if (req.query['hub.verify_token'] === process.env.FACEBOOK_VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
  } else {
    console.error('Wrong validation token');
    res.send('Error, wrong validation token');
  }
});

// Handling incoming messages
app.post('/webhook', async (req, res) => {
  const messagingEvents = req.body.entry[0]?.messaging;
  if (!messagingEvents) {
    console.error('No messaging events');
    res.sendStatus(400);
    return;
  }
  
  for (let i = 0; i < messagingEvents.length; i++) {
    const event = messagingEvents[i];
    if (event.message && event.message.text) {
      // Get response from ChatGPT
      try {
        const chatGptResponse = await getChatGPTResponse(event.message.text);
        // Send response to Facebook Messenger
        await sendMessageToFb(event.sender.id, chatGptResponse);
      } catch (error) {
        console.error('Error processing message:', error);
        res.sendStatus(500);
        return;
      }
    }
  }
  res.sendStatus(200);
});

// For testing the ChatGPT API separately
app.get('/testChatGpt', async (req, res) => {
  try {
    const testMessage = 'Hello, how are you?';
    const response = await getChatGPTResponse(testMessage);
    res.send(response);
  } catch (error) {
    console.error('Error testing ChatGPT:', error);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`);
