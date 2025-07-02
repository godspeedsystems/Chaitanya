import { GSContext, GSStatus, logger } from '@godspeedsystems/core';
import path from 'path';
import * as fs from 'fs/promises'; 
import { ingestChangedFiles } from '../helper/ingestGithubRepo';

interface GITHUBOBJECT {
  githuburl: string;
  branch: string;
}

const REPO_URL_FILE = path.resolve(__dirname, '../../data/repo_url.json');

async function saveRepoUrl(gitobj: GITHUBOBJECT): Promise<void> {
  try {
    let parsed: GITHUBOBJECT[] = [];

    try {
      const data = await fs.readFile(REPO_URL_FILE, 'utf-8');
      parsed = JSON.parse(data);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }

    const index = parsed.findIndex(p => p.githuburl === gitobj.githuburl && p.branch === gitobj.branch);
    if (index !== -1) {
      parsed[index] = gitobj; 
    } else {
      parsed.push(gitobj);
    }

    await fs.writeFile(REPO_URL_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
    logger.info(`[INFO] Repo info saved: ${gitobj.githuburl}@${gitobj.branch}`);
  } catch (error) {
    logger.error(`[ERROR] Failed to save repo URL:`, error);
  }
}

export default async function (ctx: GSContext): Promise<GSStatus> {
  const githuburl = ctx.inputs.data.body.github_url;
  const branch = ctx.inputs.data.body.branch;

  if (!githuburl || !branch) {
    return new GSStatus(false, 400, undefined ,{message : 'github_url and branch are required'});
  }

  await saveRepoUrl({ githuburl, branch });

   try {
    // Step 2: Trigger ingestion from GitHub immediately
    await ingestChangedFiles(githuburl, branch);
  } catch (e) {
    logger.error(`[ERROR] Failed to ingest repo content:`, e);
    return new GSStatus(false, 500, undefined,{message : `Failed to ingest GitHub repo: ${(e as Error).message}`});
  }

  return new GSStatus(true, 200,undefined ,{message : 'GitHub repo info saved'});
}
