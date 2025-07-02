import { GSContext, GSStatus, PlainObject , logger} from "@godspeedsystems/core";
import { VectorStore } from "../helper/vectorStore";
import { deleteFileMetadata } from "./upload_docs_fn";


export default async function del_repo_files(ctx: GSContext) {
    const { id } = ctx.inputs.data.params
    const vs = new VectorStore()
    logger.info("Unique id : ",id)
    try{
        await vs.removeUploadedDocs(id)
        await deleteFileMetadata(id)
        return new GSStatus(true, 200,  `Successfully deleted file with uniqueId ${id}`)
    }
    catch(err){
        return new GSStatus(false, 400,undefined,{error: err})
    }
}