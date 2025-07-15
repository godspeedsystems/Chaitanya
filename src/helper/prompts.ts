import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'data/system_prompt.json');

export function getPrompts() {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { core_system_prompt, tool_knowledge_prompt } = JSON.parse(fileContent);
  return { tool_knowledge_prompt, core_system_prompt };
}
