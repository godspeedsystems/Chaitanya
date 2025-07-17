import { GSContext, GSStatus } from '@godspeedsystems/core';
import uploadDocsFn from '../../src/functions/upload_docs_fn';
import { ingestUploadedFile } from '../../src/helper/ingestGithubRepo';
import { VectorStore } from '../../src/helper/vectorStore';
import { promises as fs } from 'fs';
import path from 'path';

jest.mock('../../src/helper/ingestGithubRepo', () => ({
  ingestUploadedFile: jest.fn(),
}));

jest.mock('../../src/helper/vectorStore', () => ({
  VectorStore: jest.fn().mockImplementation(() => ({})),
}));

const mockedIngestUploadedFile = ingestUploadedFile as jest.Mock;
const MockedVectorStore = VectorStore as jest.Mock;

describe('upload_docs_fn', () => {
  let ctx: GSContext;
  let accessSpy: jest.SpyInstance;
  let readFileSpy: jest.SpyInstance;
  let writeFileSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    accessSpy = jest.spyOn(fs, 'access').mockResolvedValue(undefined as any);
    readFileSpy = jest.spyOn(fs, 'readFile');
    writeFileSpy = jest.spyOn(fs, 'writeFile').mockResolvedValue(undefined as any);
      ctx = {
        inputs: {
          data: {
            files: {
              files: [],
            },
            body: {
              metadata: '{}',
            },
          },
        },
        logger: {
          info: jest.fn(),
          error: jest.fn(),
          warn: jest.fn(),
          debug: jest.fn(),
        },
      } as unknown as GSContext;
    });
  
    // Test Case 1.1: Happy Path - Single File Upload
    test('should process a single valid file successfully', async () => {
      const file = {
        tempFilePath: '/tmp/testfile-123',
        name: 'test.txt',
        data: Buffer.from('test content'),
      };
      ctx.inputs.data.files.files = [file];
      ctx.inputs.data.body.metadata = '{}';
  
      readFileSpy.mockResolvedValueOnce(Buffer.from('test content'));
      readFileSpy.mockResolvedValueOnce('[]');
      mockedIngestUploadedFile.mockResolvedValue('Successfully ingested file');
  
      const result = await uploadDocsFn(ctx);
  
      expect(result).toBeInstanceOf(GSStatus);
      expect(result.success).toBe(true);
      expect(result.code).toBe(200);
      expect(mockedIngestUploadedFile).toHaveBeenCalledTimes(1);
      expect(writeFileSpy).toHaveBeenCalledTimes(1);
      expect(result.data.processedFiles[0].message).toBe('Successfully ingested file');
    });
  
    // Test Case 1.2: Happy Path - Multiple File Uploads
    test('should process multiple valid files successfully', async () => {
      const files = [
        { tempFilePath: '/tmp/file1-123', name: 'file1.txt', data: Buffer.from('content1') },
        { tempFilePath: '/tmp/file2-456', name: 'file2.txt', data: Buffer.from('content2') },
      ];
      ctx.inputs.data.files.files = files;
  
      readFileSpy.mockResolvedValueOnce(Buffer.from('content1'));
      readFileSpy.mockResolvedValueOnce(Buffer.from('content2'));
      readFileSpy.mockResolvedValueOnce('[]');
      mockedIngestUploadedFile.mockResolvedValue('Successfully ingested file');
  
      const result = await uploadDocsFn(ctx);
  
      expect(result.success).toBe(true);
      expect(result.code).toBe(200);
      expect(mockedIngestUploadedFile).toHaveBeenCalledTimes(2);
      expect(writeFileSpy).toHaveBeenCalledTimes(1);
      expect(result.data.message).toContain('2 files');
    });
  
    // Test Case 1.3: Edge Case - File with Metadata
    test('should process a file with associated metadata', async () => {
      const file = { tempFilePath: '/tmp/file1-123', name: 'file1.txt', data: Buffer.from('content1') };
      const metadata = [{ custom: 'value' }];
      ctx.inputs.data.files.files = [file];
      ctx.inputs.data.body.metadata = JSON.stringify(metadata);
  
      readFileSpy.mockResolvedValueOnce(Buffer.from('content1'));
      readFileSpy.mockResolvedValueOnce('[]');
      mockedIngestUploadedFile.mockResolvedValue('Success');
  
      await uploadDocsFn(ctx);
  
      expect(writeFileSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"custom": "value"')
      );
    });
  
    // Test Case 2.1: No Files Uploaded
    test('should return a 400 error if no files are uploaded', async () => {
      ctx.inputs.data.files.files = [];
  
      const result = await uploadDocsFn(ctx);
  
      expect(result.success).toBe(false);
      expect(result.code).toBe(400);
      expect(result.data.error).toBe('No files found in upload');
    });
  
    // Test Case 2.2: Invalid Metadata Format
    test('should return a 400 error for invalid metadata JSON', async () => {
      const file = { tempFilePath: '/tmp/file1-123', name: 'file1.txt', data: Buffer.from('content1') };
      ctx.inputs.data.files.files = [file];
      ctx.inputs.data.body.metadata = 'invalid-json';
  
      const result = await uploadDocsFn(ctx);
  
      expect(result.success).toBe(false);
      expect(result.code).toBe(400);
      expect(result.data.error).toContain('Invalid metadata format');
    });
  
    // Test Case 2.3: ingestUploadedFile Fails
    test('should return a 500 error if ingestUploadedFile throws an exception', async () => {
      const file = { tempFilePath: '/tmp/file1-123', name: 'file1.txt', data: Buffer.from('content1') };
      ctx.inputs.data.files.files = [file];
  
      readFileSpy.mockResolvedValue(Buffer.from('content'));
      mockedIngestUploadedFile.mockRejectedValue(new Error('Ingest failed'));
  
      const result = await uploadDocsFn(ctx);
  
      expect(result.success).toBe(false);
      expect(result.code).toBe(500);
      expect(result.data).toBe('Failed to parse and ingest multipart documents');
    });
  
    // Test Case 2.4: Filesystem Errors
    test('should handle filesystem errors gracefully', async () => {
      const file = { tempFilePath: '/tmp/file1-123', name: 'file1.txt', data: Buffer.from('content1') };
      ctx.inputs.data.files.files = [file];
  
      readFileSpy.mockResolvedValue(Buffer.from('content'));
      mockedIngestUploadedFile.mockResolvedValue('Success');
      writeFileSpy.mockRejectedValue(new Error('Disk full'));
  
      const result = await uploadDocsFn(ctx);
  
      expect(result.success).toBe(false);
      expect(result.code).toBe(500);
      expect(ctx.logger.error).toHaveBeenCalledWith(
        'Error processing multipart files:',
        expect.any(Error)
      );
    });
  
    // Test Case 3.1: VectorStore Initialization
    test('should initialize VectorStore correctly', async () => {
      const file = { tempFilePath: '/tmp/file1-123', name: 'file1.txt', data: Buffer.from('content1') };
      ctx.inputs.data.files.files = [file];
  
      readFileSpy.mockResolvedValue(Buffer.from('content'));
      mockedIngestUploadedFile.mockResolvedValue('Success');
  
      await uploadDocsFn(ctx);
  
      expect(MockedVectorStore).toHaveBeenCalledTimes(1);
    });
  
    // Test Case 2.5: Unsupported File Type
    test('should return a success message but indicate an unsupported file type', async () => {
      const file = { tempFilePath: '/tmp/file1-123', name: 'archive.zip', data: Buffer.from('zipcontent') };
      ctx.inputs.data.files.files = [file];
  
      readFileSpy.mockResolvedValue(Buffer.from('zipcontent'));
      mockedIngestUploadedFile.mockResolvedValue('Unsupported file type: .zip');
  
      const result = await uploadDocsFn(ctx);
  
      expect(result.success).toBe(true);
      expect(result.code).toBe(200);
      expect(result.data.processedFiles[0].message).toBe('Unsupported file type: .zip');
    });
  
    // Test Case 2.6: Duplicate docUniqueId
    test('should overwrite existing metadata on duplicate docUniqueId', async () => {
      const existingMetadata = [{
        fileName: 'old.txt',
        fileSize: 10,
        uniqueID: '123',
        uploadedAt: '2023-01-01T00:00:00.000Z'
      }];
      const file = { tempFilePath: '/tmp/newfile-123', name: 'new.txt', data: Buffer.from('new content') };
      ctx.inputs.data.files.files = [file];
  
      readFileSpy.mockResolvedValueOnce(Buffer.from('new content'));
      readFileSpy.mockResolvedValueOnce(JSON.stringify(existingMetadata));
      mockedIngestUploadedFile.mockResolvedValue('Success');
  
      await uploadDocsFn(ctx);
  
      expect(writeFileSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"fileName": "new.txt"')
      );
      expect(writeFileSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.not.stringContaining('"fileName": "old.txt"')
      );
    });
  });