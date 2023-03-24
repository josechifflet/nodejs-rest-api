import { z } from 'zod';

import { userAttributesValidator } from '../services/user';

export const UserSessionDataSchema = z.object({
  userID: z.string().uuid(),
  user: userAttributesValidator,
  lastActive: z.string(),
  sessionInfo: z.object({ device: z.string(), ip: z.string() }),
  signedIn: z.string(),
  jwtId: z.string().uuid(),
  jwtPayload: z.object({
    aud: z.string(),
    exp: z.number(),
    iat: z.number(),
    iss: z.string(),
    jti: z.string().uuid(),
    nbf: z.number(),
    sub: z.string(),
  }),
});

export type UserSessionDataSchemaType = z.infer<typeof UserSessionDataSchema>;
