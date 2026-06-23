const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');
const path = require('path');

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const bucketName = process.env.AWS_S3_BUCKET_NAME;

class StorageService {
  /**
   * Uploads a file to local storage or S3 based on the environment.
   * @param {Object} file - The file object from multer.
   * @returns {Promise<string>} - The URL or key to access the file.
   */
  static async uploadFile(file, folder = 'results') {
    const safeFolder = String(folder || 'results').replace(/^\/+|\/+$/g, '') || 'results';
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
    if (isProduction) {
      // S3 Upload
      const fileStream = fs.createReadStream(file.path);
      const key = `${safeFolder}/${file.filename}`;
      
      const uploadParams = {
        Bucket: bucketName,
        Key: key,
        Body: fileStream,
        ContentType: file.mimetype,
      };

      try {
        await s3Client.send(new PutObjectCommand(uploadParams));
        // Remove local temp file after S3 upload
        fs.unlinkSync(file.path);
        return key; // Return S3 key
      } catch (error) {
        console.error("S3 Upload Error:", error);
        throw new Error("Failed to upload to S3");
      }
    } else {
      // Local Development: Return relative path
      return `/uploads/${file.filename}`;
    }
  }

  /**
   * Normalize a stored file reference (S3 key, local path, or presigned URL) to a storage key/path.
   */
  static normalizeFileKey(fileKey) {
    if (!fileKey || typeof fileKey !== 'string') return null;
    const trimmed = fileKey.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('/uploads/')) return trimmed;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return trimmed;
    try {
      const url = new URL(trimmed);
      return decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    } catch {
      return null;
    }
  }

  static safeAttachmentFilename(filename, fallback = 'download.pdf') {
    const base = path.basename(String(filename || fallback));
    const safe = base.replace(/[^\w.\-()+ ]/g, '_').trim();
    return safe || fallback;
  }

  /**
   * Generates a signed URL for S3 or returns the local path.
   * @param {string} fileKey - The S3 key or local file path.
   * @returns {Promise<string>} - The URL to download the file.
   */
  static async getFileUrl(fileKey) {
    const key = StorageService.normalizeFileKey(fileKey);
    if (!key) return null;
    if (key.startsWith('http://') || key.startsWith('https://')) {
      return key;
    }

    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
    if (isProduction && !key.startsWith('/uploads/')) {
      // Generate Pre-signed S3 URL (valid for 1 hour)
      try {
        const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: key,
        });
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        return signedUrl;
      } catch (error) {
        console.error("S3 Presigned URL Error:", error);
        throw new Error("Failed to generate download link");
      }
    } else {
      // Local Development
      const host = process.env.HOST_URL || `http://localhost:${process.env.PORT || 3000}`;
      return `${host}${key}`;
    }
  }

  /**
   * Presigned URL (or local URL) that prompts the browser to save the file instead of opening inline.
   */
  static async getDownloadUrl(fileKey, filename) {
    const key = StorageService.normalizeFileKey(fileKey);
    if (!key) return null;
    if (key.startsWith('http://') || key.startsWith('https://')) {
      return key;
    }

    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
    const attachmentName = StorageService.safeAttachmentFilename(filename, path.basename(key));

    if (isProduction && !key.startsWith('/uploads/')) {
      try {
        const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: key,
          ResponseContentDisposition: `attachment; filename="${attachmentName}"`,
        });
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        return signedUrl;
      } catch (error) {
        console.error('S3 presigned download URL error:', error);
        throw new Error('Failed to generate download link');
      }
    }

    const host = process.env.HOST_URL || `http://localhost:${process.env.PORT || 3000}`;
    return `${host}${key}`;
  }

  static localAbsolutePath(fileKey) {
    if (!fileKey || !fileKey.startsWith('/uploads/')) return null;
    const uploadsRoot = path.join(__dirname, '../../uploads');
    const abs = path.join(uploadsRoot, path.basename(fileKey));
    if (!abs.startsWith(uploadsRoot)) return null;
    return abs;
  }

  /**
   * Open a stored result file for streaming (local disk or S3).
   * @returns {{ stream, contentType, filename }} or null if missing.
   */
  static async openFile(fileKey) {
    const key = StorageService.normalizeFileKey(fileKey);
    if (!key) return null;

    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
    if (isProduction && !key.startsWith('/uploads/')) {
      try {
        const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: key,
        });
        const response = await s3Client.send(command);
        if (!response.Body) return null;
        return {
          stream: response.Body,
          contentType: response.ContentType || 'application/pdf',
          filename: path.basename(key),
        };
      } catch (error) {
        console.error('S3 open file error:', error);
        return null;
      }
    }

    const abs = StorageService.localAbsolutePath(key);
    if (!abs || !fs.existsSync(abs)) return null;
    return {
      stream: fs.createReadStream(abs),
      contentType: 'application/pdf',
      filename: path.basename(abs),
    };
  }
}

module.exports = StorageService;