import { readFile } from 'node:fs/promises';
import { Client, Session, fromBase64 } from 'azot';

(async () => {
  const licenseUrl = 'https://cwip-shaka-proxy.appspot.com/no_auth';

  // Prepare pssh
  const pssh =
    'AAAAW3Bzc2gAAAAA7e+LqXnWSs6jyCfc1R0h7QAAADsIARIQ62dqu8s0Xpa7z2FmMPGj2hoNd2lkZXZpbmVfdGVzdCIQZmtqM2xqYVNkZmFsa3IzaioCSEQyAA==';
  const initData = fromBase64(pssh).toBuffer();
  const initDataType = 'cenc';

  // Load device/client
  const wvd = await readFile('client.wvd');
  const client = await Client.importPacked(wvd);

  // Create session
  const session = new Session('temporary', client);

  // Get license challenge
  session.generateRequest(initDataType, initData);
  const challenge = await session.waitForLicenseRequest();

  // Send license request
  const response = await fetch(licenseUrl, { body: challenge, method: 'POST' });
  const license = await response.arrayBuffer().then((ab) => new Uint8Array(ab));

  // Update session with license
  await session.update(license);

  // Print keys
  for (const key of session.keys.values()) {
    console.log(`[${key.type}] ${key.id}:${key.value}`);
  }

  // Close session, disposes of session data
  await session.close();
})();
