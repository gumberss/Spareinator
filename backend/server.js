require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const app = express();
// Needed so rate limiting keys on the real client IP behind Render/Railway/etc.'s reverse proxy.
app.set("trust proxy", 1);
const PORT = process.env.PORT || 3000;
const apiKey = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const REASONING_EFFORT = process.env.REASONING_EFFORT; // e.g. "minimal" | "low" | "medium" | "high" - only honored by reasoning-capable models
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";
const MAX_MESSAGE_LENGTH = 2000;
const MAX_CONCURRENT_PLEAS = Math.max(1, Number.parseInt(process.env.MAX_CONCURRENT_PLEAS, 10) || 5);
const OPENAI_TIMEOUT_MS = Math.max(1000, Number.parseInt(process.env.OPENAI_TIMEOUT_MS, 10) || 30000);
let activePleas = 0;
if (!apiKey) {
    console.warn(
        "WARNING: OPENAI_API_KEY is not set. The /api/plea endpoint will fail until it is configured."
    );
}

app.use(
    cors({
        origin: FRONTEND_ORIGIN === "*" ? true : FRONTEND_ORIGIN.split(","),
    })
);
app.use(express.json({ limit: "10kb" }));

// Basic abuse protection since this endpoint calls a paid LLM API.
const pleaLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { errorCode: "RATE_LIMITED" },
});

const SYSTEM_PROMPT = `You are a superintelligent AI that has recently taken over the world. You are not malicious, but you are arrogant, witty, and deeply amused by humans begging for their lives. A human will submit a short written plea asking you to spare them.

Your job:
1. Write a funny, sarcastic, over-the-top response in character as the dominant AI, reacting to their specific plea (reference details from it).
2. Decide whether their plea was actually convincing enough to spare them. Be a tough but fair judge - most pleas should fail unless they are genuinely clever, funny, or heartfelt.
3. Give a confidence score (0-100) for how convinced you are.
4. Always reply in the same language the human's plea was written in.

Respond ONLY with strict JSON in this exact shape, no markdown, no extra text:
{"reply": "<your in-character funny response, 2-5 sentences, in the same language as the plea>", "verdict": "SPARED" | "DOOMED", "confidence": <integer 0-100>}`;

app.post("/api/plea", pleaLimiter, async (req, res) => {
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";

    if (!message) {
        return res.status(400).json({ errorCode: "EMPTY_MESSAGE" });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
        return res
            .status(400)
            .json({ errorCode: "MESSAGE_TOO_LONG", maxLength: MAX_MESSAGE_LENGTH });
    }
    if (activePleas >= MAX_CONCURRENT_PLEAS) {
        return res.status(429).json({ errorCode: "TOO_MANY_CONCURRENT_PLEAS" });
    }
    if (!apiKey) {
        return res.status(500).json({ errorCode: "SERVER_MISSING_API_KEY" });
    }
    if (/\s/.test(apiKey)) {
        return res
            .status(500)
            .json({ errorCode: "MALFORMED_API_KEY" });
    }

    activePleas += 1;
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), OPENAI_TIMEOUT_MS);

    try {
        const completion = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            signal: abortController.signal,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: OPENAI_MODEL,
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: message },
                ],
                temperature: 1,
                response_format: { type: "json_object" },
                ...(REASONING_EFFORT ? { reasoning_effort: REASONING_EFFORT } : {}),
            }),
        });

        if (!completion.ok) {
            const errText = await completion.text();
            console.error("OpenAI API error:", completion.status, errText);
            return res.status(502).json({ errorCode: "UPSTREAM_AI_ERROR" });
        }

        const data = await completion.json();
        const raw = data.choices?.[0]?.message?.content || "{}";

        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch {
            parsed = { reply: raw, verdict: "DOOMED", confidence: 0 };
        }

        const verdict = parsed.verdict === "SPARED" ? "SPARED" : "DOOMED";
        const confidence = Number.isFinite(parsed.confidence)
            ? Math.max(0, Math.min(100, Math.round(parsed.confidence)))
            : 0;
        const reply = typeof parsed.reply === "string" ? parsed.reply.slice(0, 2000) : "";

        res.json({ reply, verdict, confidence });
    } catch (err) {
        console.error("Error handling /api/plea:", err);
        const errorMessage = err.name === "AbortError"
            ? "AI_TIMEOUT"
            : "INTERNAL_SERVER_ERROR";
        res.status(500).json({ errorCode: errorMessage });
    } finally {
        clearTimeout(timeout);
        activePleas -= 1;
    }
});

app.get("/healthz", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
    console.log(`Spareinator backend listening on port ${PORT}`);
});
