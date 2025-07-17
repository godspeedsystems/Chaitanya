import { GSContext, GSStatus } from '@godspeedsystems/core';
import get_upload_metadata from '../../src/functions/get_doc_meta';
import * as fs from 'fs/promises';

// Mock the fs/promises module
jest.mock('fs/promises');

describe('get_upload_metadata', () => {
    let mockCtx: GSContext;

    beforeEach(() => {
        mockCtx = {
            logger: {
                info: jest.fn(),
                debug: jest.fn(),
                error: jest.fn(),
                warn: jest.fn(),
            },
            datasources: {},
            inputs: {
                params: {},
                body: {},
                headers: {},
                query: {}
            }
        } as unknown as GSContext;
    });

  // Test Case 1.1: Happy Path - Metadata File Exists and is Valid
  it('should return the metadata of uploaded documents when the metadata file exists and is valid', async () => {
    // Setup: Create a dummy docData.json content
    const dummyData = [
      {
        fileName: 'test.pdf',
        fileSize: 12345,
        uniqueID: 'unique-id-123',
        uploadedAt: new Date().toISOString(),
      },
    ];
    const dummyJson = JSON.stringify(dummyData);

    // Mock fs.readFile to resolve with the dummy data
    (fs.readFile as jest.Mock).mockResolvedValue(dummyJson);

    // Execute the function
    const result = await get_upload_metadata(mockCtx);

    // Assertions
    expect(result).toBeInstanceOf(GSStatus);
    expect(result.success).toBe(true);
    expect(result.code).toBe(200);
    expect(result.data).toEqual(dummyData);
  });

  // Test Case 1.2: Edge Case - Metadata File is Empty
  it('should return an empty array when the metadata file is empty', async () => {
    // Setup: Mock fs.readFile to resolve with an empty string
    (fs.readFile as jest.Mock).mockResolvedValue('[]');

    // Execute the function
    const result = await get_upload_metadata(mockCtx);

    // Assertions
    expect(result).toBeInstanceOf(GSStatus);
    expect(result.success).toBe(true);
    expect(result.code).toBe(200);
    expect(result.data).toEqual([]);
  });

  // Test Case 2.1: Error Handling - Metadata File Not Found
  it('should return an empty array when the metadata file is not found', async () => {
    // Setup: Mock fs.readFile to reject with an error
    (fs.readFile as jest.Mock).mockRejectedValue(new Error('ENOENT: no such file or directory'));

    // Execute the function
    const result = await get_upload_metadata(mockCtx);

    // Assertions
    expect(result).toBeInstanceOf(GSStatus);
    expect(result.success).toBe(true);
    expect(result.code).toBe(200);
    expect(result.data).toEqual([]);
  });
});