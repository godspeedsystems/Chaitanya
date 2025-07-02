import { VectorStore } from './vectorStore';
import { logger } from '@godspeedsystems/core';

export class RAGPipeline {
    private vs: VectorStore;
    constructor() {
        this.vs = new VectorStore();
    }
    async run(query: string, k: number = 5): Promise<{ context: string; source_files: string }> {
        const docs = await this.vs.search(query, k);
        const unique_docs = Array.from(new Set(docs.map((doc) => `${doc.content}`)));
        const context = unique_docs.join('\n');
        const unique_sourceFiles = Array.from(new Set(docs.map((doc) => doc.docId)));
        const sourceFiles = unique_sourceFiles.join('\n');
        logger.info(sourceFiles);

        return {
            context: context,
            source_files: sourceFiles
        };
    }
}
