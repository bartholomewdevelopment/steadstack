const admin = require('firebase-admin');

// Initialize Firebase Admin
// In production, use service account credentials
// For development, use the default app with project ID only
if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      // Parse the service account JSON
      let serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

      // Handle escaped newlines in private key (common issue with .env files)
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase Admin initialized with service account');
    } catch (error) {
      console.error('Failed to parse Firebase service account:', error.message);
      // Fall back to project ID only
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'stead-stack',
      });
      console.log('Firebase Admin initialized with project ID only (fallback)');
    }
  } else {
    // Development: use project ID only (requires gcloud auth or emulator)
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'stead-stack',
    });
    console.log('Firebase Admin initialized with project ID only');
  }
}

// Export both admin and firestore for convenience
const db = admin.firestore();

module.exports = { admin, db };
