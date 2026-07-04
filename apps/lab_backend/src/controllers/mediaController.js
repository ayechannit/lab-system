const StorageService = require('../utils/storageService');

function getMediaKeyFromRequest(req) {
  const param = req.params.key;
  if (Array.isArray(param)) {
    return param.map((segment) => decodeURIComponent(String(segment))).join('/');
  }
  if (typeof param === 'string' && param.trim()) {
    return decodeURIComponent(param.replace(/^\/+/, ''));
  }
  const fromPath = String(req.path || '').replace(/^\/+/, '');
  if (!fromPath) return '';
  return fromPath.split('/').map((segment) => decodeURIComponent(segment)).join('/');
}

const streamPublicFile = async (req, res) => {
  try {
    const key = getMediaKeyFromRequest(req);
    if (!key || !StorageService.isPublicMediaKey(key)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const opened = await StorageService.openFile(key);
    if (!opened) {
      return res.status(404).json({ message: 'File not found' });
    }

    res.setHeader('Content-Type', opened.contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Disposition', `inline; filename="${opened.filename}"`);
    opened.stream.pipe(res);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  streamPublicFile,
};
