import { GSContext, GSStatus } from '@godspeedsystems/core';
import { ingestChangedFiles, loadRepoUrl } from '../helper/ingestGithubRepo';

export default async function (ctx: GSContext): Promise<GSStatus> {
  const {
    inputs: {
      data: { params },
    },
  } = ctx;
  const { id } = params;

  if (!id) {
    return new GSStatus(false, 400, 'Repository ID is required.');
  }

  try {
    const repos = await loadRepoUrl();
    const repoToSync = repos.find((repo: any) => repo.repouniqueid === id);

    if (!repoToSync) {
      return new GSStatus(false, 404, `Repository with ID ${id} not found.`);
    }

    const { repouniqueid ,repoUrl, branch} = repoToSync;

    ctx.logger.info(`[${repoUrl}@${branch}] Starting manual sync...`);
    await ingestChangedFiles(repoUrl, branch, repouniqueid);
    ctx.logger.info(`[${repoUrl}@${branch}] Manual sync complete.`);

    return new GSStatus(true, 200, `Repository with ID ${id} synced successfully.`);
  } catch (error: any) {
    ctx.logger.error(`Error syncing repository with ID ${id}:`, error);
    return new GSStatus(false, 500, 'Failed to sync repository.');
  }
}