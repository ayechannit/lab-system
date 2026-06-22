const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin
try {
  // 1. If FIREBASE_SERVICE_ACCOUNT_JSON is defined as an inline JSON string, use it (recommended for serverless/Vercel)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase Admin initialized with specific inline service account JSON.');
  }
  // 2. Otherwise, if FIREBASE_SERVICE_ACCOUNT_PATH is defined in .env, use the local JSON file path
  else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const configPath = path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    const serviceAccount = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase Admin initialized with specific service account.');
  } 
  // 3. Fallback to default credentials
  else {
    admin.initializeApp();
    console.log('Firebase Admin initialized with default credentials.');
  }
} catch (error) {
  console.error('Firebase Admin initialization error (Notifications will fail):', error.message);
  // We do not throw the error here to allow the server to start even if Firebase is not fully configured yet.
}

module.exports = admin;
