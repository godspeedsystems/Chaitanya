import { GSContext, GSStatus } from '@godspeedsystems/core';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { StateGraph, END, MemorySaver, Annotation } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { RAGPipeline } from '../helper/mcpRag';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { BaseMessage } from '@langchain/core/messages';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { getPrompts } from '../helper/prompts';
import { memorySaver } from '../helper/memory';

export default async function stream_gemini(ctx: GSContext): Promise<GSStatus> {
  const { ws, clientId, payload } = ctx.inputs.data;

  if (!ws || ws.readyState !== ws.OPEN) {
    ctx.logger.error(`WebSocket not connected: ${clientId}`);
    return new GSStatus(false, 400, 'WebSocket disconnected');
  }

  // STEP 1: Load VectorStore + Create RAG Tool

  const GraphState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
      reducer: (x, y) => x.concat(y),
      default: () => [],
    }),
    systemPrompt: Annotation<string>({
      reducer: (x, y) => y ?? x, 
      default: () => '',
    }),
  });
  
  const ragTool = tool(
    async (input) => {
      const rag = new RAGPipeline()
      const result = await rag.run(input.query);
      return result;
    },
    {
      name: 'get_relevant_docs',
      description: 'Call to get revelant documents from user query.',
      schema: z.object({
        query: z.string().describe('User query to get relevant docs.'),
      }),
    },
  );

  // STEP 2: Create the LangGraph LLM Agent with Tool Support

  const toolnode = new ToolNode<typeof GraphState.State>([ragTool]);

  async function shouldRetrieve(
    state: typeof GraphState.State,
  ): Promise<string> {
    const { messages } = state;
    ctx.logger.info('---DECIDE TO RETRIEVE---');
    const lastMessage = messages[messages.length - 1];

    if (
      'tool_calls' in lastMessage &&
      Array.isArray(lastMessage.tool_calls) &&
      lastMessage.tool_calls.length
    ) {
      ctx.logger.info('---DECISION: RETRIEVE---');
      return 'tools';
    }
    // If there are no tool calls then we finish.
    ctx.logger.info('---DECISION: FINISH---');
    return END;
  }

  async function agent(
    state: typeof GraphState.State,
  ): Promise<Partial<typeof GraphState.State>> {
    ctx.logger.info('---CALL AGENT---');

    const { messages, systemPrompt } = state;

    // Construct messages with system prompt at the beginning
    const allMessages: BaseMessage[] = systemPrompt ? 
      [new SystemMessage(systemPrompt), ...messages] : 
      messages;

    const llm = new ChatGoogleGenerativeAI({
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      temperature: 0.7,
      streaming: true,
    }).bindTools([ragTool]);

    const response = await llm.invoke(allMessages);
    
    // Only return the response message, not the system prompt
    return {
      messages: [response],
    };
  }

  const graph = new StateGraph(GraphState)
    .addNode('agent', agent)
    .addNode('tools', toolnode);

  graph.addEdge('__start__', 'agent');
  graph.addConditionalEdges('agent', shouldRetrieve);
  graph.addEdge('tools', 'agent');

  const runnable = graph.compile({
    checkpointer: memorySaver,
  });

  const threadId = clientId;

  // Get the latest system prompt
  const { core_system_prompt, tool_knowledge_prompt } = getPrompts();
  const newSystemPromptText = `${core_system_prompt}\n${tool_knowledge_prompt}`;

  // Get the current state for the thread
  const currentState = await runnable.getState({
    configurable: {
      thread_id: threadId,
    },
  });

  const existingMessages = currentState?.values?.messages ?? [];
  const existingSystemPrompt = currentState?.values?.systemPrompt ?? '';
  
  let messagesForStream: BaseMessage[] = [];
  let systemPromptForStream: string | undefined;

  // Check if this is a new conversation or if system prompt needs update
  if (existingMessages.length === 0) {
    // New conversation
    ctx.logger.info(`New conversation for thread ${threadId}. Initializing with system prompt.`);
    messagesForStream = [new HumanMessage(payload.message)];
    systemPromptForStream = newSystemPromptText;
  } else {
    // Existing conversation
    messagesForStream = [new HumanMessage(payload.message)];
    
    // Check if system prompt needs update
    if (existingSystemPrompt !== newSystemPromptText) {
      ctx.logger.info(`System prompt for thread ${threadId} has changed. Updating system prompt.`);
      systemPromptForStream = newSystemPromptText;
    }
    // If system prompt hasn't changed, we don't need to update it
  }

  try {
    let streamStarted = false;
    
    // Get the current system prompt (either updated or existing)
    const currentSystemPrompt = systemPromptForStream ?? existingSystemPrompt;
    
    // Always ensure system prompt is set in the stream
    const streamInput: Partial<typeof GraphState.State> = {
      messages: messagesForStream,
    };
    
    // Always include system prompt to ensure it's current
    if (currentSystemPrompt) {
      streamInput.systemPrompt = currentSystemPrompt;
    }
    
    ctx.logger.info(`Streaming with system prompt: ${currentSystemPrompt ? 'YES' : 'NO'}`);
    
    await runnable.stream(
      streamInput,
      {
        configurable: {
          thread_id: threadId,
        },
        callbacks: [
          {
            handleToolStart: async (tool, input) => {
              ws.send(
                JSON.stringify({
                  eventtype: 'stream.start',
                  payload: { message: '[STREAM_START]' },
                }),
              );
              ws.send(
                JSON.stringify({
                  eventtype: 'stream.chunk',
                  payload: {
                    message: 'Please wait...Retreving relevant documents.',
                  },
                }),
              );
              ws.send(
                JSON.stringify({
                  eventtype: 'stream.end',
                  payload: { message: '[STREAM_END]' },
                }),
              );
            },
            handleLLMStart: async () => {
              if (!streamStarted) {
                streamStarted = true;
                ws.send(
                  JSON.stringify({
                    eventtype: 'stream.start',
                    payload: { message: '[STREAM_START]' },
                  }),
                );
              }
            },
            handleLLMNewToken: async (token) => {
              if (token.length > 0) {
                ws.send(
                  JSON.stringify({
                    eventtype: 'stream.chunk',
                    payload: { message: token },
                  }),
                );
              }
            },
            handleLLMEnd: async () => {
              ws.send(
                JSON.stringify({
                  eventtype: 'stream.end',
                  payload: { message: '[STREAM_END]' },
                }),
              );
              streamStarted = false;
            },
          },
        ],
      },
    );

    ctx.logger.info(`Completed streaming for ${clientId}`);
    return new GSStatus(true, 200, 'Streaming completed');
  } catch (err: any) {
    ctx.logger.error(`LangGraph streaming error: ${err.message}`);
    ws.send(
      JSON.stringify({ eventtype: 'error', payload: { message: '[ERROR]' } }),
    );
    return new GSStatus(false, 500, 'Streaming failed');
  }
}