import { GSContext, GSStatus, logger } from '@godspeedsystems/core';
import ingestGithub from '../../src/functions/ingest_github';
import * as ingestGithubRepo from '../../src/helper/ingestGithubRepo';
import * as fs from 'fs/promises';

// Mock the logger from @godspeedsystems/core
jest.mock('@godspeedsystems/core', () => ({
  ...jest.requireActual('@godspeedsystems/core'),
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  GSStatus: jest.requireActual('@godspeedsystems/core').GSStatus,
}));

// Mock the helper module
jest.mock('../../src/helper/ingestGithubRepo', () => ({
  ingestChangedFiles: jest.fn(),
}));

// Mock the fs/promises module
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));

describe('ingest_github', () => {
  let ctx: GSContext;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Default mock context
    ctx = {
      inputs: {
        data: {
          body: {
            id: 'test-repo-id',
            github_url: 'https://github.com/test/repo',
            branch: 'main',
          },
        },
      },
    } as any;
  });

  // Test Case 1.1: Happy Path
  it('should return a 200 status and success message when a valid GitHub URL and branch are provided', async () => {
    // Setup: Mock successful resolutions
    (ingestGithubRepo.ingestChangedFiles as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.readFile as jest.Mock).mockResolvedValue('[]');

    // Steps: Call the function
    const result = await ingestGithub(ctx);

    // Assertions
    expect(ingestGithubRepo.ingestChangedFiles).toHaveBeenCalledWith(
      'https://github.com/test/repo',
      'main',
      'test-repo-id'
    );
    expect(fs.writeFile).toHaveBeenCalled();
    expect(result).toBeInstanceOf(GSStatus);
    expect(result.success).toBe(true);
    expect(result.code).toBe(200);
    // The message is in the 'data' property when meta is used in the constructor
    expect((result as any).data.message).toBe('GitHub repo info saved');
  });

  // Test Case 2.1: Missing github_url
  it('should return a 400 status and an error message when github_url is missing', async () => {
    // Setup: Invalidate context
    delete ctx.inputs.data.body.github_url;

    // Steps: Call the function
    const result = await ingestGithub(ctx);

    // Assertions
    expect(result).toBeInstanceOf(GSStatus);
    expect(result.success).toBe(false);
    expect(result.code).toBe(400);
    expect((result as any).data.message).toBe('github_url and branch are required');
  });

  // Test Case 2.2: Missing branch
  it('should return a 400 status and an error message when branch is missing', async () => {
    // Setup: Invalidate context
    delete ctx.inputs.data.body.branch;

    // Steps: Call the function
    const result = await ingestGithub(ctx);

    // Assertions
    expect(result).toBeInstanceOf(GSStatus);
    expect(result.success).toBe(false);
    expect(result.code).toBe(400);
    expect((result as any).data.message).toBe('github_url and branch are required');
  });

  // Test Case 3.1: ingestChangedFiles throws an error
  it('should return a 500 status and an error message when ingestChangedFiles throws an error', async () => {
    // Setup: Mock rejection
    const errorMessage = 'Failed to clone repo';
    (ingestGithubRepo.ingestChangedFiles as jest.Mock).mockRejectedValue(new Error(errorMessage));

    // Steps: Call the function
    const result = await ingestGithub(ctx);

    // Assertions
    expect(result).toBeInstanceOf(GSStatus);
    expect(result.success).toBe(false);
    expect(result.code).toBe(500);
    expect((result as any).data.message).toContain('Failed to ingest GitHub repo:');
    expect((result as any).data.message).toContain(errorMessage);
  });

  // Test Case 3.2: saveRepoUrl throws an error
  it('should return a 200 status but log an error when saveRepoUrl throws an error', async () => {
    // Setup: Mock successful ingestChangedFiles and failing writeFile for saveRepoUrl
    const errorMessage = 'Disk full';
    (ingestGithubRepo.ingestChangedFiles as jest.Mock).mockResolvedValue(undefined);
    (fs.readFile as jest.Mock).mockResolvedValue('[]');
    (fs.writeFile as jest.Mock).mockRejectedValue(new Error(errorMessage));

    // Steps: Call the function
    const result = await ingestGithub(ctx);

    // Assertions for the actual behavior (error is swallowed and logged)
    expect(result).toBeInstanceOf(GSStatus);
    expect(result.success).toBe(true); // The function succeeds as the error is caught internally
    expect(result.code).toBe(200);
    expect((result as any).data.message).toBe('GitHub repo info saved');
    
    // Verify that the internal error was logged
    expect(logger.error).toHaveBeenCalledWith(
      '[ERROR] Failed to save repo URL:',
      expect.any(Error)
    );
  });
});