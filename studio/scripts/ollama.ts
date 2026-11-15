// Локальная модель через ollama (localhost:11434). Нужна для рутинных проверок, на которые жалко токенов Claude
export const MODEL = process.env.OLLAMA_MODEL ?? "gemma4:12b-mlx";
const HOST = process.env.OLLAMA_HOST ?? "http://localhost:11434";

export const ollamaUp = async () => {
  try {
    return (await fetch(`${HOST}/api/version`, { signal: AbortSignal.timeout(2000) })).ok;
  } catch {
    return false;
  }
};

// Промпт + картинки (base64) → разобранный JSON-ответ. temperature 0, без «размышлений»
export const askJson = async <T>(prompt: string, images: string[] = []): Promise<T> => {
  const res = await fetch(`${HOST}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, prompt, images, format: "json", stream: false, think: false, options: { temperature: 0 } }),
    signal: AbortSignal.timeout(300_000),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}: ${await res.text()}`);
  const { response } = (await res.json()) as { response: string };
  return JSON.parse(response) as T;
};
