import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { importClient } from '../../utils';

export const unpack = async (input = process.cwd(), output?: string) => {
  const client = await importClient(input);
  const [id, key] = await client.toPair();
  const idOutput = join(output || process.cwd(), `device_client_id_blob`);
  const keyOutput = join(output || process.cwd(), `device_private_key`);
  await writeFile(idOutput, id);
  await writeFile(keyOutput, key);
  console.log(`Client unpacked: ${idOutput}, ${keyOutput}`);
};
