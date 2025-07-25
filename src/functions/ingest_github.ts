import { GSContext, GSStatus, logger } from '@godspeedsystems/core';
import path from 'path';
import * as fs from 'fs/promises';
import { ingestChangedFiles } from '../helper/ingestGithubRepo';

interface GITHUBOBJECT {
  repouniqueid: string;
  repoUrl: string;
  branch: string;
}

interface GITHUBCOMMIT {
  repouniqueid?: string;
  owner?: string;
  repo?: string;
  branch?: string;
  commit?: string;
}

interface LASTSYNCTIME {
  repouniqueid: string;
  githuburl: string;
  branch: string;
  timestamp: number;
}

const REPO_URL_FILE = path.resolve(__dirname, '../../data/repo_url.json');
const COMMIT_FILE = path.resolve(__dirname, '../../data/last_commit.json');
const LAST_SYNC_FILE = path.resolve(__dirname,'../../data/last_sync_time.json');

export async function deletecommit(id : string): Promise<void> {
  try {
    let parsed: GITHUBCOMMIT[] = [];

    try {
      const data = await fs.readFile(COMMIT_FILE, 'utf-8');
      parsed = JSON.parse(data);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }

    const newcommitList = parsed.filter(
      (entry) => entry.repouniqueid !== id,
    );

    if (newcommitList.length === parsed.length) {
      logger.warn(`No entry found for fileID: ${id}`);
    }

    await fs.writeFile(COMMIT_FILE, JSON.stringify(newcommitList, null, 2), 'utf-8');
    logger.info(`[INFO] Repo info deleted with id: ${id}`);
  } catch (error) {
    logger.error(`[ERROR] Failed to delete repo URL:`, error);
  }
}

export async function deletesync(id : string): Promise<void> {
  try {
    let parsed: LASTSYNCTIME[] = [];

    try {
      const data = await fs.readFile(LAST_SYNC_FILE, 'utf-8');
      parsed = JSON.parse(data);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }

    const newsyncList = parsed.filter(
      (entry) => entry.repouniqueid !== id,
    );

    if (newsyncList.length === parsed.length) {
      logger.warn(`No entry found for fileID: ${id}`);
    }

    await fs.writeFile(LAST_SYNC_FILE, JSON.stringify(newsyncList, null, 2), 'utf-8');
    logger.info(`[INFO] Repo info deleted with id: ${id}`);
  } catch (error) {
    logger.error(`[ERROR] Failed to delete repo URL:`, error);
  }
}

export async function deleteRepoUrl(id : string): Promise<void> {
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

    const newMetadataList = parsed.filter(
      (entry) => entry.repouniqueid !== id,
    );

    if (newMetadataList.length === parsed.length) {
      logger.warn(`No entry found for fileID: ${id}`);
    }

    await fs.writeFile(REPO_URL_FILE, JSON.stringify(newMetadataList, null, 2), 'utf-8');
    logger.info(`[INFO] Repo info deleted with id: ${id}`);
  } catch (error) {
    logger.error(`[ERROR] Failed to delete repo URL:`, error);
  }
}

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

    const index = parsed.findIndex(
      (p) => p.repoUrl === gitobj.repoUrl && p.branch === gitobj.branch,
    );
    if (index !== -1) {
      parsed[index] = gitobj;
    } else {
      parsed.push(gitobj);
    }

    await fs.writeFile(REPO_URL_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
    logger.info(`[INFO] Repo info saved: ${gitobj.repoUrl}@${gitobj.branch}`);
  } catch (error) {
    logger.error(`[ERROR] Failed to save repo URL:`, error);
  }
}

export default async function (ctx: GSContext): Promise<GSStatus> {
  const repouniqueid = ctx.inputs.data.body.id;
  const repoUrl = ctx.inputs.data.body.github_url;
  const branch = ctx.inputs.data.body.branch;

  if (!repoUrl || !branch) {
    return new GSStatus(false, 400, undefined, {
      message: 'github_url and branch are required',
    });
  }

  try {
    // Step 2: Trigger ingestion from GitHub immediately
    await ingestChangedFiles(repoUrl, branch,repouniqueid);
    await saveRepoUrl({ repouniqueid,repoUrl, branch });
  } catch (e) {
    logger.error(`[ERROR] Failed to ingest repo content:`, e);
    return new GSStatus(false, 500, undefined, {
      id: repouniqueid,
      message: `Failed to ingest GitHub repo: ${(e as Error).message}`,
    });
  }

  return new GSStatus(true, 200, undefined, {
    id: repouniqueid,
    message: 'GitHub repo info saved',
  });
}
