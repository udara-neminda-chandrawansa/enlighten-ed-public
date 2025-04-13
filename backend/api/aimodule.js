const express = require("express");
const { OpenAI } = require("openai");

const router = express.Router();

const baseURL = "https://openrouter.ai/api/v1";
const apiKey = "my-private-key-was-removed-from-public-repo";

const api = new OpenAI({
  apiKey,
  baseURL,
});

router.post("/ai/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const completion = await api.chat.completions.create({
      model: "deepseek/deepseek-r1:free",
      messages: [
        {
          role: "system",
          content: "You are an AI chatbot that aids a lecturer. Be helpful and generate focused and short responses.",
        },
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0.7,
    });

    const response = completion.choices[0].message.content;
    res.json({ reply: response });
    console.log(response);
  } catch (error) {
    console.error("AI API Error:", error);
    res.status(500).json({ error: "AI service failed" });
  }
});

module.exports = router;
