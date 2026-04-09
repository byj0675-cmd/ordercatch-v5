import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "AIzaSyBoBLeH-JvgJIvHpXnA93hYFgjK_3mNd0U";
const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
  try {
    // There is no direct listModels in the SDK top level usually, 
    // but we can try to find what's available or use the discovery API if needed.
    // However, the error message literally said "Call ListModels to see the list".
    // In the JS SDK, it's actually not that straightforward without the discovery service.
    
    // Let's try 2.5-flash and 3-flash-preview directly in a small test.
    const modelsToTry = ["gemini-2.5-flash", "gemini-3-flash-preview", "gemini-1.5-flash-latest"];
    
    for (const m of modelsToTry) {
        try {
            const model = genAI.getGenerativeModel({ model: m });
            await model.generateContent("test");
            console.log(`✅ Success with model: ${m}`);
        } catch (e) {
            console.log(`❌ Failed with model: ${m}: ${e.message}`);
        }
    }
  } catch (err) {
    console.error(err);
  }
}

listModels();
