import { z } from 'zod';

import { profileAttributesValidator } from '../services/profile';

export const ProfileSessionDataSchema = z.object({
  masteruserID: z.string().uuid(),
  profileID: z.string().uuid(),
  profile: profileAttributesValidator,
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

export type ProfileSessionDataSchemaType = z.infer<
  typeof ProfileSessionDataSchema
>;
