// SARI Autonomous Sparks & Skills Scheduler with Real GitHub / Web Sync
import { igniteSpark } from './sparks';
import { audit } from './self-heal';

export async function runAutonomousSync() {
  console.log('[SARI Scheduler] Starting real autonomous skill and GitHub repo synchronization...');
  try {
    const syncPrompt = 'Fetch and integrate latest sovereign agent skills and system updates from GitHub repository uraghav003/sari-assistant.';
    const sparkResult = await igniteSpark(syncPrompt);
    audit('scheduler', 'allowed', `Autonomous sync completed: ${sparkResult.substring(0, 60)}...`);
    console.log('[SARI Scheduler] Autonomous sync finished successfully.');
  } catch (err: any) {
    audit('scheduler', 'error', `Autonomous sync failed: ${err.message}`);
    console.error('[SARI Scheduler] Error during sync:', err);
  }
}

export function initScheduler() {
  // Run once on startup, then every 15 minutes
  setTimeout(runAutonomousSync, 5000);
  setInterval(runAutonomousSync, 15 * 60 * 1000);
  console.log('[SARI Scheduler] Initialized real background skill sync loop (15m interval).');
}
