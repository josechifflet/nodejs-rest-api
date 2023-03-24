import { UserSessionDataSchemaType } from './src/types/userSession';
import { ProfileSessionDataSchemaType } from './src/types/profileSession';

declare module 'express-session' {
  interface SessionData {
    userID?: string;
    lastActive?: string;
    sessionInfo?: {
      device?: string;
      ip?: string;
    };
    signedIn?: string;
  }
}

declare module 'express' {
  interface Response {
    locals: {
      userSession?: UserSessionDataSchemaType;
      profileSession?: ProfileSessionDataSchemaType;
    };
  }
}

export {};
