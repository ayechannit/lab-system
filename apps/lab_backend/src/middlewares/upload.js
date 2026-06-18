const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
//deployment
// Ensure upload directory exists. On Vercel serverless environments, the filesystem is read-only,
// except for the temporary directory (os.tmpdir()).
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
const uploadDir = isProduction
  ? os.tmpdir()
  : path.join(__dirname, '../../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 5MB default, can be overridden by env
const maxFileSize = (process.env.MAX_FILE_SIZE_MB || 5) * 1024 * 1024;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'result-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const extToMime = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
    return;
  }

  const ext = path.extname(file.originalname || '').toLowerCase();
  if (file.mimetype === 'application/octet-stream' && extToMime[ext]) {
    cb(null, true);
    return;
  }
  cb(new Error('Only PDF and Image (JPEG, PNG, WEBP) files are allowed!'), false);
};

const upload = multer({
  storage: storage,
  limits: { fileSize: maxFileSize },
  fileFilter: fileFilter,
});

const logoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const imageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

const logoFileFilter = (req, file, cb) => {
  if (imageMimeTypes.has(file.mimetype)) {
    cb(null, true);
    return;
  }
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (file.mimetype === 'application/octet-stream' && extToMime[ext]) {
    cb(null, true);
    return;
  }
  cb(new Error('Only image files (JPEG, PNG, GIF, WEBP) are allowed for the logo.'), false);
};

const logoMaxBytes = (process.env.MAX_LOGO_SIZE_MB || 2) * 1024 * 1024;

const uploadLogo = multer({
  storage: logoStorage,
  limits: { fileSize: logoMaxBytes },
  fileFilter: logoFileFilter,
});

const profileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const uploadProfile = multer({
  storage: profileStorage,
  limits: { fileSize: (process.env.MAX_PROFILE_SIZE_MB || 2) * 1024 * 1024 },
  fileFilter: logoFileFilter,
});

module.exports = upload;
module.exports.uploadLogo = uploadLogo;
module.exports.uploadProfile = uploadProfile;