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
    if (process.env.NODE_ENV === 'production') {
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
   * Generates a signed URL for S3 or returns the local path.
   * @param {string} fileKey - The S3 key or local file path.
   * @returns {Promise<string>} - The URL to download the file.
   */
  static async getFileUrl(fileKey) {
    if (!fileKey) return null;

    if (process.env.NODE_ENV === 'production' && !fileKey.startsWith('/uploads/')) {
      // Generate Pre-signed S3 URL (valid for 1 hour)
      try {
        const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: fileKey,
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
      return `${host}${fileKey}`;
    }
  }
}

module.exports = StorageService;