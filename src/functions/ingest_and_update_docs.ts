import { GSContext, GSStatus } from '@godspeedsystems/core';
import { ingestChangedFiles, loadRepoUrl } from '../helper/ingestGithubRepo';
import * as fs from 'fs/promises';
import path from 'path';

interface LASTSYNCTIME {
  githuburl: string;
  branch: string;
  timestamp: number;
}

const LAST_SYNC_FILE = path.resolve(__dirname, '../../data/last_sync_time.json');

async function getLastSyncTime(repo_url: string, branch: string): Promise<number | null> {
  try {
    const content = await fs.readFile(LAST_SYNC_FILE, 'utf-8');
    const data = JSON.parse(content) as LASTSYNCTIME[];
    const record = data.find((e) => e.githuburl === repo_url && e.branch === branch);
    return record ? record.timestamp : null;
  } catch {
    return null;
  }
}

async function updateLastSyncTime(repo_url: string, branch: string): Promise<void> {
  let data: LASTSYNCTIME[] = [];
  try {
    const content = await fs.readFile(LAST_SYNC_FILE, 'utf-8');
    data = JSON.parse(content);
  } catch {
    data = [];
  }

  const now = Date.now();
  const index = data.findIndex((e) => e.githuburl === repo_url && e.branch === branch);
  if (index !== -1) {
    data[index].timestamp = now;
  } else {
    data.push({ githuburl: repo_url, branch, timestamp: now });
  }

  await fs.writeFile(LAST_SYNC_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export default async function (ctx: GSContext): Promise<GSStatus> {
  const repos = await loadRepoUrl(); 

  if (!Array.isArray(repos) || repos.length === 0) {
    return new GSStatus(true, 200, undefined, 'No repositories to sync.');
  }

  for (const element of repos) {
    const repoUrl = element?.githuburl || element?.repo_url; // fallback for field naming
    const branch = element?.branch || 'main';

    if (!repoUrl) {
      ctx.logger.warn("Skipping: repo URL missing.");
      continue;
    }

    const now = Date.now();
    const last = await getLastSyncTime(repoUrl, branch);

    if (last !== null && now - last < 24 * 60 * 60 * 1000) {
      ctx.logger.info(`[${repoUrl}@${branch}] Skipping sync: synced within last 24 hours.`);
      continue;
    }

    try {
      ctx.logger.info(`[${repoUrl}@${branch}] Syncing repository...`);
      await ingestChangedFiles(repoUrl, branch);
      await updateLastSyncTime(repoUrl, branch);
      ctx.logger.info(`[${repoUrl}@${branch}] Sync complete.`);
    } catch (err) {
      ctx.logger.error(`[${repoUrl}@${branch}] Sync failed:`, err);
    }
  }

  return new GSStatus(true, 200, undefined, 'Repo sync task completed.');
}
