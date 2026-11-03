// SARI & Fish Audio API Sovereign Voice Integration
import { loadDynamicConfig } from './config';
import { audit } from './storage';

export interface FishVoiceRequest {
  text: string;
  referenceId?: string;
  format?: 'mp3' | 'pcm';
}

export async function synthesizeFishVoice(req: FishVoiceRequest): Promise<ArrayBuffer | null> {
  console.log('[Fish Audio Voice] Synthesizing voice via Fish Audio API...');
  const apiKey = localStorage.getItem('fish_audio_api_key') || process.env.FISH_AUDIO_API_KEY || '';
  
  try {
    const response = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        text: req.text,
        reference_id: req.referenceId || 'sari_supreme_master',
        format: req.format || 'mp3',
        normalize: true,
        latency: 'normal'
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (response.ok) {
      const audioBuffer = await response.arrayBuffer();
      audit('fish_voice', 'allowed', `Successfully synthesized ${req.text.length} chars via Fish Audio S2.1 Pro`);
      return audioBuffer;
    }
  } catch (err: any) {
    audit('fish_voice', 'error', `Fish Audio TTS error: ${err.message}`);
  }

  return null;
}

export async function playSariVoice(text: string): Promise<void> {
  const audioBuffer = await synthesizeFishVoice({ text });
  if (audioBuffer && typeof window !== 'undefined') {
    try {
      const blob = new Blob([audioBuffer], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      await audio.play();
      return;
    } catch {}
  }

  // Fallback to browser Web Speech API
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}
