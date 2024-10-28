import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

// Check if has WXT config
if (existsSync('wxt.config.ts')) {
  try {
    // Run wxt prepare and pipe its output to the console
    execSync('wxt prepare', { stdio: 'inherit' });
  } catch (error) {
    // Exit with the same code if the command failed
    process.exit(error.status);
  }
}
