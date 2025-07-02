import { GSContext, GSStatus } from '@godspeedsystems/core';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { StateGraph, END, MemorySaver, Annotation } from '@langchain/langgraph';
import { ToolNode } from "@langchain/langgraph/prebuilt"
import { RAGPipeline } from '../helper/mcpRag';
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { BaseMessage } from "@langchain/core/messages";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { tool_knowledge_prompt, core_system_prompt } from '../helper/prompts';
import { memorySaver } from '../helper/memory';

const seenThreads = new Set<string>();

export default async function stream_gemini(ctx: GSContext): Promise<GSStatus> {
  const { ws ,clientId, payload } = ctx.inputs.data;

  if (!ws || ws.readyState !== ws.OPEN) {
    ctx.logger.error(`WebSocket not connected: ${clientId}`);
    return new GSStatus(false, 400, 'WebSocket disconnected');
  }

  // STEP 1: Load VectorStore + Create RAG Tool
  
  const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  })
  })
  const ragTool = tool(async (input) => {
    const rag = new RAGPipeline()
    const result = await rag.run(input.query);
    return result
  }, {
  name: "get_relevant_docs",
  description: "Call to get revelant documents from user query.",
  schema: z.object({
    query: z.string().describe("User query to get relevant docs."),
  })
});
  
  // STEP 2: Create the LangGraph LLM Agent with Tool Support
  
    
  const toolnode = new ToolNode<typeof GraphState.State>([ragTool])
  
  async function shouldRetrieve(state: typeof GraphState.State): Promise<string> {
    const { messages } = state;
    ctx.logger.info("---DECIDE TO RETRIEVE---");
    const lastMessage = messages[messages.length - 1];

    if ("tool_calls" in lastMessage && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls.length) {
      ctx.logger.info("---DECISION: RETRIEVE---");
      return "tools";
    }
  // If there are no tool calls then we finish.
    ctx.logger.info("---DECISION: FINISH---");
    return END;
 }

  async function agent(state: typeof GraphState.State): Promise<Partial<typeof GraphState.State>> {
     ctx.logger.info("---CALL AGENT---");

     const { messages } = state;
  
     const llm = new ChatGoogleGenerativeAI({
           model: 'gemini-2.0-flash',
           temperature: 0.7,
           streaming: true
      }).bindTools([ragTool])

     const response = await llm.invoke(messages);
         return {
          messages: [response],
       };
}

  const graph = new StateGraph(GraphState)
              .addNode('agent', agent)
              .addNode('tools', toolnode);

  graph.addEdge('__start__','agent');
  graph.addConditionalEdges("agent", shouldRetrieve);
  graph.addEdge('tools', 'agent');
 
  const systemPromot = Array(core_system_prompt,tool_knowledge_prompt).join('/n')

  const runnable = graph.compile({
    checkpointer: memorySaver
  });

  const threadId = clientId;
  const messages: BaseMessage[] = [];

  if (!seenThreads.has(threadId)) {
    messages.push(new SystemMessage(systemPromot));
    seenThreads.add(threadId);
  }

  messages.push(new HumanMessage(payload.message));

  try {
  let streamStarted = false;

  await runnable.stream(
    { messages },
    {
    configurable: {
      thread_id: threadId
    },
      callbacks: [
        {
          handleLLMNewToken: async (token, runId, parentRunId, tags, metadata) => {
            if (!streamStarted) {
              streamStarted = true;
              ws.send(JSON.stringify({ eventtype: 'stream.start', payload: { message: '[STREAM_START]' } }));
            }
            ws.send(JSON.stringify({ eventtype: 'stream.chunk', payload: { message : token.length > 0 ? token : "Please wait...Retreving relevant documents."  } }));
          },
          handleLLMEnd: async () => {
            ws.send(JSON.stringify({ eventtype: 'stream.end', payload: { message: '[STREAM_END]' } }));
            streamStarted = false;
          }
        }
      ]
    }
  );

  ctx.logger.info(`Completed streaming for ${clientId}`);
  return new GSStatus(true, 200, 'Streaming completed');
} catch (err: any) {
  ctx.logger.error(`LangGraph streaming error: ${err.message}`);
  ws.send(JSON.stringify({ eventtype: 'error', payload: { message: '[ERROR]' } }));
  return new GSStatus(false, 500, 'Streaming failed');
}

}
