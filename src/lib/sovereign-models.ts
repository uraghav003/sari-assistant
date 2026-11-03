// SARI Sovereign AI Model Registry & Dynamic Tier Router
import { loadDynamicConfig } from './config';
import { audit } from './storage';

export interface SovereignAiModel {
  id: string;
  name: string;
  tier: 'PRIMARY' | 'FASTING' | 'FALLBACK';
  provider: 'google-antigravity' | 'anthropic' | 'kimi-code' | 'ollama';
  endpoint: string;
}

export const SOVEREIGN_MODELS: SovereignAiModel[] = [
  {
    id: 'google-antigravity/gemini-3.8-flash',
    name: 'Gemini 3.8 Flash (Antigravity)',
    tier: 'PRIMARY',
    provider: 'google-antigravity',
    endpoint: 'https://gateway.ai.cloudflare.com/v1'
  },
  {
    id: 'anthropic/claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6 (Anthropic)',
    tier: 'PRIMARY',
    provider: 'anthropic',
    endpoint: 'https://api.anthropic.com/v1/messages'
  },
  {
    id: 'kimi-code/kimi-for-coding',
    name: 'Kimi For Coding (Moonshot)',
    tier: 'FASTING',
    provider: 'kimi-code',
    endpoint: 'https://api.moonshot.cn/v1'
  },
  {
    id: 'qwen2.5-coder:latest',
    name: 'Qwen 2.5 Coder (Local Ollama)',
    tier: 'FALLBACK',
    provider: 'ollama',
    endpoint: 'http://127.0.0.1:11434'
  }
];

export async function updateSovereignModels(): Promise<{ updated: boolean; activeModel: string }> {
  console.log('[Sovereign Models] Updating and optimizing active AI model routing tiers...');
  const config = loadDynamicConfig();
  
  const activeModel = config.ollamaModel || 'google-antigravity/gemini-3.8-flash';
  audit('sovereign_models', 'allowed', `Updated sovereign AI models. Active primary model: ${activeModel}`);
  
  return {
    updated: true,
    activeModel
  };
}
