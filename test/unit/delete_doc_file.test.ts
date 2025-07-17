import { GSContext, GSStatus } from '@godspeedsystems/core';
import { VectorStore } from '../../src/helper/vectorStore';
import { deleteFileMetadata } from '../../src/functions/upload_docs_fn';
import deleteDocFile from '../../src/functions/delete_doc_file';

// Mock the dependencies
jest.mock('../../src/helper/vectorStore');
jest.mock('../../src/functions/upload_docs_fn');

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
};

// Define a base mock context
const mockContext: GSContext = {
  inputs: {
    data: {
      params: {
        id: 'test-id',
      },
    },
  },
  logger: mockLogger,
};

describe('delete_doc_file', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  // Test Case 1.1: Happy Path
  it('should delete the document and its metadata successfully', async () => {
    // Setup
    const mockRemoveUploadedDocs = jest.fn().mockResolvedValue(undefined);
    (VectorStore as jest.Mock).mockImplementation(() => ({
      removeUploadedDocs: mockRemoveUploadedDocs,
    }));
    (deleteFileMetadata as jest.Mock).mockResolvedValue(undefined);

    // Steps
    const result = await deleteDocFile(mockContext);

    // Assertions
    expect(mockRemoveUploadedDocs).toHaveBeenCalledWith('test-id');
    expect(deleteFileMetadata).toHaveBeenCalledWith('test-id');
    expect(result).toBeInstanceOf(GSStatus);
    expect(result.success).toBe(true);
    expect(result.code).toBe(200);
    expect(result.message).toBe('Successfully deleted file with uniqueId test-id');
  });

  // Test Case 2.1: VectorStore Deletion Fails
  it('should return a 400 error if VectorStore fails to delete the document', async () => {
    // Setup
    const deletionError = new Error('VectorStore deletion failed');
    const mockRemoveUploadedDocs = jest.fn().mockRejectedValue(deletionError);
    (VectorStore as jest.Mock).mockImplementation(() => ({
      removeUploadedDocs: mockRemoveUploadedDocs,
    }));

    // Steps
    const result = await deleteDocFile(mockContext);

    // Assertions
    expect(mockRemoveUploadedDocs).toHaveBeenCalledWith('test-id');
    expect(deleteFileMetadata).not.toHaveBeenCalled();
    expect(result).toBeInstanceOf(GSStatus);
    expect(result.success).toBe(false);
    expect(result.code).toBe(400);
    expect(result.data?.error).toEqual(deletionError);
  });

  // Test Case 2.2: Metadata Deletion Fails
  it('should return a 400 error if metadata deletion fails', async () => {
    // Setup
    const metadataError = new Error('Metadata deletion failed');
    const mockRemoveUploadedDocs = jest.fn().mockResolvedValue(undefined);
    (VectorStore as jest.Mock).mockImplementation(() => ({
      removeUploadedDocs: mockRemoveUploadedDocs,
    }));
    (deleteFileMetadata as jest.Mock).mockRejectedValue(metadataError);

    // Steps
    const result = await deleteDocFile(mockContext);

    // Assertions
    expect(mockRemoveUploadedDocs).toHaveBeenCalledWith('test-id');
    expect(deleteFileMetadata).toHaveBeenCalledWith('test-id');
    expect(result).toBeInstanceOf(GSStatus);
    expect(result.success).toBe(false);
    expect(result.code).toBe(400);
    expect(result.data?.error).toEqual(metadataError);
  });
});