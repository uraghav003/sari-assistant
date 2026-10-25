import { createClient } from "@supabase/supabase-js";
import { pathToFileURL } from "node:url";

/**
 * Records the architecture description in Supabase. Maintenance script: runs
 * only when invoked directly. Requires SARI_SUPABASE_URL and SARI_SUPABASE_KEY.
 */

function client() {
  const url = process.env.SARI_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SARI_SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SARI_SUPABASE_URL and SARI_SUPABASE_KEY must be set.");
  }
  return createClient(url, key);
}

export async function applyDivyanshiCapitalCloudHubV5() {
  const supabase = client();
  const architectureV5 = {
    system: "Divyanshi Capital Cloud Hub V5",
    architecture: "Master Sovereign AI (SARI) with sub-agent fleet (LAILA, BULBUL, VOICE_FLEET)",
    security_tier: "Session cookie auth · HMAC-gated Apps Script bridge · server-held credentials",
    ai_runtime: "Gemini cloud tier → signed Apps Script bridge → local Ollama fallback",
    voice_engine: "Web Speech API STT/TTS",
    routing_channels: "Telegram dispatch via authenticated server route",
    status: "CONFIGURED",
    deployed_at: new Date().toISOString(),
  };

  console.log("Writing Cloud Hub V5 architecture record...");
  const { error } = await supabase
    .from("system_config")
    .upsert({ id: "divyanshi_capital_cloud_hub_v5", config: architectureV5 });

  if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
  console.log("Architecture record written.");
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  applyDivyanshiCapitalCloudHubV5().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
