import { MasterUserSessionDataSchemaType } from './src/types/masterUserSession';
import { ProfileSessionDataSchemaType } from './src/types/profileSession';

declare module 'express-session' {
  interface SessionData {
    masteruserID?: string;
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
      masterUserSession?: MasterUserSessionDataSchemaType;
      profileSession?: ProfileSessionDataSchemaType;
    };
  }
}

export {};
