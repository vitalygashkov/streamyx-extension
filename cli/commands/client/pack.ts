import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { importClient } from '../../utils';

export const pack = async (input = process.cwd(), output?: string) => {
  const client = await importClient(input);
  const wvd = await client.pack();
  const wvdName = `${client.info.get('company_name')}_${client.info.get('model_name')}`;
  const wvdOutput = output || join(process.cwd(), `${wvdName}.wvd`);
  await writeFile(wvdOutput, wvd);
  console.log(`Client packed: ${wvdOutput}`);
};
