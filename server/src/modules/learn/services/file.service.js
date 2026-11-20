import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { UploadedFile } from '../models/uploadedFile.model.js';
import { Message } from '../models/message.model.js';
import { AppError } from '../../../utils/response.js';
import { env } from '../../../config/env.js';

export const ALLOWED_MIME_TYPES = new Set(
  (env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/webp,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);

export const MAX_FILE_SIZE = (env.MAX_UPLOAD_FILE_SIZE_MB || 10) * 1024 * 1024; // MB to bytes
export const MAX_FILES_PER_REQUEST = 5;

// Root uploads directory: <server>/uploads/learn
const UPLOAD_ROOT_DIR = path.resolve(process.cwd(), 'uploads', 'learn');

/**
 * Validates binary signature (magic bytes) to prevent spoofed/malicious extensions.
 *
 * @param {Buffer} buffer
 * @param {string} mimeType
 * @returns {boolean}
 */
export function verifyMagicBytes(buffer, mimeType) {
  if (!buffer || buffer.length === 0) {
    return false;
  }

  // 1. JPEG: FF D8 FF
  if (mimeType === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (mimeType === 'image/png') {
    return (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  // 3. WEBP: RIFF....WEBP
  if (mimeType === 'image/webp') {
    if (buffer.length < 12) return false;
    const riff = buffer.toString('ascii', 0, 4);
    const webp = buffer.toString('ascii', 8, 12);
    return riff === 'RIFF' && webp === 'WEBP';
  }

  // 4. PDF: starts with %PDF- (25 50 44 46 2D) in the header
  if (mimeType === 'application/pdf') {
    if (buffer.length < 5) return false;
    const header = buffer.slice(0, Math.min(buffer.length, 1024)).toString('ascii');
    return header.includes('%PDF-');
  }

  // 5. DOCX: Zip archive signature: 50 4B 03 04 or 50 4B 05 06 or 50 4B 07 08
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return (
      buffer.length >= 4 &&
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      ((buffer[2] === 0x03 && buffer[3] === 0x04) ||
        (buffer[2] === 0x05 && buffer[3] === 0x06) ||
        (buffer[2] === 0x07 && buffer[3] === 0x08))
    );
  }

  // 6. Plain Text / Markdown: Valid text without binary null bytes (0x00)
  if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
    const checkLen = Math.min(buffer.length, 1024);
    for (let i = 0; i < checkLen; i++) {
      if (buffer[i] === 0) return false;
    }
    return true;
  }

  return false;
}

export const ALLOWED_EXTENSIONS_BY_MIME = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt', '.text'],
  'text/markdown': ['.md', '.markdown'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
};

export const DEFAULT_EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'text/markdown': '.md',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

/**
 * Resolves appropriate file extension based on MIME type and original filename.
 * Strictly verifies that the extension is allowed for the validated MIME type.
 */
export function resolveExtension(originalName, mimeType) {
  const ext = path.extname(originalName || '').toLowerCase();
  const allowedList = ALLOWED_EXTENSIONS_BY_MIME[mimeType];
  if (allowedList && allowedList.includes(ext)) {
    return ext;
  }
  return DEFAULT_EXT_BY_MIME[mimeType] || '.bin';
}

/**
 * Multer memory storage configuration.
 */
const multerStorage = multer.memoryStorage();
export const upload = multer({
  storage: multerStorage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES_PER_REQUEST,
  },
});

/**
 * Saves uploaded files into user's isolated storage directory and creates DB records.
 *
 * @param {Array<Express.Multer.File>} files
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @returns {Promise<Array<Object>>}
 */
export async function processAndSaveFiles(files, userId) {
  if (!files || files.length === 0) {
    throw new AppError('Không có tệp nào được tải lên', 400);
  }

  if (files.length > MAX_FILES_PER_REQUEST) {
    throw new AppError(`Tối đa ${MAX_FILES_PER_REQUEST} tệp cho mỗi lần gửi`, 400);
  }

  const userIdStr = userId.toString();
  const userUploadDir = path.join(UPLOAD_ROOT_DIR, userIdStr);
  await fs.promises.mkdir(userUploadDir, { recursive: true });

  const savedFiles = [];

  for (const file of files) {
    // 1. Check file size
    if (!file.buffer || file.size === 0) {
      throw new AppError(`Tệp "${file.originalname}" không có nội dung (0 bytes)`, 400);
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new AppError(`Tệp "${file.originalname}" vượt quá giới hạn 10MB`, 400);
    }

    // 2. Check MIME type
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new AppError(
        `Loại tệp "${file.mimetype}" không được hỗ trợ. Chỉ chấp nhận JPG, PNG, WEBP, PDF, TXT, MD, DOCX.`,
        400
      );
    }

    // 3. Verify magic bytes
    const isValidSignature = verifyMagicBytes(file.buffer, file.mimetype);
    if (!isValidSignature) {
      throw new AppError(
        `Nội dung tệp "${file.originalname}" không khớp với định dạng "${file.mimetype}" (chữ ký nhị phân không hợp lệ).`,
        400
      );
    }

    // 4. Save to disk
    const ext = resolveExtension(file.originalname, file.mimetype);
    const safeFilename = `${crypto.randomUUID()}${ext}`;
    const storagePath = path.join(userUploadDir, safeFilename);

    await fs.promises.writeFile(storagePath, file.buffer);

    // 5. Create database record
    const uploadedRecord = await UploadedFile.create({
      userId,
      originalName: file.originalname,
      mime: file.mimetype,
      size: file.size,
      storagePath,
    });

    savedFiles.push({
      fileId: uploadedRecord._id.toString(),
      name: uploadedRecord.originalName,
      mime: uploadedRecord.mime,
      size: uploadedRecord.size,
      url: `/api/v1/chat/files/${uploadedRecord._id}`,
    });
  }

  return savedFiles;
}

/**
 * Finds a file owned by the specified user.
 */
export async function getFileRecord(fileId, userId) {
  const file = await UploadedFile.findById(fileId);
  if (!file) {
    return { status: 404, file: null, error: 'File not found' };
  }
  if (file.userId.toString() !== userId.toString()) {
    return { status: 403, file: null, error: 'Forbidden' };
  }
  return { status: 200, file, error: null };
}

/**
 * Deletes a single uploaded file from DB and disk.
 */
export async function deleteFileRecord(fileId, userId) {
  const { status, file, error } = await getFileRecord(fileId, userId);
  if (status !== 200) {
    throw new AppError(error || 'Cannot delete file', status);
  }

  // Remove physical file from disk
  try {
    if (fs.existsSync(file.storagePath)) {
      await fs.promises.unlink(file.storagePath);
    }
  } catch (err) {
    console.warn(`[FileService] Failed to unlink file ${file.storagePath}:`, err.message);
  }

  await UploadedFile.deleteOne({ _id: fileId });
  return { deletedFileId: fileId };
}

/**
 * Cleans up all physical files attached to messages in a conversation when it is deleted.
 */
export async function cleanupConversationFiles(conversationId, userId) {
  try {
    const messages = await Message.find({
      conversationId,
      userId,
      'attachments.0': { $exists: true },
    }).lean();

    const fileIds = [];
    for (const msg of messages) {
      if (Array.isArray(msg.attachments)) {
        for (const att of msg.attachments) {
          if (att.fileId) {
            fileIds.push(att.fileId);
          }
        }
      }
    }

    if (fileIds.length === 0) return 0;

    const files = await UploadedFile.find({ _id: { $in: fileIds }, userId });
    for (const f of files) {
      try {
        if (fs.existsSync(f.storagePath)) {
          await fs.promises.unlink(f.storagePath);
        }
      } catch (unlinkErr) {
        console.warn(`[FileService] Unlink error during conv cleanup:`, unlinkErr.message);
      }
    }

    const deleteRes = await UploadedFile.deleteMany({ _id: { $in: fileIds }, userId });
    return deleteRes.deletedCount;
  } catch (err) {
    console.warn(`[FileService] Conversation files cleanup error:`, err.message);
    return 0;
  }
}

export const fileService = {
  upload,
  verifyMagicBytes,
  processAndSaveFiles,
  getFileRecord,
  deleteFileRecord,
  cleanupConversationFiles,
};

export default fileService;
