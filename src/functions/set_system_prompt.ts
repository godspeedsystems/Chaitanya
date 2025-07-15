import { GSContext, GSStatus } from '@godspeedsystems/core';
import { promises as fs } from 'fs';
import path from 'path';

export default async function (ctx: GSContext): Promise<GSStatus> {
  const {
    inputs: {
      data: {
        body: { core_system_prompt, tool_knowledge_prompt },
      },
    },
  } = ctx;

  const filePath = path.join(process.cwd(), 'data/system_prompt.json');
  const prompts = {
    core_system_prompt,
    tool_knowledge_prompt,
  };
  await fs.writeFile(filePath, JSON.stringify(prompts, null, 2));

  return new GSStatus(true, 200, undefined, {
    message: 'System prompts updated successfully.',
  });
}
