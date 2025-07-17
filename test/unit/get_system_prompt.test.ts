import { GSContext, GSStatus } from '@godspeedsystems/core';
import { promises as fs } from 'fs';
import path from 'path';
import getSystemPrompt from '../../src/functions/get_system_prompt';

describe('get_system_prompt', () => {
  // Create a mock GSContext object for testing
  const mockCtx = {} as GSContext;

  // Use spies to mock dependencies
  let readFileSpy: jest.SpyInstance;
  let cwdSpy: jest.SpyInstance;

  beforeEach(() => {
    // Spy on fs.promises.readFile before each test
    readFileSpy = jest.spyOn(fs, 'readFile');
    // Spy on process.cwd() to make the test platform-independent
    cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue('/fake/dir');
  });

  afterEach(() => {
    // Restore the original implementations after each test
    readFileSpy.mockRestore();
    cwdSpy.mockRestore();
  });

  // Test Case 1.1
  it('should return the system prompts when the file exists and is valid JSON', async () => {
    // Define the mock prompt data
    const mockPrompts = {
      core_system_prompt: 'You are a helpful assistant.',
      tool_knowledge_prompt: 'You have access to a variety of tools.',
    };
    // Mock the file content
    const mockFileContent = JSON.stringify(mockPrompts);
    // Configure the spy to resolve with the file content
    readFileSpy.mockResolvedValue(mockFileContent);

    // Execute the function
    const result = await getSystemPrompt(mockCtx);

    // Define the expected path using the mocked cwd
    const expectedPath = path.join('/fake/dir', 'data/system_prompt.json');
    // Assert that the spy was called with the correct path
    expect(readFileSpy).toHaveBeenCalledWith(expectedPath, 'utf-8');
    // Assert that the result is a GSStatus object
    expect(result).toBeInstanceOf(GSStatus);
    // Assert that the status is true and the code is 200
    expect(result.success).toBe(true);
    expect(result.code).toBe(200);
    // Assert that the data matches the mock prompts
    expect(result.data).toEqual(mockPrompts);
  });

  // Test Case 2.1
  it('should throw an error when the file does not exist', async () => {
    // Create a mock error
    const mockError = new Error('ENOENT: no such file or directory');
    // Configure the spy to reject with the error
    readFileSpy.mockRejectedValue(mockError);

    // Assert that the function call rejects with the expected error
    await expect(getSystemPrompt(mockCtx)).rejects.toThrow('ENOENT: no such file or directory');
  });

  // Test Case 2.2
  it('should throw an error when the file content is not valid JSON', async () => {
    // Define invalid JSON content
    const invalidJson = '{"key": "value"';
    // Configure the spy to resolve with the invalid JSON
    readFileSpy.mockResolvedValue(invalidJson);

    // Assert that the function call rejects with a SyntaxError
    await expect(getSystemPrompt(mockCtx)).rejects.toThrow(SyntaxError);
  });
});