import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

async function run() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: 'A highly detailed, futuristic neon glowing maple leaf intertwined with an infinity symbol. Cyberpunk aesthetic, dark background, vibrant cyan and magenta neon lights, 4k resolution, masterpiece, sleek, modern.',
      config: {
        imageConfig: { aspectRatio: '1:1', imageSize: '1K' }
      }
    });
    const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64) {
      if (!fs.existsSync('public')) {
        fs.mkdirSync('public');
      }
      fs.writeFileSync('public/default-logo.png', Buffer.from(base64, 'base64'));
      console.log('Logo saved to public/default-logo.png');
    } else {
      console.log('Failed to generate: no inlineData');
    }
  } catch (e) {
    console.error(e);
  }
}
run();
