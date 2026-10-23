import OpenAI from 'openai';
import { openaiKey } from './config.js';

export const openai = new OpenAI({
  apiKey: openaiKey,
  maxRetries: 2,
  timeout: 20_000,
});
