import joi from '../../util/joi';

/**
 * Special profile validations to sanitize and analyze request bodies and parameters.
 */
const ProfileValidation = {
  // POST /api/v1/profiles/me
  createProfile: {
    body: joi.object().keys({
      username: joi.string().normalize().trim().required().max(25),
      name: joi.string().normalize().trim().required().max(25),
      lastname: joi.string().normalize().trim().required().max(25),
      password: joi.string().required().min(8).max(64),
      email: joi.string().trim().email().lowercase().required().max(50),
    }),
  },

  // DELETE /api/v1/profiles/me/:profileID
  deleteProfile: {
    params: joi.object().keys({
      id: joi.string().uuid({ version: 'uuidv4' }).required(),
    }),
    body: joi.object().required().keys({
      password: joi.string().required().min(8).max(64),
    }),
  },

  // GET /api/v1/profiles/me/:profileID
  getProfile: {
    params: joi.object().keys({
      id: joi.string().uuid({ version: 'uuidv4' }).required(),
    }),
  },

  // PATCH /api/v1/profiles/me/:profileID
  updateMyProfile: {
    body: joi.object().keys({
      username: joi.string().normalize().trim().max(25),
      password: joi.string().normalize(),
      name: joi.string().normalize().trim().max(25),
      lastname: joi.string().normalize().trim().max(25),
      email: joi.string().trim().email().lowercase().max(50),
      profileImg: joi.string().trim().max(100),
    }),
    params: joi.object().keys({
      id: joi.string().uuid({ version: 'uuidv4' }).required(),
    }),
  },
};

export default ProfileValidation;
