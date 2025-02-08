// backend/src/connections/openai.client.ts
import axios from 'axios';
import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) throw new Error('Missing OpenAI API key.');

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

export async function ChatGPT(prompt: string, context?: string): Promise<any> {
  const endpoint = 'https://api.openai.com/v1/chat/completions';
  const headers = {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json'
  };
  const messages = [{ "role": "user", "content": prompt }];
  if (context) {
    messages.unshift({ "role": "system", "content": context });
  }

  const requestBody = {
    // "model": "gpt-3.5-turbo",
    "model": "gpt-4o",
    "messages": messages
  };

  try {
    const response = await axios.post(endpoint, requestBody, { headers });
    const text = response.data.choices[0].message.content.trim();
    return { response: response.data, text };
  } catch (error) {
    console.error(error);
    throw new Error('Failed to get OpenAI chat completion.');
  }
}


import dotenv from "dotenv";
dotenv.config();

// const configuration = new Configuration({
//   apiKey: process.env.OPENAI_API_KEY,
// });
// const openai = new OpenAIApi(configuration);

// Test new model.
// ChatGPT("Why is the sky blue?").then((response) => {
//   console.log(response);
// });

export default openai;