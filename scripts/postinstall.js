import { existsSync } from 'fs';
import { execSync } from 'child_process';

// Check if .git directory exists (we're in development)
if (existsSync('.git')) {
  try {
    // Run wxt prepare and pipe its output to the console
    execSync('wxt prepare', { stdio: 'inherit' });
  } catch (error) {
    // Exit with the same code if the command failed
    process.exit(error.status);
  }
}
