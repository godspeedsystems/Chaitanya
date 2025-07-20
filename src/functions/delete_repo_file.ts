import { GSContext, GSStatus, PlainObject,logger } from '@godspeedsystems/core';
import { VectorStore } from '../helper/vectorStore';
import { deleteRepoUrl, deletecommit,deletesync } from './ingest_github';


export default async function del_repo_files(ctx: GSContext) {
  const { id } = ctx.inputs.data.params;

  logger.info('Unique id : ', id);

  const vs = new VectorStore();
  
  try {
    await vs.removeUploadedDocs(id);
    await deleteRepoUrl(id);
    await deletecommit(id);
    await deletesync(id);
    return new GSStatus(true, 200, `Successfully deleted file with uniqueId ${id}`);
  } catch (err) {
    return new GSStatus(false, 400, undefined, { error: err });
  }
}


