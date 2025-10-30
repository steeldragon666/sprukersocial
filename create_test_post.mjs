import { invokeLLM } from "./server/_core/llm.js";
import { generateImage } from "./server/_core/imageGeneration.js";

async function createTestPost() {
  console.log("Generating test post content...");
  
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are a content creator for PowerPlant Energy, an Australian company focused on sustainable fuels, SAF, and bioenergy."
      },
      {
        role: "user",
        content: "Create an engaging Instagram post about: Sustainable Aviation Fuel (SAF) breakthroughs\n\nRequirements:\n- Write 2-3 short paragraphs (max 200 words)\n- Include 1-2 key facts\n- Professional yet accessible tone\n- End with a call-to-action\n- DO NOT include hashtags\n\nFormat as plain text, no markdown."
      }
    ]
  });
  
  const caption = response.choices[0].message.content;
  console.log("Caption generated:", caption.substring(0, 100) + "...");
  
  console.log("Generating image...");
  const imageResult = await generateImage({
    prompt: "Modern sustainable aviation fuel facility with aircraft in background, clean energy infrastructure, professional photography, bright and optimistic, high quality"
  });
  
  console.log("Image URL:", imageResult.url);
  console.log("\nTest post ready!");
  console.log("Caption:", caption);
  console.log("Image:", imageResult.url);
}

createTestPost().catch(console.error);
