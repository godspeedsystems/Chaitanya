# Test Strategy Document:

## Testing Framework
jest

## Test Cases

### 1. Core Functionality

#### Test Case 1.1: Happy Path - Successful stream without tool usage

-   **File Name:** `stream_gemini.test.ts`
-   **Descriptive Name:** `should handle a successful stream from the LLM without calling any tools`
-   **Implementation Guide:**
    -   **Setup:**
        -   Mock the `GSContext` object with a valid WebSocket connection (`ws.readyState = ws.OPEN`).
        -   Mock `getPrompts` to return dummy prompts.
        -   Mock `ChatGoogleGenerativeAI` to return a mock response without tool calls. The mock `invoke` should return a `BaseMessage` that does not contain `tool_calls`.
        -   Mock the `runnable.stream` to simulate a simple LLM stream. The stream should trigger `handleLLMStart`, `handleLLMNewToken` (with some text), and `handleLLMEnd` callbacks.
    -   **Input:**
        -   A `GSContext` object with a `payload` like `{ message: 'Hello' }`.
    -   **Mocks:**
        -   `ctx.inputs.data.ws`: Mock `send` to be a `jest.fn()`.
        -   `ChatGoogleGenerativeAI`: Mock the class and its methods.
        -   `RAGPipeline`: Mock the class.
        -   `getPrompts`: Mock the function.
        -   `memorySaver`: Mock the object.
    -   **Assertions:**
        -   Verify `ws.send` is called in the correct order with the correct payloads:
            1.  `eventtype: 'stream.start'`
            2.  `eventtype: 'stream.chunk'` with the token from the LLM.
            3.  `eventtype: 'stream.end'`
        -   Verify the `RAGPipeline` is NOT instantiated or used.
        -   Verify the final status is `GSStatus(true, 200, 'Streaming completed')`.

#### Test Case 1.2: Happy Path - Successful stream with RAG tool usage

-   **File Name:** `stream_gemini.test.ts`
-   **Descriptive Name:** `should handle a successful stream that involves using the RAG tool`
-   **Implementation Guide:**
    -   **Setup:**
        -   Similar to the above, but configure the mocked `ChatGoogleGenerativeAI`'s `invoke` method to return a response that *includes* a `tool_calls` property, directing the graph to use the `get_relevant_docs` tool.
        -   Mock the `RAGPipeline.run` method to return a mock document string.
        -   The `runnable.stream` mock should simulate the full graph flow: `agent` -> `tools` -> `agent`.
    -   **Input:**
        -   A `GSContext` object with a `payload` like `{ message: 'What is Godspeed?' }`.
    -   **Mocks:**
        -   `ctx.inputs.data.ws`: Mock `send` to be a `jest.fn()`.
        -   `ChatGoogleGenerativeAI`: Mock to return a response with `tool_calls`.
        -   `RAGPipeline.run`: Mock to be a `jest.fn()` that returns a dummy result.
        -   `getPrompts`: Mock the function.
    -   **Assertions:**
        -   Verify `ws.send` is called for the tool start sequence: `stream.start`, `stream.chunk` (with "retrieving documents" message), `stream.end`.
        -   Verify `RAGPipeline.run` is called with the correct query.
        -   Verify `ws.send` is called again for the final LLM response sequence: `stream.start`, `stream.chunk`, `stream.end`.
        -   Verify the final status is `GSStatus(true, 200, 'Streaming completed')`.

### 2. Business Logic Validation

#### Test Case 2.1: System Prompt Handling - First message

-   **File Name:** `stream_gemini.test.ts`
-   **Descriptive Name:** `should add the system prompt for a new clientId`
-   **Implementation Guide:**
    -   **Setup:**
        -   Ensure the `seenThreads` set is empty before the test.
        -   Mock dependencies as in the happy path test.
    -   **Input:**
        -   A `GSContext` with a unique `clientId`.
    -   **Mocks:**
        -   Mock `getPrompts` to verify it's called.
        -   Mock the `runnable.stream` and inspect the `messages` array passed to it.
    -   **Assertions:**
        -   Verify that the first message in the `messages` array passed to `runnable.stream` is a `SystemMessage`.
        -   Verify that the `clientId` is added to the `seenThreads` set.

#### Test Case 2.2: System Prompt Handling - Subsequent messages

-   **File Name:** `stream_gemini.test.ts`
-   **Descriptive Name:** `should NOT add the system prompt for a subsequent message from the same clientId`
-   **Implementation Guide:**
    -   **Setup:**
        -   Add a `clientId` to the `seenThreads` set before calling the function.
        -   Mock dependencies as in the happy path test.
    -   **Input:**
        -   A `GSContext` with the same `clientId` that was added to `seenThreads`.
    -   **Mocks:**
        -   Mock the `runnable.stream` and inspect the `messages` array passed to it.
    -   **Assertions:**
        -   Verify that the first message in the `messages` array passed to `runnable.stream` is a `HumanMessage`, not a `SystemMessage`.

### 3. Error Handling

#### Test Case 3.1: WebSocket Disconnected

-   **File Name:** `stream_gemini.test.ts`
-   **Descriptive Name:** `should return a 400 error if the WebSocket is not connected`
-   **Implementation Guide:**
    -   **Setup:**
        -   Mock the `GSContext` object with a disconnected WebSocket (`ws.readyState` is not `ws.OPEN`).
    -   **Input:**
        -   A `GSContext` object with a disconnected `ws`.
    -   **Mocks:**
        -   `ctx.logger.error`: Mock to be a `jest.fn()`.
    -   **Assertions:**
        -   Verify the function returns `new GSStatus(false, 400, 'WebSocket disconnected')`.
        -   Verify `ctx.logger.error` was called with the appropriate message.
        -   Verify `ws.send` was NOT called.

#### Test Case 3.2: LangGraph Streaming Error

-   **File Name:** `stream_gemini.test.ts`
-   **Descriptive Name:** `should handle errors thrown by the LangGraph stream`
-   **Implementation Guide:**
    -   **Setup:**
        -   Mock the `runnable.stream` to throw an error.
    -   **Input:**
        -   A valid `GSContext` object.
    -   **Mocks:**
        -   `ctx.inputs.data.ws`: Mock `send` to be a `jest.fn()`.
        -   `ctx.logger.error`: Mock to be a `jest.fn()`.
        -   `runnable.stream`: Mock to `jest.fn().mockRejectedValue(new Error('Graph Error'))`.
    -   **Assertions:**
        -   Verify the function returns `new GSStatus(false, 500, 'Streaming failed')`.
        -   Verify `ctx.logger.error` was called with the error message.
        -   Verify `ws.send` was called with `eventtype: 'error'` and `payload: { message: '[ERROR]' }`.

**OUTSTANDING TODOs:**
- TODO: The current implementation uses a simple in-memory `Set` (`seenThreads`) to track if a system prompt has been sent to a client. This will not persist across server restarts or in a scaled, multi-instance environment. A more robust solution like a database or a distributed cache (e.g., Redis) should be used to track client sessions/threads.

**IMPACT:** Cannot implement a meaningful test case for session persistence across restarts until the TODO is resolved.

## Coverage Matrix

| Requirement / Logic Branch | Test Case(s) | Status |
| :--- | :--- | :--- |
| Successful LLM stream (no tools) | 1.1 | Covered |
| Successful LLM stream (with RAG tool) | 1.2 | Covered |
| System prompt for new client | 2.1 | Covered |
| No system prompt for existing client | 2.2 | Covered |
| WebSocket disconnected error | 3.1 | Covered |
| LangGraph stream error | 3.2 | Covered |
| Client session persistence | - | **TODO** |

## TODOs Summary

- **TODO:** The current implementation uses a simple in-memory `Set` (`seenThreads`) to track if a system prompt has been sent to a client. This will not persist across server restarts or in a scaled, multi-instance environment. A more robust solution like a database or a distributed cache (e.g., Redis) should be used to track client sessions/threads.