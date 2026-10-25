import { createClient } from "@supabase/supabase-js";
import { pathToFileURL } from "node:url";

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

export async function setAgentWorkflowsAndEmailNotifications() {
  const supabase = client();
  const notificationEmail = process.env.SARI_ALERT_EMAIL;

  if (!notificationEmail) {
    console.warn("SARI_ALERT_EMAIL is not set; the digest target will be empty.");
  }

  const workflowConfig = {
    organization: "Divyanshi Capital",
    notification_email: notificationEmail || "",
    workflows: {
      SARI: {
        trigger: "Executive command or UI action",
        action: "Orchestrates multi-agent tasks, generates skills, routes to cloud/local brain",
        notification: "Digest queued (delivery handled by the mail worker, not by this script)",
      },
      LAILA: {
        trigger: "Financial transaction, audit event, or security check",
        action: "Validates zero-trust policies, records events in the server log",
        notification: "Alert queued on policy violation",
      },
      BULBUL: {
        trigger: "Incoming webhook or lead ingestion",
        action: "Stores lead via the server API, dispatches Telegram alert",
        notification: "Lead summary queued",
      },
    },
    updated_at: new Date().toISOString(),
  };

  console.log("Writing agent workflow configuration...");
  const { error } = await supabase
    .from("system_config")
    .upsert({ id: "sari_workflows_and_notifications", config: workflowConfig });

  if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
  console.log("Workflow configuration written.");
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  setAgentWorkflowsAndEmailNotifications().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

export default { setAgentWorkflowsAndEmailNotifications };
