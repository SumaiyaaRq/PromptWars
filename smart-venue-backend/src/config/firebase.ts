import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

if (!admin.apps.length) {
  try {
    // Check if service-account.json exists in the current directory or parent
    const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
    
    if (fs.existsSync(serviceAccountPath)) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath),
      });
      console.log('Firebase Admin SDK initialized successfully using service-account.json');
    } else {
      // Fallback to environment variables if file not found
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/^"|"$/g, ''),
        }),
      });
      console.log('Firebase Admin SDK initialized successfully using environment variables');
    }
  } catch (error) {
    console.error('Firebase Admin SDK initialization error', error);
  }
}

export const auth = admin.auth();
export const db = admin.firestore();