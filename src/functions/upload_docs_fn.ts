import { GSContext, GSStatus, logger } from "@godspeedsystems/core";
import { ingestUploadedFile } from "../helper/ingestGithubRepo";
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
  const { file } = ctx.inputs.data.files;
  try {
    // File is usually available as a buffer or stream in multipart
    const uploadedFile = file; // Can be buffer or stream depending on parser
    // const fileName = body?.filename ;

    if (!uploadedFile || !uploadedFile.data) {
     return new GSStatus(false, 400, undefined, { error: "File not found" });
  }
    const filepath = uploadedFile.tempFilePath
    const parsed = path.parse(filepath);
    const pathname = parsed.name.split('-')
    const docUniqueId = pathname[pathname.length - 1]
    const bufferFilePath = uploadedFile.tempFilePath ;
    const fileBuffer = fs.readFileSync(bufferFilePath);
    const fileName = uploadedFile.name ?? "unknown.bin";
  
    saveFileMetadata(fileName, fileBuffer.length, docUniqueId)

    const res = await ingestUploadedFile(fileBuffer, fileName , docUniqueId);

    return new GSStatus(true, 200, undefined, {
      message: res,
      docUniqueId:docUniqueId,
    });

  } catch (err) {
    ctx.logger.error("Error processing multipart file:", err);
    return new GSStatus(false, 500, undefined, "Failed to parse and ingest multipart document");
  }
}
