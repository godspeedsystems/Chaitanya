import { GSContext, GSStatus, logger } from '@godspeedsystems/core';
import { VectorStore } from '../../src/helper/vectorStore';
import { deleteRepoUrl } from '../../src/functions/ingest_github';
import del_repo_files from '../../src/functions/delete_repo_file';

// Mock the dependencies
jest.mock('@godspeedsystems/core', () => ({
  ...jest.requireActual('@godspeedsystems/core'),
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    fatal: jest.fn(),
    trace: jest.fn(),
    child: jest.fn(),
  },
}));
jest.mock('../../src/helper/vectorStore');
jest.mock('../../src/functions/ingest_github');

const makeMockCtx = (id: string): GSContext => ({
    inputs: {
      id: 'test-event-id',
      specversion: '1.0',
      source: '/test',
      type: 'test.event',
      time: new Date(),
      data: {
        params: {
          id,
        },
      },
    },
    logger: logger
  });


describe('del_repo_files', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  // Test Case 1.1: Successful Deletion
  it('should successfully delete the repository file and its metadata', async () => {
    // Setup: Mock the VectorStore and deleteRepoUrl to resolve successfully
    const removeUploadedDocsMock = jest.fn().mockResolvedValue(undefined);
    (VectorStore as jest.Mock).mockImplementation(() => ({
      removeUploadedDocs: removeUploadedDocsMock,
    }));
    (deleteRepoUrl as jest.Mock).mockResolvedValue(undefined);
    const mockCtx = makeMockCtx('test-repo-id');

    // Steps: Call the function
    const result = await del_repo_files(mockCtx);

    // Assertions
    expect(logger.info).toHaveBeenCalledWith('Unique id : ', 'test-repo-id');
    expect(removeUploadedDocsMock).toHaveBeenCalledWith('test-repo-id');
    expect(deleteRepoUrl).toHaveBeenCalledWith('test-repo-id');
    expect(result).toBeInstanceOf(GSStatus);
    expect(result.success).toBe(true);
    expect(result.code).toBe(200);
    expect(result.message).toBe('Successfully deleted file with uniqueId test-repo-id');
  });

  // Test Case 2.1: removeUploadedDocs Fails
  it('should return a 400 error if removeUploadedDocs fails', async () => {
    // Setup: Mock removeUploadedDocs to reject with an error
    const error = new Error('Failed to remove docs');
    const removeUploadedDocsMock = jest.fn().mockRejectedValue(error);
    (VectorStore as jest.Mock).mockImplementation(() => ({
      removeUploadedDocs: removeUploadedDocsMock,
    }));
    const mockCtx = makeMockCtx('test-repo-id');


    // Steps: Call the function
    const result = await del_repo_files(mockCtx);

    // Assertions
    expect(removeUploadedDocsMock).toHaveBeenCalledWith('test-repo-id');
    expect(deleteRepoUrl).not.toHaveBeenCalled();
    expect(result).toBeInstanceOf(GSStatus);
    expect(result.success).toBe(false);
    expect(result.code).toBe(400);
    expect(result.data.error).toBe(error);
  });

  // Test Case 2.2: deleteRepoUrl Fails
  it('should return a 400 error if deleteRepoUrl fails', async () => {
    // Setup: Mock deleteRepoUrl to reject with an error
    const error = new Error('Failed to delete repo URL');
    const removeUploadedDocsMock = jest.fn().mockResolvedValue(undefined);
    (VectorStore as jest.Mock).mockImplementation(() => ({
      removeUploadedDocs: removeUploadedDocsMock,
    }));
    (deleteRepoUrl as jest.Mock).mockRejectedValue(error);
    const mockCtx = makeMockCtx('test-repo-id');


    // Steps: Call the function
    const result = await del_repo_files(mockCtx);

    // Assertions
    expect(removeUploadedDocsMock).toHaveBeenCalledWith('test-repo-id');
    expect(deleteRepoUrl).toHaveBeenCalledWith('test-repo-id');
    expect(result).toBeInstanceOf(GSStatus);
    expect(result.success).toBe(false);
    expect(result.code).toBe(400);
    expect(result.data.error).toBe(error);
  });

  // Test Case 3.1: ID Does Not Exist
  it('should handle the case where the id does not exist', async () => {
    // Setup: Mocks to handle non-existent ID gracefully
    const removeUploadedDocsMock = jest.fn().mockResolvedValue(undefined);
    (VectorStore as jest.Mock).mockImplementation(() => ({
      removeUploadedDocs: removeUploadedDocsMock,
    }));
    (deleteRepoUrl as jest.Mock).mockResolvedValue(undefined);

    const nonExistentCtx = makeMockCtx('non-existent-id');

    // Steps: Call the function
    const result = await del_repo_files(nonExistentCtx);

    // Assertions
    expect(logger.info).toHaveBeenCalledWith('Unique id : ', 'non-existent-id');
    expect(removeUploadedDocsMock).toHaveBeenCalledWith('non-existent-id');
    expect(deleteRepoUrl).toHaveBeenCalledWith('non-existent-id');
    expect(result).toBeInstanceOf(GSStatus);
    expect(result.success).toBe(true);
    expect(result.code).toBe(200);
  });
});