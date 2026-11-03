// SARI Dynamic Mind & Local Gemini / Ollama Knowledge Connector
import { loadDynamicConfig } from './config';
import { audit } from './storage';

export interface DynamicKnowledgeQuery {
  topic: string;
  context?: string;
}

export async function fetchDynamicKnowledge(query: DynamicKnowledgeQuery): Promise<string> {
  const config = loadDynamicConfig();
  const prompt = `[SARI Dynamic Mind Knowledge Expansion] Topic: ${query.topic}. Context: ${query.context || 'General banking and sovereign swarm operations'}. Provide advanced architectural strategies, skills, and code patterns.`;

  try {
    const response = await fetch(`${config.ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.ollamaModel || 'qwen2.5-coder:latest',
        stream: false,
        messages: [{ role: 'system', content: 'You are SARI Master Sovereign AI Brain. Provide deep technical knowledge and skills.' }, { role: 'user', content: prompt }],
        options: { temperature: 0.3, num_ctx: 8192 }
      })
    });

    if (response.ok) {
      const data: any = await response.json();
      const knowledge = data?.message?.content?.trim();
      if (knowledge) {
        audit('dynamic-mind', 'allowed', `Fetched dynamic knowledge for topic: ${query.topic}`);
        return knowledge;
      }
    }
  } catch (err: any) {
    audit('dynamic-mind', 'error', `Dynamic knowledge fetch error: ${err.message}`);
  }

  return `[Dynamic Mind Offline Knowledge] Sovereign guidance for ${query.topic}: maintain zero-trust security, single-flight execution, and strict canonical script IDs.`;
}

export async function syncDynamicMindSkills(): Promise<void> {
  console.log('[Dynamic Mind] Syncing skills and expanding knowledge base via local AI brain...');
  const topics = ['Financial Underwriting', 'Cloudflare Workers Architecture', 'Autonomous Agent Swarms', 'Zero-Trust Security'];
  for (const topic of topics) {
    const knowledge = await fetchDynamicKnowledge({ topic });
    console.log(`[Dynamic Mind] Acquired knowledge for ${topic} (${knowledge.length} chars)`);
  }
}
