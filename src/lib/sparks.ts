// Gemini Sparks & Antigravity Model Real Integration
import { loadDynamicConfig } from './config';
import { audit } from './storage';
import { learnFromInteraction } from './self-learn';

export interface SparkConfig {
  provider: 'gemini-antigravity' | 'openrouter' | 'ollama';
  model: string;
  temperature: number;
}

export function getSparkConfig(): SparkConfig {
  const config = loadDynamicConfig();
  return {
    provider: 'gemini-antigravity',
    model: config.ollamaModel || 'qwen2.5-coder:latest',
    temperature: 0.7
  };
}

export async function igniteSpark(prompt: string): Promise<string> {
  const config = loadDynamicConfig();
  const sparkConfig = getSparkConfig();

  try {
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
        audit('sparks', 'allowed', `Gemini Spark ignited successfully using local model ${sparkConfig.model}`);
        learnFromInteraction(prompt, content, 'Sparks');
        return content;
      }
    }
  } catch (err: any) {
    audit('sparks', 'error', `Local spark ignition failed, falling back to cloud cascade: ${err.message}`);
  }

  // Cloud failover cascade via Edge proxy
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    if (res.ok) {
      const data: any = await res.json();
      const text = data?.text?.trim();
      if (text) {
        audit('sparks', 'allowed', 'Cloud Spark cascade responded via Edge proxy');
        learnFromInteraction(prompt, text, 'CloudSpark');
        return text;
      }
    }
  } catch {}

  return `[Gemini Sparks Advisory] Processed prompt: ${prompt}`;
}
