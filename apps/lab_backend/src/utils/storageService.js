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

/** Folders that are uploaded to S3 in all environments when AWS is configured (mobile-facing assets). */
const S3_ALWAYS_FOLDERS = new Set(['advertisements']);

class StorageService {
  static isProduction() {
    return process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  }

  static isS3Configured() {
    return Boolean(
      bucketName &&
        process.env.AWS_REGION &&
        process.env.AWS_ACCESS_KEY_ID &&
        process.env.AWS_SECRET_ACCESS_KEY,
    );
  }

  static isS3StorageKey(fileKey) {
    const key = StorageService.normalizeFileKey(fileKey);
    if (!key) return false;
    if (key.startsWith('/uploads/')) return false;
    if (key.startsWith('http://') || key.startsWith('https://')) return false;
    return true;
  }

  static shouldUploadToS3(folder) {
    if (StorageService.isProduction()) return true;
    if (!StorageService.isS3Configured()) return false;
    if (process.env.USE_S3_STORAGE === 'true') return true;
    const safeFolder = String(folder || 'results').replace(/^\/+|\/+$/g, '') || 'results';
    return S3_ALWAYS_FOLDERS.has(safeFolder);
  }

  static isPresignedS3Url(url) {
    try {
      const u = new URL(url);
      return u.searchParams.has('X-Amz-Signature') || u.searchParams.has('X-Amz-Algorithm');
    } catch {
      return false;
    }
  }

  static isDirectS3Url(url) {
    try {
      const host = new URL(url).hostname.toLowerCase();
      return host.includes('.s3.') || host.startsWith('s3.');
    } catch {
      return false;
    }
  }

  static extractS3ObjectKey(fileKey) {
    const key = StorageService.normalizeFileKey(fileKey);
    if (!key) return null;
    if (key.startsWith('/uploads/')) return null;
    if (key.startsWith('http://') || key.startsWith('https://')) return null;
    return key;
  }

  static async presignPublicMediaKey(fileKey) {
    const objectKey = StorageService.extractS3ObjectKey(fileKey);
    if (!objectKey || !StorageService.isPublicMediaKey(objectKey)) return null;
    return StorageService.getPresignedUrl(objectKey);
  }

  /**
   * Uploads a file to local storage or S3 based on the environment.
   * @param {Object} file - The file object from multer.
   * @returns {Promise<string>} - The URL or key to access the file.
   */
  static async uploadFile(file, folder = 'results') {
    const safeFolder = String(folder || 'results').replace(/^\/+|\/+$/g, '') || 'results';
    if (StorageService.shouldUploadToS3(safeFolder)) {
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
        fs.unlinkSync(file.path);
        return key;
      } catch (error) {
        console.error('S3 Upload Error:', error);
        throw new Error('Failed to upload to S3');
      }
    }

    return `/uploads/${file.filename}`;
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
      let pathKey = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
      if (url.hostname.startsWith('s3.') && bucketName && pathKey.startsWith(`${bucketName}/`)) {
        pathKey = pathKey.slice(bucketName.length + 1);
      }
      return pathKey;
    } catch {
      return null;
    }
  }

  static safeAttachmentFilename(filename, fallback = 'download.pdf') {
    const base = path.basename(String(filename || fallback));
    const safe = base.replace(/[^\w.\-()+ ]/g, '_').trim();
    return safe || fallback;
  }

  static isLocalhostUrl(url) {
    try {
      const host = new URL(url).hostname.toLowerCase();
      return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
    } catch {
      return false;
    }
  }

  static getApiHost() {
    const explicit = (process.env.HOST_URL || '').trim().replace(/\/$/, '');
    if (explicit) return explicit;
    const vercel = (process.env.VERCEL_URL || '').trim().replace(/\/$/, '');
    if (vercel) return vercel.startsWith('http') ? vercel : `https://${vercel}`;
    if (StorageService.isProduction()) {
      return '';
    }
    return `http://localhost:${process.env.PORT || 3000}`;
  }

  static buildApiMediaUrl(key) {
    const host = StorageService.getApiHost();
    if (!host) return null;
    return `${host}/api/media/${StorageService.buildPublicMediaPath(key)}`;
  }

  static getContentTypeFromKey(key) {
    const ext = path.extname(String(key || '')).toLowerCase();
    const map = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
    };
    return map[ext] || 'application/octet-stream';
  }

  /** Storage keys that may be streamed without auth (public banners, logos, etc.). */
  static isPublicMediaKey(fileKey) {
    const key = String(fileKey || '').replace(/^\/+/, '');
    if (!key) return false;
    const allowedPrefixes = ['advertisements/'];
    return allowedPrefixes.some((prefix) => key.startsWith(prefix));
  }

  static buildPublicMediaPath(key) {
    return String(key)
      .replace(/^\/+/, '')
      .split('/')
      .map(encodeURIComponent)
      .join('/');
  }

  static getPresignExpiresIn() {
    const raw = parseInt(process.env.AWS_S3_PRESIGN_EXPIRES_SECONDS || '604800', 10);
    if (!Number.isFinite(raw)) return 604800;
    return Math.min(Math.max(raw, 60), 604800);
  }

  static async getPresignedUrl(fileKey) {
    const key = StorageService.normalizeFileKey(fileKey);
    if (!key || !StorageService.isS3StorageKey(key) || !StorageService.isS3Configured()) {
      return null;
    }
    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      return await getSignedUrl(s3Client, command, { expiresIn: StorageService.getPresignExpiresIn() });
    } catch (error) {
      console.error('S3 Presigned URL Error:', error);
      throw new Error('Failed to generate download link');
    }
  }

  /**
   * Resolves a stored key/path to a URL clients can load in <img> tags.
   * S3-backed banners always use presigned URLs — never localhost or /api/media proxy.
   */
  static async getPublicDisplayUrl(fileKey) {
    const key = StorageService.normalizeFileKey(fileKey);
    if (!key) return null;

    if (key.startsWith('http://') || key.startsWith('https://')) {
      if (StorageService.isLocalhostUrl(key)) {
        return StorageService.presignPublicMediaKey(key);
      }
      if (StorageService.isPresignedS3Url(key)) {
        return key;
      }
      if (StorageService.isDirectS3Url(key)) {
        return StorageService.presignPublicMediaKey(key);
      }
      return null;
    }

    if (!StorageService.isPublicMediaKey(key)) {
      if (key.startsWith('/uploads/')) {
        const host = StorageService.getApiHost();
        return host ? `${host}${key}` : null;
      }
      return null;
    }

    const presigned = await StorageService.presignPublicMediaKey(key);
    if (presigned) return presigned;

    if (StorageService.isProduction()) {
      console.error('AWS S3 is not configured on production; cannot resolve advertisement image:', key);
      return null;
    }

    const localAbs = StorageService.resolveLocalAbsolutePath(key);
    if (localAbs && fs.existsSync(localAbs)) {
      return StorageService.buildApiMediaUrl(key);
    }
    return null;
  }

  static resolveLocalAbsolutePath(key) {
    if (key.startsWith('/uploads/')) {
      return StorageService.localAbsolutePath(key);
    }
    const basename = path.basename(key);
    const uploadPath = `/uploads/${basename}`;
    const abs = StorageService.localAbsolutePath(uploadPath);
    if (abs && fs.existsSync(abs)) return abs;
    return StorageService.localAbsolutePath(key);
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

    if (StorageService.isS3StorageKey(key) && StorageService.isS3Configured()) {
      return StorageService.getPresignedUrl(key);
    } else {
      // Local Development
      const host = process.env.HOST_URL || `http://localhost:${process.env.PORT || 3000}`;
      if (key.startsWith('/uploads/')) {
        return `${host}${key}`;
      }
      // S3-style key (e.g. advertisements/ad-banner-123.jpeg) while running locally
      const basename = path.basename(key);
      const localUploadPath = `/uploads/${basename}`;
      const abs = StorageService.localAbsolutePath(localUploadPath);
      if (abs && fs.existsSync(abs)) {
        return `${host}${localUploadPath}`;
      }
      return `${host}/${key.replace(/^\/+/, '')}`;
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

    const attachmentName = StorageService.safeAttachmentFilename(filename, path.basename(key));

    if (StorageService.isS3StorageKey(key) && StorageService.isS3Configured()) {
      try {
        const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: key,
          ResponseContentDisposition: `attachment; filename="${attachmentName}"`,
        });
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: StorageService.getPresignExpiresIn() });
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

    const contentTypeFallback = StorageService.getContentTypeFromKey(key);
    if (StorageService.isS3StorageKey(key) && StorageService.isS3Configured()) {
      try {
        const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: key,
        });
        const response = await s3Client.send(command);
        if (!response.Body) return null;
        return {
          stream: response.Body,
          contentType: response.ContentType || contentTypeFallback,
          filename: path.basename(key),
        };
      } catch (error) {
        console.error('S3 open file error:', error);
        return null;
      }
    }

    const abs = StorageService.resolveLocalAbsolutePath(key);
    if (!abs || !fs.existsSync(abs)) return null;
    return {
      stream: fs.createReadStream(abs),
      contentType: contentTypeFallback,
      filename: path.basename(abs),
    };
  }
}

module.exports = StorageService;