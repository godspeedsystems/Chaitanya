import { GSContext, GSStatus, logger } from '@godspeedsystems/core';
import get_metadata from '../../src/functions/get_repo_meta';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock the logger to spy on its methods
jest.mock('@godspeedsystems/core', () => ({
  GSStatus: jest.requireActual('@godspeedsystems/core').GSStatus,
  logger: {
    warn: jest.fn(),
  },
}));

// Mock the fs/promises module
jest.mock('fs/promises');

const mockedFs = fs as jest.Mocked<typeof fs>;
const REPO_URL_JSON = path.resolve(__dirname, '../../data/repo_url.json');

describe('get_metadata', () => {
  let mockCtx: GSContext;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Define a mock context for the function
    mockCtx = {} as GSContext;
  });

  // Test case 1: Should return repo metadata when repo_url.json exists and is valid
  test('should return repo metadata when repo_url.json exists and is valid', async () => {
    // Sample valid repository metadata
    const sampleRepoMeta = [
      {
        repouniqueid: '123',
        repoUrl: 'http://example.com/repo',
        branch: 'main',
      },
    ];
    // Mock fs.readFile to resolve with the stringified sample data
    mockedFs.readFile.mockResolvedValue(JSON.stringify(sampleRepoMeta));

    // Call the function with the mock context
    const result = await get_metadata(mockCtx);

    // Assertions
    expect(result).toBeInstanceOf(GSStatus);
    expect(result.success).toBe(true);
    expect(result.code).toBe(200);
    expect(result.data).toEqual(sampleRepoMeta);
    // Verify that fs.readFile was called with the correct path
    expect(mockedFs.readFile).toHaveBeenCalledWith(REPO_URL_JSON, 'utf-8');
    expect(mockedFs.readFile).toHaveBeenCalledTimes(1);
  });

  // Test case 2: Should return an empty array when repo_url.json does not exist
  test('should return an empty array when repo_url.json does not exist', async () => {
    // Mock fs.readFile to reject with a "file not found" error
    mockedFs.readFile.mockRejectedValue(new Error('ENOENT: no such file or directory'));

    // Call the function with the mock context
    const result = await get_metadata(mockCtx);

    // Assertions
    expect(result).toBeInstanceOf(GSStatus);
    expect(result.success).toBe(true);
    expect(result.code).toBe(200);
    expect(result.data).toEqual([]);
    // Verify that logger.warn was called with the expected message
    expect(logger.warn).toHaveBeenCalledWith('repo_metadata.json not found or invalid, returning empty array.');
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  // Test case 3: Should return an empty array when repo_url.json contains invalid JSON
  test('should return an empty array when repo_url.json contains invalid JSON', async () => {
    // Mock fs.readFile to resolve with an invalid JSON string
    mockedFs.readFile.mockResolvedValue('{invalid-json}');

    // Call the function with the mock context
    const result = await get_metadata(mockCtx);

    // Assertions
    expect(result).toBeInstanceOf(GSStatus);
    expect(result.success).toBe(true);
    expect(result.code).toBe(200);
    expect(result.data).toEqual([]);
    // Verify that logger.warn was called with the expected message
    expect(logger.warn).toHaveBeenCalledWith('repo_metadata.json not found or invalid, returning empty array.');
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});