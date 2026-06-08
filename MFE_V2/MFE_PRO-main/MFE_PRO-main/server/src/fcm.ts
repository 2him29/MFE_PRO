import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

/**
 * Initialize Firebase Admin SDK.
 * Call this ONCE at server startup (import this file in index.ts).
 *
 * HOW TO GET YOUR SERVICE ACCOUNT KEY:
 * 1. Go to https://console.firebase.google.com
 * 2. Create a project (or use existing one)
 * 3. Project Settings → Service Accounts → Generate new private key
 * 4. Save the downloaded JSON as: server/firebase-service-account.json
 * 5. Add to .gitignore: firebase-service-account.json
 */

const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');

if (!admin.apps.length) {
  if (fs.existsSync(serviceAccountPath)) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
    });
    console.log('✅ Firebase Admin SDK initialized');
  } else {
    console.warn('⚠️  firebase-service-account.json not found — FCM notifications disabled');
    // Initialize with no credentials (notifications will fail gracefully)
    admin.initializeApp();
  }
}

export default admin;
