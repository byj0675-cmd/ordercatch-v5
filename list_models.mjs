import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "AIzaSyBoBLeH-JvgJIvHpXnA93hYFgjK_3mNd0U";
const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
  try {
    const result = await genAI.listModels();
    console.log("---- AVAILABLE MODELS ----");
    result.models.forEach((m) => {
      console.log(`- ${m.name} (methods: ${m.supportedGenerationMethods.join(", ")})`);
    });
    console.log("---------------------------");
  } catch (error) {
    console.error("Failed to list models:", error);
  }
}

listModels();
