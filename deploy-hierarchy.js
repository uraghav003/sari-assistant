import { createClient } from "@supabase/supabase-js";

/**
 * Maintenance script. Runs only when invoked directly — never on import.
 * Requires SARI_SUPABASE_URL and SARI_SUPABASE_KEY (service role).
 */

function client() {
  const url = process.env.SARI_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SARI_SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SARI_SUPABASE_URL and SARI_SUPABASE_KEY must be set.");
  }
  return createClient(url, key);
}

export async function deployRealHierarchy() {
  const supabase = client();
  const teamConfig = {
    system_name: "SARI Sovereign AI",
    owner: "Maalik",
    organization: "Divyanshi Capital",
    agents: [
      {
        name: "SARI",
        role: "Master Sovereign AI",
        status: "ACTIVE",
        capabilities: ["Executive Control", "Workflow Builder", "Multi-Agent Orchestration"],
      },
      {
        name: "LAILA",
        role: "System Auditor & Policy Controller",
        status: "ACTIVE",
        capabilities: ["Audit Trail Logging", "Financial Data Protection", "Zero-Trust Gatekeeping"],
      },
      {
        name: "BULBUL",
        role: "Operations & Reporting Analyst",
        status: "ACTIVE",
        capabilities: ["Lead Intake Ingestion", "Telegram / WhatsApp Routing", "Daily Operations Digest"],
      },
    ],
    updated_at: new Date().toISOString(),
  };

  console.log("Deploying SARI agent hierarchy...");
  const { error } = await supabase
    .from("system_config")
    .upsert({ id: "sari_core_identity", config: teamConfig });

  if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
  console.log("Agent hierarchy written.");
}

const invokedDirectly =
  process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, "/")}`).href;

if (invokedDirectly) {
  deployRealHierarchy().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

export default { deployRealHierarchy };
