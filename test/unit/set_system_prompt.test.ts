import { GSContext, GSStatus } from '@godspeedsystems/core';
import { promises as fs } from 'fs';
import path from 'path';
import setSystemPrompt from '../../src/functions/set_system_prompt';

// Mock the fs.promises module to avoid actual file system operations
// We preserve the original module and only mock the 'writeFile' function
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    ...jest.requireActual('fs').promises,
    writeFile: jest.fn(),
  },
}));

// Test suite for the set_system_prompt function
describe('set_system_prompt', () => {
  // Clear all mocks before each test to ensure test isolation
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test Case 1.1: Happy Path
  test('should update system prompts successfully when valid prompts are provided', async () => {
    // Setup: Create a mock GSContext object with valid prompts in the request body
    const mockCtx = {
      inputs: {
        id: 'test-event-id',
        specversion: '1.0',
        type: 'test.event',
        source: '/test/source',
        data: {
          body: {
            core_system_prompt: 'You are a helpful assistant.',
            tool_knowledge_prompt: 'You have access to a variety of tools.',
          },
        },
      },
    } as unknown as GSContext;

    // Setup: Mock fs.writeFile to resolve successfully, simulating a successful file write
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

    // Step 1: Call the set_system_prompt function with the mock context
    const result = await setSystemPrompt(mockCtx);

    // Step 2: Define the expected file path and content for verification
    const expectedFilePath = path.join(process.cwd(), 'data/system_prompt.json');
    const expectedFileContent = JSON.stringify(
      {
        core_system_prompt: 'You are a helpful assistant.',
        tool_knowledge_prompt: 'You have access to a variety of tools.',
      },
      null,
      2
    );

    // Assertion 1: Assert that the function returns a GSStatus object with success as true and code as 200
    expect(result).toBeInstanceOf(GSStatus);
    expect(result.success).toBe(true);
    expect(result.code).toBe(200);
    // Assertion 2: Assert that the response data contains the correct success message
    expect(result.data).toEqual({
      message: 'System prompts updated successfully.',
    });

    // Assertion 3: Assert that fs.writeFile was called exactly once
    expect(fs.writeFile).toHaveBeenCalledTimes(1);
    // Assertion 4: Verify that fs.writeFile is called with the correct file path and content
    expect(fs.writeFile).toHaveBeenCalledWith(expectedFilePath, expectedFileContent);
  });

  // Test Case 2.1: File System Error
  test('should throw an error when file system write fails', async () => {
    // Setup: Create a mock GSContext object with valid prompts
    const mockCtx = {
      inputs: {
        id: 'test-event-id-fail',
        specversion: '1.0',
        type: 'test.event.fail',
        source: '/test/source/fail',
        data: {
          body: {
            core_system_prompt: 'This will fail.',
            tool_knowledge_prompt: 'This will also fail.',
          },
        },
      },
    } as unknown as GSContext;

    // Setup: Mock fs.writeFile to throw an error
    const mockError = new Error('Disk full');
    (fs.writeFile as jest.Mock).mockRejectedValue(mockError);

    // Steps & Assertions: Call the function and assert that it throws the expected error
    await expect(setSystemPrompt(mockCtx)).rejects.toThrow('Disk full');

    // Verify that fs.writeFile was called, even though it failed
    expect(fs.writeFile).toHaveBeenCalledTimes(1);
  });
});