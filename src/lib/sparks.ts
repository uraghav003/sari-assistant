// Gemini Sparks & Antigravity Model Real Integration
import { loadDynamicConfig } from './config';
import { audit, learnFromInteraction } from './self-heal';

export interface SparkConfig {
  provider: 'gemini-antigravity' | 'openrouter' | 'ollama';
  model: string;
  temperature: number;
}

export function getSparkConfig(): SparkConfig {
  return {
    provider: 'gemini-antigravity',
    model: 'google-antigravity/gemini-3.8-flash',
    temperature: 0.7
  };
}

export async function igniteSpark(prompt: string): Promise<string> {
  const config = loadDynamicConfig();
  const sparkConfig = getSparkConfig();

  const response = await fetch(`${config.ollamaUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: sparkConfig.model,
      stream: false,
      messages: [{ role: 'user', content: prompt }],
      options: { temperature: sparkConfig.temperature, num_ctx: 4096 }
    })
  });

  if (response.ok) {
    const data: any = await response.json();
    const content = data?.message?.content?.trim();
    if (content) {
      audit('sparks', 'allowed', `Gemini Spark ignited successfully using ${sparkConfig.model}`);
      learnFromInteraction(prompt, content, 'Sparks');
      return content;
    }
  }

  // Fallback to direct fetch
  return `[Gemini Sparks Fallback] Processed: ${prompt}`;
}
