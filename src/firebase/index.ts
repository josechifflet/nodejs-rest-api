/* eslint-disable @typescript-eslint/no-var-requires */

import * as admin from 'firebase-admin';
import path from 'path';

import logger from '../util/logger';

export class FirebaseAdmin {
  private static instance: FirebaseAdmin;

  public connected = false;
  private app: admin.app.App | null = null;

  private constructor() {
    try {
      const serviceAccount = require(path.join(__dirname, 'credentials.json'));
      this.app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: 'https://**.firebaseio.com',
        databaseAuthVariableOverride: { uid: 'my-service-worker' },
      });
      this.connected = true;
    } catch (error) {
      console.error('error');
    }
  }

  public static getInstance(): FirebaseAdmin {
    if (!FirebaseAdmin.instance) {
      FirebaseAdmin.instance = new FirebaseAdmin();
      logger.info('Successfully connected to the Firebase instance!');
    }
    return FirebaseAdmin.instance;
  }

  public db(): admin.firestore.Firestore {
    if (!this.app?.firestore)
      throw new Error('FirebaseAdmin: this.app?.firestore() is null.');
    return this.app.firestore();
  }
}
