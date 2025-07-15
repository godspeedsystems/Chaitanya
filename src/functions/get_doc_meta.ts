import { GSContext, GSStatus } from '@godspeedsystems/core';
import * as fs from 'fs/promises';
import * as path from 'path';

const UPLOAD_METADATA_PATH = path.resolve(__dirname, '../../data/docData.json');

interface UploadMeta {
  fileName: string;
  fileSize: number;
  uniqueID: string;
  uploadedAt: string;
}

export default async function get_upload_metadata(
  ctx: GSContext,
): Promise<GSStatus> {
  let uploadedFilesMetadata: UploadMeta[] = [];

  try {
    const uploadData = await fs.readFile(UPLOAD_METADATA_PATH, 'utf-8');
    uploadedFilesMetadata = JSON.parse(uploadData);
    return new GSStatus(true, 200, 'Success', uploadedFilesMetadata);
  } catch (err) {
    return new GSStatus(false, 400, 'Upload Metadata file not found', {
      error: err,
    });
  }
}
