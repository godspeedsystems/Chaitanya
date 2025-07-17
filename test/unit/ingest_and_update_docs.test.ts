import { GSContext, GSStatus } from '@godspeedsystems/core';
import ingest_and_update_docs from '../../src/functions/ingest_and_update_docs';
import * as ingestGithubRepo from '../../src/helper/ingestGithubRepo';
import * as fs from 'fs/promises';

// Mock the modules
jest.mock('../../src/helper/ingestGithubRepo', () => ({
  ...jest.requireActual('../../src/helper/ingestGithubRepo'),
  loadRepoUrl: jest.fn(),
  ingestChangedFiles: jest.fn(),
}));
jest.mock('fs/promises');

const mockFs = fs as jest.Mocked<typeof fs>;

// Mock context
const mockCtx = {
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
} as unknown as GSContext;

describe('ingest_and_update_docs', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('1. Core Functionality', () => {
    test('1.1: should sync a repository if it has not been synced in the last 24 hours', async () => {
      // Setup: Mock dependencies for the happy path
      const repo = { repouniqueid: '1', githuburl: 'https://github.com/test/repo', branch: 'main' };
      (ingestGithubRepo.loadRepoUrl as jest.Mock).mockResolvedValue([repo]);
      (ingestGithubRepo.ingestChangedFiles as jest.Mock).mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify([{ ...repo, timestamp: Date.now() - 25 * 60 * 60 * 1000 }]));
      mockFs.writeFile.mockResolvedValue(undefined);

      // Steps: Call the function
      const result = await ingest_and_update_docs(mockCtx);

      // Assertions
      expect(ingestGithubRepo.loadRepoUrl).toHaveBeenCalledTimes(1);
      expect(mockFs.readFile).toHaveBeenCalledTimes(2); // Called by getLastSyncTime and updateLastSyncTime
      expect(ingestGithubRepo.ingestChangedFiles).toHaveBeenCalledWith(repo.githuburl, repo.branch, repo.repouniqueid);
      expect(mockFs.writeFile).toHaveBeenCalledTimes(1);
      expect(result).toBeInstanceOf(GSStatus);
      expect(result).toEqual(new GSStatus(true, 200, undefined, 'Repo sync task completed.'));
    });

    test('1.2: should skip syncing a repository if it has been synced within the last 24 hours', async () => {
      // Setup: Mock dependencies for the skipping scenario
      const repo = { repouniqueid: '1', githuburl: 'https://github.com/test/repo', branch: 'main' };
      (ingestGithubRepo.loadRepoUrl as jest.Mock).mockResolvedValue([repo]);
      mockFs.readFile.mockResolvedValue(JSON.stringify([{ ...repo, timestamp: Date.now() - 1 * 60 * 60 * 1000 }]));

      // Steps: Call the function
      await ingest_and_update_docs(mockCtx);

      // Assertions
      expect(mockFs.readFile).toHaveBeenCalledTimes(1); // Only for getLastSyncTime
      expect(ingestGithubRepo.ingestChangedFiles).not.toHaveBeenCalled();
      expect(mockFs.writeFile).not.toHaveBeenCalled(); // updateLastSyncTime should not be called
      expect(mockCtx.logger.info).toHaveBeenCalledWith(
        `[${repo.githuburl}@${repo.branch}] Skipping sync: synced within last 24 hours.`,
      );
    });
  });

  describe('2. Edge Cases', () => {
    test('2.1: should return a success message when loadRepoUrl returns an empty array', async () => {
      // Setup: Mock loadRepoUrl to return an empty array
      (ingestGithubRepo.loadRepoUrl as jest.Mock).mockResolvedValue([]);

      // Steps: Call the function
      const result = await ingest_and_update_docs(mockCtx);

      // Assertions
      expect(ingestGithubRepo.ingestChangedFiles).not.toHaveBeenCalled();
      expect(result).toBeInstanceOf(GSStatus);
      expect(result).toEqual(new GSStatus(true, 200, undefined, 'No repositories to sync.'));
    });

    test('2.2: should skip a repository if its URL is missing', async () => {
      // Setup: Mock loadRepoUrl to return an object without a URL
      const repo = { repouniqueid: '1', branch: 'main' }; // Missing githuburl
      (ingestGithubRepo.loadRepoUrl as jest.Mock).mockResolvedValue([repo]);

      // Steps: Call the function
      await ingest_and_update_docs(mockCtx);

      // Assertions
      expect(mockCtx.logger.warn).toHaveBeenCalledWith('Skipping: repo URL missing.');
      expect(mockFs.readFile).not.toHaveBeenCalled();
      expect(ingestGithubRepo.ingestChangedFiles).not.toHaveBeenCalled();
      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('3. Error Handling', () => {
    test('3.1: should log an error and continue to the next repo if ingestChangedFiles fails', async () => {
      // Setup: Mock two repos, with the first one failing on ingest
      const repo1 = { repouniqueid: '1', githuburl: 'https://github.com/fail/repo', branch: 'main' };
      const repo2 = { repouniqueid: '2', githuburl: 'https://github.com/success/repo', branch: 'main' };
      (ingestGithubRepo.loadRepoUrl as jest.Mock).mockResolvedValue([repo1, repo2]);
      mockFs.readFile.mockResolvedValue('[]'); // No previous syncs
      const error = new Error('Ingestion failed');
      (ingestGithubRepo.ingestChangedFiles as jest.Mock)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(undefined);

      // Steps: Call the function
      await ingest_and_update_docs(mockCtx);

      // Assertions
      expect(ingestGithubRepo.ingestChangedFiles).toHaveBeenCalledTimes(2);
      expect(mockCtx.logger.error).toHaveBeenCalledWith(`[${repo1.githuburl}@${repo1.branch}] Sync failed:`, error);
      expect(mockFs.writeFile).toHaveBeenCalledTimes(1); // Only for the successful sync
    });

    test('3.2: should proceed with sync if reading last_sync_time.json fails', async () => {
      // Setup: Mock readFile to throw an error for getLastSyncTime
      const repo = { repouniqueid: '1', githuburl: 'https://github.com/test/repo', branch: 'main' };
      (ingestGithubRepo.loadRepoUrl as jest.Mock).mockResolvedValue([repo]);
      mockFs.readFile.mockRejectedValueOnce(new Error('File not found')); // For getLastSyncTime
      mockFs.readFile.mockResolvedValueOnce('[]'); // For updateLastSyncTime
      (ingestGithubRepo.ingestChangedFiles as jest.Mock).mockResolvedValue(undefined);

      // Steps: Call the function
      await ingest_and_update_docs(mockCtx);

      // Assertions
      expect(ingestGithubRepo.ingestChangedFiles).toHaveBeenCalledWith(repo.githuburl, repo.branch, repo.repouniqueid);
      expect(mockFs.writeFile).toHaveBeenCalledTimes(1);
    });
  });
});