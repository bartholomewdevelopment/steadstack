const admin = require('firebase-admin');

// Initialize Firebase Admin
// In production, use service account credentials
// For development, use the default app with project ID only
if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Production: use service account JSON
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    // Development: use project ID only (requires gcloud auth or emulator)
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'stead-stack',
    });
  }
}

module.exports = admin;
