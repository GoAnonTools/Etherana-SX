import path from "path";
import BaseEmbedding from "../models/base/embedding"
import crypto from "crypto"
import fs from 'fs';
import { z } from 'zod';
import { splitText } from "../utils/splitText";
import { PDFParse } from 'pdf-parse';
import { CanvasFactory } from 'pdf-parse/worker';
import officeParser from 'officeparser'

const recordedFileSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    filePath: z.string().min(1),
    contentPath: z.string().min(1),
    uploadedAt: z.string().min(1),
});

const uploadedFilesSchema = z.object({
    files: z.array(recordedFileSchema),
});

const supportedMimeTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'] as const

type SupportedMimeType = typeof supportedMimeTypes[number];

// Magic-byte signatures for each supported type.
// Each entry is [byteOffset, expectedBytes].
const MAGIC_BYTES: Record<SupportedMimeType, { offset: number; bytes: number[] }[]> = {
    'application/pdf': [
        { offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
    ],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
        { offset: 0, bytes: [0x50, 0x4B, 0x03, 0x04] }, // PK (ZIP / OOXML)
    ],
    'text/plain': [], // No magic bytes — validated by UTF-8 decode below
};

// Safe file extensions derived from the real MIME type — never from the user-supplied filename.
const MIME_TO_EXTENSION: Record<SupportedMimeType, string> = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'text/plain': 'txt',
};

/**
 * Verifies the file on disk actually matches the claimed MIME type using magic bytes.
 * For plain text, attempts a UTF-8 decode of the first 4 KB as a sanity check.
 */
const verifyMimeType = (filePath: string, claimedType: SupportedMimeType): boolean => {
    try {
        if (claimedType === 'text/plain') {
            const sample = Buffer.alloc(4096);
            const fd = fs.openSync(filePath, 'r');
            const bytesRead = fs.readSync(fd, sample, 0, 4096, 0);
            fs.closeSync(fd);
            // If it decodes cleanly as UTF-8 it's safe to treat as text
            Buffer.from(sample.subarray(0, bytesRead)).toString('utf-8');
            return true;
        }

        const signatures = MAGIC_BYTES[claimedType];
        if (signatures.length === 0) return true;

        const headerSize = Math.max(...signatures.map(s => s.offset + s.bytes.length));
        const header = Buffer.alloc(headerSize);
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, header, 0, headerSize, 0);
        fs.closeSync(fd);

        return signatures.every(sig =>
            sig.bytes.every((b, i) => header[sig.offset + i] === b)
        );
    } catch {
        return false;
    }
};

type UploadManagerParams = {
    embeddingModel: BaseEmbedding<any>;
}

type RecordedFile = {
    id: string;
    name: string;
    filePath: string;
    contentPath: string;
    uploadedAt: string;
}

type FileRes = {
    fileName: string;
    fileExtension: string;
    fileId: string;
}

class UploadManager {
    private embeddingModel: BaseEmbedding<any>;
    static uploadsDir = path.join(process.env.ETHERANA_DATA_DIR || path.join(process.cwd(), 'data'), 'uploads');
    static uploadedFilesRecordPath = path.join(this.uploadsDir, 'uploaded_files.json');

    constructor(private params: UploadManagerParams) {
        this.embeddingModel = params.embeddingModel;

        if (!fs.existsSync(UploadManager.uploadsDir)) {
            fs.mkdirSync(UploadManager.uploadsDir, { recursive: true });
        }

        if (!fs.existsSync(UploadManager.uploadedFilesRecordPath)) {
            const data = {
                files: []
            }

            fs.writeFileSync(UploadManager.uploadedFilesRecordPath, JSON.stringify(data, null, 2));
        }
    }

    private static getRecordedFiles(): RecordedFile[] {
        const raw = fs.readFileSync(UploadManager.uploadedFilesRecordPath, 'utf-8');

        let parsed: unknown;
        try {
            parsed = JSON.parse(raw);
        } catch {
            console.error('uploaded_files.json is not valid JSON — resetting to empty.');
            fs.writeFileSync(UploadManager.uploadedFilesRecordPath, JSON.stringify({ files: [] }, null, 2));
            return [];
        }

        const result = uploadedFilesSchema.safeParse(parsed);
        if (!result.success) {
            console.error('uploaded_files.json failed schema validation:', result.error.issues);
            throw new Error('Upload record file is corrupted. Please check data/uploads/uploaded_files.json.');
        }

        // Ensure no contentPath escapes the uploads directory
        for (const file of result.data.files) {
            const resolvedContent = path.resolve(file.contentPath);
            if (!resolvedContent.startsWith(path.resolve(UploadManager.uploadsDir))) {
                throw new Error(`Unsafe contentPath detected for file ${file.id} — possible tampering.`);
            }
        }

        return result.data.files;
    }

    private static addNewRecordedFile(fileRecord: RecordedFile) {
        const currentData = this.getRecordedFiles()

        currentData.push(fileRecord);

        fs.writeFileSync(UploadManager.uploadedFilesRecordPath, JSON.stringify({ files: currentData }, null, 2));
    }

    static getFile(fileId: string): RecordedFile | null {
        const recordedFiles = this.getRecordedFiles();

        return recordedFiles.find(f => f.id === fileId) || null;
    }

    static getFileChunks(fileId: string): { content: string; embedding: number[] }[] {
        try {
            const recordedFile = this.getFile(fileId);

            if (!recordedFile) {
                throw new Error(`File with ID ${fileId} not found`);
            }

            const contentData = JSON.parse(fs.readFileSync(recordedFile.contentPath, 'utf-8'))

            return contentData.chunks;
        } catch (err) {
            console.log('Error getting file chunks:', err);
            return [];
        }
    }

    private async extractContentAndEmbed(filePath: string, fileType: SupportedMimeType): Promise<string> {
        switch (fileType) {
            case 'text/plain':
                const content = fs.readFileSync(filePath, 'utf-8');

                const splittedText = splitText(content, 512, 128)
                const embeddings = await this.embeddingModel.embedText(splittedText)

                if (embeddings.length !== splittedText.length) {
                    throw new Error('Embeddings and text chunks length mismatch');
                }

                const contentPath = filePath.split('.').slice(0, -1).join('.') + '.content.json';

                const data = {
                    chunks: splittedText.map((text, i) => {
                        return {
                            content: text,
                            embedding: embeddings[i],
                        }
                    })
                }

                fs.writeFileSync(contentPath, JSON.stringify(data, null, 2));

                return contentPath;
            case 'application/pdf':
                const pdfBuffer = fs.readFileSync(filePath);

                const parser = new PDFParse({
                    data: pdfBuffer,
                    CanvasFactory
                })

                const pdfText = await parser.getText().then(res => res.text)

                const pdfSplittedText = splitText(pdfText, 512, 128)
                const pdfEmbeddings = await this.embeddingModel.embedText(pdfSplittedText)

                if (pdfEmbeddings.length !== pdfSplittedText.length) {
                    throw new Error('Embeddings and text chunks length mismatch');
                }

                const pdfContentPath = filePath.split('.').slice(0, -1).join('.') + '.content.json';

                const pdfData = {
                    chunks: pdfSplittedText.map((text, i) => {
                        return {
                            content: text,
                            embedding: pdfEmbeddings[i],
                        }
                    })
                }

                fs.writeFileSync(pdfContentPath, JSON.stringify(pdfData, null, 2));

                return pdfContentPath;
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                const docBuffer = fs.readFileSync(filePath);

                const docText = (await officeParser.parseOffice(docBuffer)).toText()

                const docSplittedText = splitText(docText, 512, 128)
                const docEmbeddings = await this.embeddingModel.embedText(docSplittedText)

                if (docEmbeddings.length !== docSplittedText.length) {
                    throw new Error('Embeddings and text chunks length mismatch');
                }

                const docContentPath = filePath.split('.').slice(0, -1).join('.') + '.content.json';

                const docData = {
                    chunks: docSplittedText.map((text, i) => {
                        return {
                            content: text,
                            embedding: docEmbeddings[i],
                        }
                    })
                }

                fs.writeFileSync(docContentPath, JSON.stringify(docData, null, 2));

                return docContentPath;
            default:
                throw new Error(`Unsupported file type: ${fileType}`);
        }
    }

    async processFiles(files: File[]): Promise<FileRes[]> {
        const processedFiles: FileRes[] = [];

        await Promise.all(files.map(async (file) => {
            // 2.1 — Check the client-supplied MIME type is in the supported list
            if (!(supportedMimeTypes as unknown as string[]).includes(file.type)) {
                throw new Error(`File type ${file.type} not supported`);
            }

            const claimedType = file.type as SupportedMimeType;

            // 2.2 — Derive the extension from the verified MIME type, never from the filename
            const fileExtension = MIME_TO_EXTENSION[claimedType];
            const fileId = crypto.randomBytes(16).toString('hex');
            const fileName = `${crypto.randomBytes(16).toString('hex')}.${fileExtension}`;
            const filePath = path.join(UploadManager.uploadsDir, fileName);

            const buffer = Buffer.from(await file.arrayBuffer())
            fs.writeFileSync(filePath, buffer);

            // 2.1 — Verify the bytes on disk actually match the claimed type
            if (!verifyMimeType(filePath, claimedType)) {
                fs.unlinkSync(filePath);
                throw new Error(`File content does not match the declared type "${claimedType}". Upload rejected.`);
            }

            const contentFilePath = await this.extractContentAndEmbed(filePath, claimedType);

            const fileRecord: RecordedFile = {
                id: fileId,
                name: file.name,
                filePath: filePath,
                contentPath: contentFilePath,
                uploadedAt: new Date().toISOString(),
            }

            UploadManager.addNewRecordedFile(fileRecord);

            processedFiles.push({
                fileExtension: fileExtension,
                fileId,
                fileName: file.name
            });
        }))

        return processedFiles;
    }
}

export default UploadManager;