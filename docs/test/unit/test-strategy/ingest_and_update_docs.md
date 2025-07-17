# Test Strategy Document:

## Testing Framework
jest

## Test Cases

### 1. Core Functionality

#### Test Case 1.1: Happy Path - Syncing a Single Repository

- **File Name:** `ingest_and_update_docs.test.ts`
- **Descriptive Name:** `should sync a repository if it has not been synced in the last 24 hours`
- **Implementation Guide:**
  - **Setup:**
    - Mock the `loadRepoUrl` function to return an array with a single repository object (e.g., `{ githuburl: 'https://github.com/test/repo', branch: 'main' }`).
    - Mock `getLastSyncTime` to return a timestamp older than 24 hours (or `null`).
    - Mock `ingestChangedFiles` to resolve successfully.
    - Mock `updateLastSyncTime` to resolve successfully.
  - **Steps:**
    1. Call the `ingest_and_update_docs` function with a mock context.
  - **Assertions:**
    - Expect `loadRepoUrl` to have been called once.
    - Expect `getLastSyncTime` to have been called with the correct repo URL and branch.
    - Expect `ingestChangedFiles` to have been called with the correct repo URL and branch.
    - Expect `updateLastSyncTime` to have been called with the correct repo URL and branch.
    - Expect the function to return a `GSStatus` with `success: true` and a completion message.

#### Test Case 1.2: Skipping a Recently Synced Repository

- **File Name:** `ingest_and_update_docs.test.ts`
- **Descriptive Name:** `should skip syncing a repository if it has been synced within the last 24 hours`
- **Implementation Guide:**
  - **Setup:**
    - Mock `loadRepoUrl` to return an array with a single repository object.
    - Mock `getLastSyncTime` to return a timestamp within the last 24 hours.
    - Mock the logger to spy on the `info` method.
  - **Steps:**
    1. Call the `ingest_and_update_docs` function.
  - **Assertions:**
    - Expect `getLastSyncTime` to have been called.
    - Expect `ingestChangedFiles` *not* to have been called.
    - Expect `updateLastSyncTime` *not* to have been called.
    - Expect the logger's `info` method to have been called with a message indicating the sync was skipped.

### 2. Edge Cases

#### Test Case 2.1: No Repositories to Sync

- **File Name:** `ingest_and_update_docs.test.ts`
- **Descriptive Name:** `should return a success message when loadRepoUrl returns an empty array`
- **Implementation Guide:**
  - **Setup:**
    - Mock `loadRepoUrl` to return an empty array `[]`.
  - **Steps:**
    1. Call the `ingest_and_update_docs` function.
  - **Assertions:**
    - Expect `ingestChangedFiles` not to have been called.
    - Expect the function to return a `GSStatus` with `success: true` and the message 'No repositories to sync.'.

#### Test Case 2.2: Repository Object Missing URL

- **File Name:** `ingest_and_update_docs.test.ts`
- **Descriptive Name:** `should skip a repository if its URL is missing`
- **Implementation Guide:**
  - **Setup:**
    - Mock `loadRepoUrl` to return an array with one object that has no `githuburl` or `repoUrl` field.
    - Mock the logger to spy on the `warn` method.
  - **Steps:**
    1. Call the `ingest_and_update_docs` function.
  - **Assertions:**
    - Expect the logger's `warn` method to have been called with a "Skipping: repo URL missing." message.
    - Expect `getLastSyncTime`, `ingestChangedFiles`, and `updateLastSyncTime` not to have been called.

### 3. Error Handling

#### Test Case 3.1: Error During File Ingestion

- **File Name:** `ingest_and_update_docs.test.ts`
- **Descriptive Name:** `should log an error and continue to the next repo if ingestChangedFiles fails`
- **Implementation Guide:**
  - **Setup:**
    - Mock `loadRepoUrl` to return two repository objects.
    - Mock `getLastSyncTime` to return `null` for both.
    - Mock `ingestChangedFiles` to throw an error on the first call but resolve on the second.
    - Mock the logger to spy on the `error` method.
  - **Steps:**
    1. Call the `ingest_and_update_docs` function.
  - **Assertions:**
    - Expect `ingestChangedFiles` to have been called twice.
    - Expect the logger's `error` method to have been called once with the failure message.
    - Expect `updateLastSyncTime` to have been called only once (for the successful sync).

#### Test Case 3.2: Error Reading Sync Time File

- **File Name:** `ingest_and_update_docs.test.ts`
- **Descriptive Name:** `should proceed with sync if reading last_sync_time.json fails`
- **Implementation Guide:**
  - **Setup:**
    - Mock `loadRepoUrl` to return a single repository.
    - Mock `fs.promises.readFile` within `getLastSyncTime` to throw an error.
  - **Steps:**
    1. Call the `ingest_and_update_docs` function.
  - **Assertions:**
    - Expect `getLastSyncTime` to return `null`.
    - Expect `ingestChangedFiles` to be called, as the function should assume no prior sync.
    - Expect `updateLastSyncTime` to be called.


## Coverage Matrix

| Requirement / Logic Branch | Test Case(s) | Status |
| :--- | :--- | :--- |
| **Core Sync Logic** | | |
| Repository requires sync (older than 24h) | 1.1: Happy Path - Syncing a Single Repository | Covered |
| Repository recently synced (within 24h) | 1.2: Skipping a Recently Synced Repository | Covered |
| **Input Handling** | | |
| No repositories found (`loadRepoUrl` returns empty) | 2.1: No Repositories to Sync | Covered |
| Repository object is missing URL | 2.2: Repository Object Missing URL | Covered |
| **Error Handling** | | |
| `ingestChangedFiles` fails for one repo | 3.1: Error During File Ingestion | Covered |
| `getLastSyncTime` fails (e.g., file read error) | 3.2: Error Reading Sync Time File | Covered |
| `loadRepoUrl` fails | 3.2: Error Reading Sync Time File | Covered |
| `updateLastSyncTime` fails | 3.1: Error During File Ingestion | Covered |

## TODOs Summary
All TODOs have been resolved.