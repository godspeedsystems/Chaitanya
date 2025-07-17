import { GSContext, GSStatus } from '@godspeedsystems/core';
import stream_gemini, { seenThreads } from '../../src/functions/stream_gemini';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { RAGPipeline } from '../../src/helper/mcpRag';
import { getPrompts } from '../../src/helper/prompts';
import { memorySaver } from '../../src/helper/memory';
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StateGraph } from '@langchain/langgraph';

// Mock dependencies
jest.mock('@langchain/google-genai');
jest.mock('../../src/helper/mcpRag');
jest.mock('../../src/helper/prompts');
jest.mock('../../src/helper/memory');

// Mock the entire langgraph module to control the stream
const mockStream = jest.fn();
jest.mock('@langchain/langgraph', () => {
    const original = jest.requireActual('@langchain/langgraph');
    return {
        ...original,
        StateGraph: jest.fn().mockImplementation(() => ({
            addNode: jest.fn().mockReturnThis(),
            addEdge: jest.fn().mockReturnThis(),
            addConditionalEdges: jest.fn().mockReturnThis(),
            compile: jest.fn().mockReturnValue({
                stream: mockStream,
            }),
        })),
    };
});


describe('stream_gemini', () => {
    let ctx: GSContext;
    let mockWs: any;

    beforeEach(() => {
        // Reset mocks and state before each test
        jest.clearAllMocks();
        mockStream.mockClear();
        seenThreads.clear(); // Clear the set to ensure test isolation

        // Mock WebSocket
        mockWs = {
            readyState: 1, // WebSocket.OPEN
            OPEN: 1,
            send: jest.fn(),
        };

        // Mock GSContext
        ctx = {
            inputs: {
                data: {
                    ws: mockWs,
                    clientId: 'test-client-1',
                    payload: { message: 'Hello' },
                },
            },
            logger: {
                info: jest.fn(),
                error: jest.fn(),
            },
        } as unknown as GSContext;

        // Mock getPrompts
        (getPrompts as jest.Mock).mockReturnValue({
            core_system_prompt: 'System Prompt',
            tool_knowledge_prompt: 'Tool Prompt',
        });
    });

    // Test Case for outstanding TODO
    test('should fail due to unresolved TODO for client session persistence', () => {
        // This test is expected to fail until the TODO is resolved.
        // We throw an error to make the test fail explicitly.
        const test = () => {
            throw new Error('TODO: Implement persistent session tracking (e.g., Redis) instead of in-memory Set.');
        };
        expect(test).toThrow('TODO: Implement persistent session tracking (e.g., Redis) instead of in-memory Set.');
    });


    describe('Core Functionality', () => {
        test('1.1: should handle a successful stream from the LLM without calling any tools', async () => {
            // Setup: Mock stream to simulate LLM response without tools
            mockStream.mockImplementation(async (inputs: any, config: any) => {
                if (config?.callbacks?.[0]) {
                    await config.callbacks[0].handleLLMStart();
                    await config.callbacks[0].handleLLMNewToken('Final response.');
                    await config.callbacks[0].handleLLMEnd();
                }
            });

            // Execute
            const result = await stream_gemini(ctx);

            // Assertions
            expect(mockWs.send).toHaveBeenCalledTimes(3);
            expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ eventtype: 'stream.start', payload: { message: '[STREAM_START]' } }));
            expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ eventtype: 'stream.chunk', payload: { message: 'Final response.' } }));
            expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ eventtype: 'stream.end', payload: { message: '[STREAM_END]' } }));
            expect(RAGPipeline).not.toHaveBeenCalled();
            expect(result).toEqual(new GSStatus(true, 200, 'Streaming completed'));
        });

        test('1.2: should handle a successful stream that involves using the RAG tool', async () => {
            // Setup
            const mockRagRun = jest.fn().mockResolvedValue('RAG Result');
            (RAGPipeline as jest.Mock).mockImplementation(() => ({
                run: mockRagRun,
            }));

            mockStream.mockImplementation(async (inputs: any, config: any) => {
                if (config?.callbacks?.[0]) {
                    // Simulate tool call
                    await config.callbacks[0].handleToolStart({ name: 'get_relevant_docs' }, 'What is Godspeed?');
                    // Simulate final LLM response
                    await config.callbacks[0].handleLLMStart();
                    await config.callbacks[0].handleLLMNewToken('This is Godspeed.');
                    await config.callbacks[0].handleLLMEnd();
                }
            });

            ctx.inputs.data.payload.message = 'What is Godspeed?';

            // Execute
            const result = await stream_gemini(ctx);

            // Assertions
            // Tool call sequence
            expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ eventtype: 'stream.start', payload: { message: '[STREAM_START]' } }));
            expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ eventtype: 'stream.chunk', payload: { message: 'Please wait...Retreving relevant documents.' } }));
            expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ eventtype: 'stream.end', payload: { message: '[STREAM_END]' } }));

            // Final response sequence
            expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ eventtype: 'stream.start', payload: { message: '[STREAM_START]' } }));
            expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ eventtype: 'stream.chunk', payload: { message: 'This is Godspeed.' } }));
            expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ eventtype: 'stream.end', payload: { message: '[STREAM_END]' } }));

            expect(result).toEqual(new GSStatus(true, 200, 'Streaming completed'));
        });
    });

    describe('Business Logic Validation', () => {
        test('2.1: should add the system prompt for a new clientId', async () => {
            // Setup
            mockStream.mockResolvedValue(undefined); // Prevent actual streaming logic

            // Execute
            await stream_gemini(ctx);

            // Assertions
            const streamArgs = mockStream.mock.calls[0][0];
            expect(streamArgs.messages[0]).toBeInstanceOf(SystemMessage);
            expect(streamArgs.messages[0].content).toContain('System Prompt');
        });

        test('2.2: should NOT add the system prompt for a subsequent message from the same clientId', async () => {
            // Setup: First call to add the client to seenThreads
            mockStream.mockResolvedValue(undefined);

            await stream_gemini(ctx); // First call

            // Second call
            await stream_gemini(ctx);

            // Assertions
            const streamArgs = mockStream.mock.calls[1][0]; // Check the second call
            expect(streamArgs.messages[0]).toBeInstanceOf(HumanMessage);
            expect(streamArgs.messages[0].content).toBe('Hello');
        });
    });

    describe('Error Handling', () => {
        test('3.1: should return a 400 error if the WebSocket is not connected', async () => {
            // Setup
            mockWs.readyState = 2; // CLOSED

            // Execute
            const result = await stream_gemini(ctx);

            // Assertions
            expect(result).toEqual(new GSStatus(false, 400, 'WebSocket disconnected'));
            expect(ctx.logger.error).toHaveBeenCalledWith('WebSocket not connected: test-client-1');
            expect(mockWs.send).not.toHaveBeenCalled();
        });

        test('3.2: should handle errors thrown by the LangGraph stream', async () => {
            // Setup
            const error = new Error('Graph Error');
            mockStream.mockRejectedValue(error);

            // Execute
            const result = await stream_gemini(ctx);

            // Assertions
            expect(result).toEqual(new GSStatus(false, 500, 'Streaming failed'));
            expect(ctx.logger.error).toHaveBeenCalledWith(`LangGraph streaming error: ${error.message}`);
            expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ eventtype: 'error', payload: { message: '[ERROR]' } }));
        });
    });
});