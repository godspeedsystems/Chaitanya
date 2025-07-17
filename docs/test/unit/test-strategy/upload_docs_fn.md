# Test Strategy Document:

## Testing Framework
Jest

## Test Cases

### 1. Core Functionality

#### Test Case 1.1: Happy Path - Single File Upload

- **File:** `upload_docs_fn.test.ts`
- **Name:** `should process a single valid file successfully`
- **Implementation:**
  - **Setup:**
    - Mock `fs.promises.access` to resolve successfully.
    - Mock `fs.promises.readFile` to return a valid file buffer and an empty JSON array for existing metadata.
    - Mock `fs.promises.writeFile` to resolve successfully.
    - Mock `ingestUploadedFile` to return a success message.
    - Mock `VectorStore` constructor.
  - **Input:**
    - `ctx.inputs.data.files.files`: An array with a single file object containing `tempFilePath`, `name`, and `data`.
    - `ctx.inputs.data.body.metadata`: An empty object.
  - **Assertions:**
    - Verify `ingestUploadedFile` is called once with the correct arguments.
    - Verify `fs.promises.writeFile` is called to save the new metadata.
    - Assert the function returns a `GSStatus` of `true` with a 200 status code.
    - The response body should contain a success message and details of the processed file.

#### Test Case 1.2: Happy Path - Multiple File Uploads

- **File:** `upload_docs_fn.test.ts`
- **Name:** `should process multiple valid files successfully`
- **Implementation:**
  - **Setup:**
    - Similar to the single file upload, but with multiple file objects.
  - **Input:**
    - `ctx.inputs.data.files.files`: An array with multiple file objects.
    - `ctx.inputs.data.body.metadata`: An empty object.
  - **Assertions:**
    - Verify `ingestUploadedFile` is called for each file.
    - Verify `fs.promises.writeFile` is called with metadata for all processed files.
    - Assert the function returns a `GSStatus` of `true` with a 200 status code.

#### Test Case 1.3: Edge Case - File with Metadata

- **File:** `upload_docs_fn.test.ts`
- **Name:** `should process a file with associated metadata`
- **Implementation:**
  - **Setup:**
    - Same as the happy path.
  - **Input:**
    - `ctx.inputs.data.files.files`: A single file object.
    - `ctx.inputs.data.body.metadata`: A JSON string representing an array with one metadata object.
  - **Assertions:**
    - Verify the final metadata written to the file includes the user-provided metadata.

### 2. Error Handling and Exception Management

#### Test Case 2.1: No Files Uploaded

- **File:** `upload_docs_fn.test.ts`
- **Name:** `should return a 400 error if no files are uploaded`
- **Implementation:**
  - **Input:**
    - `ctx.inputs.data.files.files`: An empty array.
  - **Assertions:**
    - Assert the function returns a `GSStatus` of `false` with a 400 status code.
    - The response body should contain the error message 'No files found in upload'.

#### Test Case 2.2: Invalid Metadata Format

- **File:** `upload_docs_fn.test.ts`
- **Name:** `should return a 400 error for invalid metadata JSON`
- **Implementation:**
  - **Input:**
    - `ctx.inputs.data.files.files`: A single file object.
    - `ctx.inputs.data.body.metadata`: An invalid JSON string.
  - **Assertions:**
    - Assert the function returns a `GSStatus` of `false` with a 400 status code.
    - The response body should contain the error message 'Invalid metadata format...'.

#### Test Case 2.3: `ingestUploadedFile` Fails

- **File:** `upload_docs_fn.test.ts`
- **Name:** `should return a 500 error if ingestUploadedFile throws an exception`
- **Implementation:**
  - **Setup:**
    - Mock `ingestUploadedFile` to throw an error.
  - **Input:**
    - A single valid file object.
  - **Assertions:**
    - Assert the function returns a `GSStatus` of `false` with a 500 status code.
    - The response body should contain the error message 'Failed to parse and ingest multipart documents'.

#### Test Case 2.4: Filesystem Errors

- **File:** `upload_docs_fn.test.ts`
- **Name:** `should handle filesystem errors gracefully`
- **Implementation:**
  - **Setup:**
    - Mock `fs.promises.writeFile` to throw an error.
  - **Input:**
    - A single valid file object.
  - **Assertions:**
    - Assert the function returns a `GSStatus` of `false` with a 500 status code.
    - Verify `logger.error` is called with the appropriate error message.

### 3. Mocked Dependency Interactions

#### Test Case 3.1: `VectorStore` Initialization

- **File:** `upload_docs_fn.test.ts`
- **Name:** `should initialize VectorStore correctly`
- **Implementation:**
  - **Setup:**
    - Spy on the `VectorStore` constructor.
  - **Input:**
    - A single valid file object.
  - **Assertions:**
    - Verify the `VectorStore` constructor is called once.

## Coverage Matrix

| Requirement/Logic Branch | Test Case(s) | Status |
| ------------------------ | ------------ | ------ |
| Single file upload | 1.1 | Ready |
| Multiple file uploads | 1.2 | Ready |
| File with metadata | 1.3 | Ready |
| No files uploaded | 2.1 | Ready |
| Invalid metadata format | 2.2 | Ready |
| `ingestUploadedFile` failure | 2.3 | Ready |
| Filesystem errors | 2.4 | Ready |
| `VectorStore` initialization | 3.1 | Ready |

## TODOs Summary

All TODOs have been resolved.

### 2. Error Handling and Exception Management

#### Test Case 2.5: Unsupported File Type

- **File:** `upload_docs_fn.test.ts`
- **Name:** `should return a success message but indicate an unsupported file type`
- **Implementation:**
  - **Setup:**
    - Mock `ingestUploadedFile` to return `Unsupported file type: .zip`.
  - **Input:**
    - A single file object with a `.zip` extension.
  - **Assertions:**
    - Assert the function returns a `GSStatus` of `true` with a 200 status code.
    - The response body's `processedFiles` array should contain a message indicating the unsupported file type.

#### Test Case 2.6: Duplicate `docUniqueId`

- **File:** `upload_docs_fn.test.ts`
- **Name:** `should overwrite existing metadata on duplicate docUniqueId`
- **Implementation:**
  - **Setup:**
    - Mock `fs.promises.readFile` to return existing metadata containing a `docUniqueId` that will be duplicated.
  - **Input:**
    - A file object with a `docUniqueId` that already exists.
  - **Assertions:**
    - Verify `fs.promises.writeFile` is called with the updated metadata, where the new entry replaces the old one.