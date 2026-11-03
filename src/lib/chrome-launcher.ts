// SARI Sovereign Chrome Launch Utility & Direct Profile Connector
import { exec } from 'child_process';
import { audit } from './storage';

export async function launchSariChromeDirect(): Promise<{ success: boolean; message: string }> {
  console.log('[SARI Chrome Direct] Launching native Chrome without automation flags...');
  
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const url = 'http://localhost:3000';

  const { promise, resolve } = Promise.withResolvers<{ success: boolean; message: string }>();

  exec(`"${chromePath}" --new-window "${url}"`, (error) => {
    if (error) {
      audit('chrome_launch', 'error', `Failed to launch native Chrome: ${error.message}`);
      resolve({ success: false, message: `Failed to launch Chrome: ${error.message}` });
    } else {
      audit('chrome_launch', 'allowed', 'Successfully launched clean native Chrome instance.');
      resolve({ success: true, message: 'Ji Maalik! Clean native Chrome window launched directly without automated testing flags.' });
    }
  });

  return promise;
}
