export type GeminiOptions = {
  maxRetries?: number;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  minLength?: number;
  timeoutMs?: number;
  thinkingBudget?: number;
};

export async function generateWithGemini(
  prompt: string,
  options: number | GeminiOptions = 2,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const normalizedOptions: GeminiOptions =
    typeof options === "number" ? { maxRetries: options } : options;
  const {
    maxRetries = 2,
    model = "gemini-2.5-flash",
    temperature = 0.3,
    maxOutputTokens = 8192,
    minLength = 100,
    timeoutMs = 20000,
    thinkingBudget,
  } = normalizedOptions;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const body: Record<string, unknown> = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          maxOutputTokens,
        },
      };
      if (thinkingBudget != null) {
        (body.generationConfig as Record<string, unknown>).thinkingConfig = {
          thinkingBudget,
        };
      }

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        },
      );

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini API ${res.status}: ${errText.slice(0, 200)}`);
      }

      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (text.trim().length >= minLength || attempt === maxRetries) {
        return text.trim();
      }
    } catch (error) {
      if (attempt === maxRetries) throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error("Gemini returned empty response");
}
