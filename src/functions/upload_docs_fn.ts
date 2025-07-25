import { GSContext, GSStatus, logger } from '@godspeedsystems/core';
import { ingestUploadedFile } from '../helper/ingestGithubRepo';
import { VectorStore } from '../helper/vectorStore';
import { promises as fs } from 'fs';
import path from 'path';

const METADATA_PATH = path.join(__dirname, '../../data/docData.json');

async function saveFileMetadata(
  fileName: string,
  fileSize: number,
  uniqueID: string,
): Promise<void> {
  const metadataEntry = {
    fileName,
    fileSize,
    uniqueID,
    uploadedAt: new Date().toISOString(),
  };

  let metadataList: any[] = [];
  try {
    await fs.access(METADATA_PATH);
    const existing = await fs.readFile(METADATA_PATH, 'utf-8');
    metadataList = JSON.parse(existing);
  } catch (err) {
    const nodeError = err as NodeJS.ErrnoException;
    if (nodeError.code !== 'ENOENT') {
      logger.error('Failed to parse existing metadata JSON:', err);
    }
  }

  metadataList.push(metadataEntry);
  await fs.writeFile(METADATA_PATH, JSON.stringify(metadataList, null, 2));
}

export async function deleteFileMetadata(fileId: string): Promise<void> {
  try {
    await fs.access(METADATA_PATH);
  } catch {
    logger.warn('Metadata file does not exist.');
    return;
  }

  try {
    const rawData = await fs.readFile(METADATA_PATH, 'utf-8');
    const metadataList: any[] = JSON.parse(rawData);

    const newMetadataList = metadataList.filter(
      (entry) => entry.uniqueID !== fileId,
    );

    if (newMetadataList.length === metadataList.length) {
      logger.warn(`No entry found for fileID: ${fileId}`);
    }

    await fs.writeFile(METADATA_PATH, JSON.stringify(newMetadataList, null, 2));
  } catch (err) {
    logger.error('Error reading or writing metadata file:', err);
  }
}

export default async function (ctx: GSContext): Promise<GSStatus> {
  const { files } = ctx.inputs.data.files;
  const { metadata } = ctx.inputs.data.body;

  console.log('Received metadata:', metadata);

  let parsedMetadata;
  if (typeof metadata === 'string') {
    try {
      parsedMetadata = JSON.parse(metadata);
    } catch (e) {
      logger.error('Failed to parse metadata JSON string:', metadata, e);
      return new GSStatus(false, 400, undefined, {
        error:
          'Invalid metadata format. Expected a JSON string representing an array of objects.',
      });
    }
  } else {
    parsedMetadata = metadata;
  }

  const fileArray = Array.isArray(files) ? files : [files];
  const metadataArray = Array.isArray(parsedMetadata)
    ? parsedMetadata
    : parsedMetadata
      ? [parsedMetadata]
      : [];

  try {
    if (!fileArray.length || !fileArray[0] || !fileArray[0].data) {
      return new GSStatus(false, 400, undefined, {
        error: 'No files found in upload',
      });
    }

    const vs = new VectorStore();
    let existingMetadata: any[] = [];
    try {
      await fs.access(METADATA_PATH);
      const rawData = await fs.readFile(METADATA_PATH, 'utf-8');
      if (rawData) {
        existingMetadata = JSON.parse(rawData);
      }
    } catch (err) {
      const nodeError = err as NodeJS.ErrnoException;
      if (nodeError.code !== 'ENOENT') {
        logger.error(
          'Failed to parse existing metadata JSON, starting fresh.',
          err,
        );
      }
    }

    const results = [];
    const newMetadataEntries = [];

    for (const [index, uploadedFile] of fileArray.entries()) {
      if (!uploadedFile || !uploadedFile.data) {
        ctx.logger.warn('Skipping an invalid file entry in the uploaded list.');
        continue;
      }
      const userMetadata = metadataArray[index] || {};

      const filepath = uploadedFile.tempFilePath;
      const parsed = path.parse(filepath);
      const pathname = parsed.name.split('-');
      const docUniqueId = pathname[pathname.length - 1];
      const bufferFilePath = uploadedFile.tempFilePath;
      const fileBuffer = await fs.readFile(bufferFilePath);
      const fileName = uploadedFile.name ?? 'unknown.bin';

      newMetadataEntries.push({
        ...userMetadata,
        fileName,
        fileSize: fileBuffer.length,
        uniqueID: docUniqueId,
        uploadedAt: new Date().toISOString(),
      });

      const res = await ingestUploadedFile(
        fileBuffer,
        fileName,
        docUniqueId,
        vs,
      );

      results.push({
        message: res,
        docUniqueId: docUniqueId,
        fileName: fileName,
      });
    }

    if (results.length === 0) {
      return new GSStatus(false, 400, undefined, {
        error: 'No valid files were processed.',
      });
    }

    const updatedMetadata = [...existingMetadata, ...newMetadataEntries];
    await fs.writeFile(METADATA_PATH, JSON.stringify(updatedMetadata, null, 2));

    return new GSStatus(true, 200, undefined, {
      message: `Successfully processed and saved metadata for ${results.length} files.`,
      processedFiles: results,
    });
  } catch (err) {
    ctx.logger.error('Error processing multipart files:', err);
    return new GSStatus(
      false,
      500,
      undefined,
      'Failed to parse and ingest multipart documents',
    );
  }
}
