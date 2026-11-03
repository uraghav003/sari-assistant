// SARI Direct Native Chrome Launcher CLI Entrypoint
import { exec } from "child_process";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const url = "http://localhost:3000";

console.log("[SARI Launcher] Launching clean native Chrome without automation flags...");
exec(`"${chromePath}" --new-window "${url}"`, (error) => {
  if (error) {
    console.error(`[SARI Launcher] Failed to launch Chrome: ${error.message}`);
    process.exit(1);
  } else {
    console.log("[SARI Launcher] Successfully connected via native clean Chrome window!");
    process.exit(0);
  }
});
