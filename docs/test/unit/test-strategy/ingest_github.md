# Test Strategy Document:

## Testing Framework
jest

## Test Cases

### 1. Core Functionality

#### Test Case 1.1: Happy Path
- **File Name:** `ingest_github.test.ts`
- **Descriptive Name:** `should return a 200 status and success message when a valid GitHub URL and branch are provided`
- **Implementation Guide:**
  - **Setup:**
    - Mock the `ingestChangedFiles` function to resolve successfully.
    - Mock the `saveRepoUrl` function to resolve successfully.
    - Create a mock `GSContext` object with a valid `github_url`, `branch`, and `id` in `ctx.inputs.data.body`.
  - **Steps:**
    1. Call the `ingest_github` function with the mock context.
  - **Assertions:**
    - Expect `ingestChangedFiles` to have been called with the correct `repoUrl`, `branch`, and `repouniqueid`.
    - Expect `saveRepoUrl` to have been called with the correct `repouniqueid`, `repoUrl`, and `branch`.
    - Expect the function to return a `GSStatus` object with `success: true` and `code: 200`.
    - Expect the response message to be 'GitHub repo info saved'.

### 2. Input Validation

#### Test Case 2.1: Missing `github_url`
- **File Name:** `ingest_github.test.ts`
- **Descriptive Name:** `should return a 400 status and an error message when github_url is missing`
- **Implementation Guide:**
  - **Setup:**
    - Create a mock `GSContext` object with a `branch` but no `github_url`.
  - **Steps:**
    1. Call the `ingest_github` function with the mock context.
  - **Assertions:**
    - Expect the function to return a `GSStatus` object with `success: false` and `code: 400`.
    - Expect the error message to be 'github_url and branch are required'.

#### Test Case 2.2: Missing `branch`
- **File Name:** `ingest_github.test.ts`
- **Descriptive Name:** `should return a 400 status and an error message when branch is missing`
- **Implementation Guide:**
  - **Setup:**
    - Create a mock `GSContext` object with a `github_url` but no `branch`.
  - **Steps:**
    1. Call the `ingest_github` function with the mock context.
  - **Assertions:**
    - Expect the function to return a `GSStatus` object with `success: false` and `code: 400`.
    - Expect the error message to be 'github_url and branch are required'.

### 3. Error Handling

#### Test Case 3.1: `ingestChangedFiles` throws an error
- **File Name:** `ingest_github.test.ts`
- **Descriptive Name:** `should return a 500 status and an error message when ingestChangedFiles throws an error`
- **Implementation Guide:**
  - **Setup:**
    - Mock the `ingestChangedFiles` function to reject with an error.
    - Create a mock `GSContext` object with a valid `github_url` and `branch`.
  - **Steps:**
    1. Call the `ingest_github` function with the mock context.
  - **Assertions:**
    - Expect the function to return a `GSStatus` object with `success: false` and `code: 500`.
    - Expect the error message to include 'Failed to ingest GitHub repo:'.

#### Test Case 3.2: `saveRepoUrl` throws an error
- **File Name:** `ingest_github.test.ts`
- **Descriptive Name:** `should return a 500 status and an error message when saveRepoUrl throws an error`
- **Implementation Guide:**
  - **Setup:**
    - Mock `ingestChangedFiles` to resolve successfully.
    - Mock the `saveRepoUrl` function to reject with an error.
    - Create a mock `GSContext` object with a valid `github_url` and `branch`.
  - **Steps:**
    1. Call the `ingest_github` function with the mock context.
  - **Assertions:**
    - Expect the function to return a `GSStatus` object with `success: false` and `code: 500`.
    - Expect the error message to include 'Failed to ingest GitHub repo:'.

## Coverage Matrix
| Requirement/Logic Branch | Test Case(s) | Status |
| :--- | :--- | :--- |
| Successful ingestion of a GitHub repository | 1.1 | Not Started |
| Missing `github_url` in input | 2.1 | Not Started |
| Missing `branch` in input | 2.2 | Not Started |
| `ingestChangedFiles` function fails | 3.1 | Not Started |
| `saveRepoUrl` function fails | 3.2 | Not Started |

## TODOs Summary

All TODOs have been resolved. The current implementation handles missing or corrupted `repo_url.json` and `last_commit.json` files by either creating a new file or overwriting the corrupted one, which triggers a full re-ingestion of the repository. This is the desired behavior.