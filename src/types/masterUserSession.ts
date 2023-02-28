import { z } from 'zod';

import { masteruserAttributesValidator } from '../services/masteruser';

export const MasterUserSessionDataSchema = z.object({
  masteruserID: z.string().uuid(),
  masteruser: masteruserAttributesValidator,
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

export type MasterUserSessionDataSchemaType = z.infer<
  typeof MasterUserSessionDataSchema
>;
