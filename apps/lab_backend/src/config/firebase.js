const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin
try {
  // If FIREBASE_SERVICE_ACCOUNT_PATH is defined in .env, use it.
  // Otherwise, fallback to application default credentials 
  // (which looks for GOOGLE_APPLICATION_CREDENTIALS environment variable)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const configPath = path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    const serviceAccount = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase Admin initialized with specific service account.');
  } else {
    admin.initializeApp();
    console.log('Firebase Admin initialized with default credentials.');
  }
} catch (error) {
  console.error('Firebase Admin initialization error (Notifications will fail):', error.message);
  // We do not throw the error here to allow the server to start even if Firebase is not fully configured yet.
}

module.exports = admin;
