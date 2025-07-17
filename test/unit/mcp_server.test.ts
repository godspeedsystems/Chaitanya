import { GSContext, GSStatus } from '@godspeedsystems/core';
import handleQuery from '../../src/functions/mcp_server';
import { RAGPipeline } from '../../src/helper/mcpRag';

// Create a single, shared mock for the 'run' method.
const mockRAGPipelineRun = jest.fn();

// Mock the RAGPipeline class to always return an instance with our shared mock method.
jest.mock('../../src/helper/mcpRag', () => ({
  RAGPipeline: jest.fn().mockImplementation(() => ({
    run: mockRAGPipelineRun,
  })),
}));

describe('handleQuery', () => {
  let ctx: GSContext;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Initialize a default context object using a type assertion
    ctx = {
      inputs: {
        data: {
          body: {
            body: {
              query: '',
            },
          },
        },
      },
    } as unknown as GSContext;
  });

  // Test Case 1: Happy Path
  it('should return a successful response with RAG output when a valid query is provided', async () => {
    // Setup: Define a valid query and the expected mock result
    const query = 'What is godspeed?';
    const mockResult = { context: 'some context', source_files: 'file1.txt' };
    ctx.inputs.data.body.body.query = query;

    // Mock the run method to return the predefined result
    mockRAGPipelineRun.mockResolvedValue(mockResult);

    // Execute the function
    const result = await handleQuery(ctx, {});

    // Assertions
    // Verify that the function returns a successful status
    expect(result).toBeInstanceOf(GSStatus);
    expect(result.success).toBe(true);
    expect(result.code).toBe(200);
    // Verify that the data matches the mocked RAG output
    expect(result.data).toEqual(mockResult);
    // Verify that the RAGPipeline's run method was called with the correct query
    expect(mockRAGPipelineRun).toHaveBeenCalledWith(query);
  });

  // Test Case 2: Invalid Input - Missing Query
  it('should return a 400 error when the query is missing', async () => {
    // Setup: Set the query to null
    ctx.inputs.data.body.body.query = null;

    // Execute the function
    const result = await handleQuery(ctx, {});

    // Assertions
    // Verify that the function returns a 400 error status
    expect(result).toBeInstanceOf(GSStatus);
    expect(result.success).toBe(false);
    expect(result.code).toBe(400);
    expect(result.message).toBe('Invalid query');
  });

  // Test Case 3: Invalid Input - Incorrect Query Type
  it('should return a 400 error when the query is not a string', async () => {
    // Setup: Set the query to a number
    (ctx.inputs.data.body.body.query as any) = 123;

    // Execute the function
    const result = await handleQuery(ctx, {});

    // Assertions
    // Verify that the function returns a 400 error status
    expect(result).toBeInstanceOf(GSStatus);
    expect(result.success).toBe(false);
    expect(result.code).toBe(400);
    expect(result.message).toBe('Invalid query');
  });

  // Test Case 4: Error Handling - RAGPipeline Failure
  it('should throw an error if RAGPipeline.run() fails', async () => {
    // Setup: Define a valid query and mock the run method to throw an error
    const query = 'A valid query';
    const errorMessage = 'RAG pipeline failed';
    ctx.inputs.data.body.body.query = query;
    mockRAGPipelineRun.mockRejectedValue(new Error(errorMessage));

    // Assertions
    // Verify that the function call rejects with the expected error
    await expect(handleQuery(ctx, {})).rejects.toThrow(errorMessage);
  });
});