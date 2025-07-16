import { GSContext, GSStatus, logger } from '@godspeedsystems/core';
import * as fs from 'fs/promises';
import * as path from 'path';

// const REPO_METADATA_PATH = path.resolve(__dirname, '../../data/repoData.json');
const REPO_URL_JSON = path.resolve(__dirname, '../../data/repo_url.json');
interface RepoMeta {
  repouniqueid: string;
  repoUrl: string;
  branch: string;
}

export default async function get_metadata(ctx: GSContext): Promise<GSStatus> {
  let repometa: RepoMeta[] = [];
  try {
    const repoData = await fs.readFile(REPO_URL_JSON, 'utf-8');
    repometa = JSON.parse(repoData);
    return new GSStatus(true, 200, 'Success', repometa);
  } catch (err) {
    logger.warn(
      'repo_metadata.json not found or invalid, returning empty array.',
    );
    // return new GSStatus(false, 400, 'Repo Metadata file not found', {
    //   error: err,
    // });
    return new GSStatus(true, 200, 'Success', repometa);
  }
}
