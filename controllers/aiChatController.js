
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const sleep = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms));

async function generateWithRetry(contents) {
    const primaryModel =
        process.env.GEMINI_MODEL || "gemini-3.8-flash";

    const fallbackModel =
        process.env.GEMINI_FALLBACK_MODEL || "gemini-3.7-flash";

    const generate = (model) =>
        ai.models.generateContent({
            model,
            contents,
            config: {
                systemInstruction:
                    "You are Foodie AI, a helpful food assistant for a food delivery application. Be friendly and concise. Do not invent restaurant names, dishes, prices, or availability.",
                maxOutputTokens: 700
            }
        });

    // Retry temporary 503 errors with exponential backoff.
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            return await generate(primaryModel);
        } catch (error) {
            if (error.status !== 503 || attempt === 2) {
                // Retry only temporary service overloads.
                if (error.status !== 503) {
                    throw error;
                }
                break;
            }

            const delay = 1000 * (2 ** attempt);

            console.log(
                `Gemini temporarily unavailable. Retrying in ${delay} ms...`
            );

            await sleep(delay);
        }
    }

    // Try the fallback model once.
    if (fallbackModel && fallbackModel !== primaryModel) {
        console.log(`Trying fallback model: ${fallbackModel}`);

        return await generate(fallbackModel);
    }

    throw new Error("Gemini is temporarily unavailable.");
}

export async function sendMessage(req, res) {
    try {
        const { message } = req.body ?? {};

        if (
            typeof message !== "string" ||
            !message.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Please enter a message."
            });
        }

        if (!process.env.GEMINI_API_KEY) {
            console.error("GEMINI_API_KEY is missing.");

            return res.status(500).json({
                success: false,
                message: "Foodie AI is not configured correctly."
            });
        }

        const contents = [
            {
                role: "user",
                parts: [
                    {
                        text: message.trim()
                    }
                ]
            }
        ];

        // Use the retry and fallback function.
        const response = await generateWithRetry(contents);

        const aiReply = response.text?.trim();

        if (!aiReply) {
            throw new Error("Gemini returned an empty response.");
        }

        return res.status(200).json({
            success: true,
            reply: aiReply
        });

    } catch (error) {
        console.error("Foodie AI error:", error);

        const status =
            error.status === 429 ? 429 :
            error.status === 503 ? 503 :
            error.status === 404 ? 502 :
            500;

        return res.status(status).json({
            success: false,
            message:
                status === 503
                    ? "Foodie AI is temporarily busy. Please try again shortly."
                    : status === 429
                    ? "Foodie AI has reached its usage limit. Please try again later."
                    : status === 502
                    ? "The configured AI model is unavailable. Please check your model settings."
                    : "Foodie AI could not respond. Please try again."
        });
    }
}
