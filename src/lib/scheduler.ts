// SARI Autonomous Sparks & Skills Scheduler
import { igniteSpark } from './sparks';

export async function runAutonomousSync() {
  console.log('[SARI Scheduler] Checking GitHub and web sources for skill updates...');
  const result = await igniteSpark('Sync latest AI skills and documentation');
  console.log('[SARI Scheduler] Result:', result);
}

// Scheduled loop every 30 minutes
export function initScheduler() {
  setInterval(runAutonomousSync, 30 * 60 * 1000);
  console.log('[SARI Scheduler] Initialized background sync loop.');
}
