import { GSContext, GSStatus } from '@godspeedsystems/core';
import { promises as fs } from 'fs';
import path from 'path';

export default async function (ctx: GSContext): Promise<GSStatus> {
  const filePath = path.join(process.cwd(), 'data/system_prompt.json');
  const fileContent = await fs.readFile(filePath, 'utf-8');
  const prompts = JSON.parse(fileContent);
  return new GSStatus(true, 200, undefined, prompts);
}
