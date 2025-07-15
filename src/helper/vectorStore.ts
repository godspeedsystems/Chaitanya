import { IndexFlatL2 } from 'faiss-node';
import * as fs from 'fs/promises';
import * as path from 'path';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { logger } from '@godspeedsystems/core';

interface Metadata {
  [docId: string]: {
    content: string;
  };
}

export class VectorStore {
  private indexPath: string;
  private metaPath: string;
  private docIdMapPath: string;
  private model: GoogleGenerativeAIEmbeddings;
  private index: IndexFlatL2;
  public metadata: Metadata = {};
  private docIdByVectorIdx: string[] = [];

  constructor(
    indexPath = path.resolve(__dirname, '../../index/index.faiss'),
    metaPath = path.resolve(__dirname, '../../index/metadata.json'),
    docIdMapPath = path.resolve(__dirname, '../../index/docIdMap.json'),
  ) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('Missing GOOGLE_API_KEY in .env');

    this.indexPath = indexPath;
    this.metaPath = metaPath;
    this.docIdMapPath = docIdMapPath;

    this.model = new GoogleGenerativeAIEmbeddings({
      apiKey: apiKey,
      modelName: process.env.EMBEDDING_MODEL || 'models/embedding-001',
    });

    const dim = 768;
    this.index = new IndexFlatL2(dim);
    this.load()
  }

  // public static async create(
  //   indexPath = path.resolve(__dirname, '../../index/index.faiss'),
  //   metaPath = path.resolve(__dirname, '../../index/metadata.json'),
  //   docIdMapPath = path.resolve(__dirname, '../../index/docIdMap.json'),
  // ): Promise<VectorStore> {
  //   const store = new VectorStore(indexPath, metaPath, docIdMapPath);
  //   await store.load();
  //   return store;
  // }

  private async load(): Promise<void> {
    const dim = 768;
    try {
      await fs.access(this.indexPath);
      this.index = IndexFlatL2.read(this.indexPath) as IndexFlatL2;
    } catch {
      this.index = new IndexFlatL2(dim);
    }

    try {
      const metaData = await fs.readFile(this.metaPath, 'utf-8');
      this.metadata = JSON.parse(metaData);
    } catch {
      this.metadata = {};
    }

    try {
      const docIdMapData = await fs.readFile(this.docIdMapPath, 'utf-8');
      this.docIdByVectorIdx = JSON.parse(docIdMapData);
    } catch {
      this.docIdByVectorIdx = [];
    }
  }

  async upsert(docId: string, content: string): Promise<void> {
    const chunks = this.chunkText(content);
    const embeddings = await this.model.embedDocuments(chunks);
    const flatEmbeddings = embeddings.flat();
    this.index.add(flatEmbeddings);
    for (let i = 0; i < embeddings.length; i++) {
      this.docIdByVectorIdx.push(docId);
    }
    this.metadata[docId] = {
      content,
    };
    await this.save();
  }

  async search(query: string, k = 5): Promise<any[]> {
    const queryVec = await this.model.embedQuery(query);
    const queryArray = queryVec;
    const result = this.index.search(queryArray, k);
    const hits = [];
    for (let i = 0; i < result.labels.length; i++) {
      const idx = result.labels[i];
      const docId = this.docIdByVectorIdx[idx];
      if (docId && this.metadata[docId]) {
        hits.push({
          docId: docId,
          content: this.metadata[docId].content,
        });
      }
    }
    return hits;
  }

  async upsertDoc(docId: string, content: string): Promise<void> {
    await this.upsert(docId, content);
  }

  private async ensureDir(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  private async save(): Promise<void> {
    try {
      await this.ensureDir(this.indexPath);
      this.index.write(this.indexPath);
    } catch (err) {
      logger.error('Failed to write index:', err);
    }

    try {
      await this.ensureDir(this.metaPath);
      await fs.writeFile(this.metaPath, JSON.stringify(this.metadata, null, 2));
    } catch (err) {
      logger.error('Failed to write metadata:', err);
    }

    try {
      await this.ensureDir(this.docIdMapPath);
      await fs.writeFile(
        this.docIdMapPath,
        JSON.stringify(this.docIdByVectorIdx, null, 2),
      );
    } catch (err) {
      logger.error('Failed to write docId map:', err);
    }
  }

  async removeDocument(docId: string) {
    if (!(docId in this.metadata)) {
      logger.info(`[${docId}] Not found in index. Skipping removal.`);
      return;
    }

    const indicesToRemove = [];
    for (let i = 0; i < this.docIdByVectorIdx.length; i++) {
      if (this.docIdByVectorIdx[i] === docId) {
        indicesToRemove.push(i);
      }
    }

    if (indicesToRemove.length === 0) {
      logger.info(
        `[${docId}] No associated vectors found. Only metadata removed.`,
      );
      delete this.metadata[docId];
      await this.save();
      return;
    }

    const removedCount = this.index.removeIds(indicesToRemove);
    logger.info(`[${docId}] Removed ${removedCount} vectors from FAISS index.`);

    delete this.metadata[docId];

    const removalSet = new Set(indicesToRemove);
    this.docIdByVectorIdx = this.docIdByVectorIdx.filter(
      (_, idx) => !removalSet.has(idx),
    );

    await this.save();
    logger.info(`[${docId}] Document fully removed and index state updated.`);
  }

  async removeUploadedDocs(docId: string) {
    const keysToDelete = Object.keys(this.metadata).filter((key) =>
      key.startsWith(`${docId}_page_`),
    );

    if (keysToDelete.length === 0) {
      logger.info(`[${docId}] Not found in index. Skipping removal.`);
      return;
    }

    const removalKeysSet = new Set(keysToDelete);
    const indicesToRemove: number[] = [];

    for (let i = 0; i < this.docIdByVectorIdx.length; i++) {
      const vectorDocId = this.docIdByVectorIdx[i];
      if (removalKeysSet.has(vectorDocId)) {
        indicesToRemove.push(i);
      }
    }

    if (indicesToRemove.length > 0) {
      const removedCount = this.index.removeIds(indicesToRemove);
      logger.info(
        `[${docId}] Removed ${removedCount} vectors from FAISS index.`,
      );
    } else {
      logger.info(`[${docId}] No vectors found. Only metadata removed.`);
    }

    for (const key of keysToDelete) {
      delete this.metadata[key];
    }

    const indicesToRemoveSet = new Set(indicesToRemove);
    this.docIdByVectorIdx = this.docIdByVectorIdx.filter(
      (_, idx) => !indicesToRemoveSet.has(idx),
    );

    await this.save();

    logger.info(`[${docId}] Document and all page metadata fully removed.`);
  }

  chunkText(text: string, maxTokens = 500, overlap = 100) {
    const words = text.split(/\s+/);
    const chunks = [];
    let start = 0;
    while (start < words.length) {
      const end = Math.min(start + maxTokens, words.length);
      chunks.push(words.slice(start, end).join(' '));
      start += maxTokens - overlap;
    }
    return chunks;
  }
}
