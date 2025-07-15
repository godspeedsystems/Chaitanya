import { GSContext, GSStatus, PlainObject } from '@godspeedsystems/core';
import { VectorStore } from '../helper/vectorStore';
// import { removeFileMetadata } from "../helper/ingestGithubRepo";

const vs = new VectorStore();

export default async function del_repo_files(ctx: GSContext) {
  const { filePath } = ctx.inputs.data.filePath;
  const { repo } = ctx.inputs.data.repo;
  try {
    await vs.removeDocument(filePath);
    // await removeFileMetadata(repo,filePath)
    return new GSStatus(true, 200, `Successfully deleted ${filePath}`);
  } catch (err) {
    return new GSStatus(false, 400, undefined, { error: err });
  }
}
