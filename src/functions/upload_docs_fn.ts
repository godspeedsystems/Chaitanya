import { GSContext, GSStatus, logger } from "@godspeedsystems/core";
import { ingestUploadedFile } from "../helper/ingestGithubRepo";
import { VectorStore } from "../helper/vectorStore";
import fs from 'fs';
import path from 'path'

const METADATA_PATH = path.join(__dirname, "../../data/docData.json")

function saveFileMetadata(fileName: string, fileSize: number, uniqueID: string) {
  const metadataEntry = {
    fileName,
    fileSize,
    uniqueID,
    uploadedAt: new Date().toISOString()
  };

  let metadataList: any[] = [];
  if (fs.existsSync(METADATA_PATH)) {
    try {
      const existing = fs.readFileSync(METADATA_PATH, "utf-8");
      metadataList = JSON.parse(existing);
    } catch (err) {
      logger.error("Failed to parse existing metadata JSON:", err);
    }
  }

  metadataList.push(metadataEntry);
  fs.writeFileSync(METADATA_PATH, JSON.stringify(metadataList, null, 2));
}

export function deleteFileMetadata(fileId: string):void {
    if (!fs.existsSync(METADATA_PATH)) {
    logger.warn("Metadata file does not exist.");
  }

  try {
    const rawData = fs.readFileSync(METADATA_PATH, "utf-8");
    const metadataList: any[] = JSON.parse(rawData);

    const newMetadataList = metadataList.filter(entry => entry.uniqueID !== fileId);

    if (newMetadataList.length === metadataList.length) {
      logger.warn(`No entry found for fileID: ${fileId}`);
      // return false;
    }

    fs.writeFileSync(METADATA_PATH, JSON.stringify(newMetadataList, null, 2));
    // return true;
  } catch (err) {
    logger.error("Error reading or writing metadata file:", err);
    // return false;
  }
}

export default async function(ctx: GSContext): Promise<GSStatus> {
  const { files } = ctx.inputs.data.files;

 const fileArray = Array.isArray(files) ? files : [files];

  try {
    if (!fileArray.length || !fileArray[0] || !fileArray[0].data) {
      return new GSStatus(false, 400, undefined, { error: "No files found in upload" });
    }

    const vs = new VectorStore();
    let existingMetadata: any[] = [];
    if (fs.existsSync(METADATA_PATH)) {
      try {
        const rawData = fs.readFileSync(METADATA_PATH, "utf-8");
        if (rawData) {
          existingMetadata = JSON.parse(rawData);
        }
      } catch (err) {
        logger.error("Failed to parse existing metadata JSON, starting fresh.", err);
      }
    }

    const results = [];
    const newMetadataEntries = [];

    for (const uploadedFile of fileArray) {
      if (!uploadedFile || !uploadedFile.data) {
        ctx.logger.warn("Skipping an invalid file entry in the uploaded list.");
        continue;
      }

      const filepath = uploadedFile.tempFilePath;
      const parsed = path.parse(filepath);
      const pathname = parsed.name.split('-');
      const docUniqueId = pathname[pathname.length - 1];
      const bufferFilePath = uploadedFile.tempFilePath;
      const fileBuffer = fs.readFileSync(bufferFilePath);
      const fileName = uploadedFile.name ?? "unknown.bin";

      newMetadataEntries.push({
        fileName,
        fileSize: fileBuffer.length,
        uniqueID: docUniqueId,
        uploadedAt: new Date().toISOString()
      });

      const res = await ingestUploadedFile(fileBuffer, fileName, docUniqueId, vs);
      
      results.push({
        message: res,
        docUniqueId: docUniqueId,
        fileName: fileName
      });
    }

    if (results.length === 0) {
      return new GSStatus(false, 400, undefined, { error: "No valid files were processed." });
    }

    // Combine and write metadata once
    const updatedMetadata = [...existingMetadata, ...newMetadataEntries];
    fs.writeFileSync(METADATA_PATH, JSON.stringify(updatedMetadata, null, 2));

    return new GSStatus(true, 200, undefined, {
      message: `Successfully processed and saved metadata for ${results.length} files.`,
      processedFiles: results,
    });

  } catch (err) {
    ctx.logger.error("Error processing multipart files:", err);
    return new GSStatus(false, 500, undefined, "Failed to parse and ingest multipart documents");
  }
}
