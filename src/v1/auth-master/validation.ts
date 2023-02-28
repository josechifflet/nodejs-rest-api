import joi from '../../util/joi';

/**
 * Special auth validations to sanitize and analyze request bodies and parameters.
 */
const AuthValidation = {
  // POST /api/v1/auth-master/forgot-password
  forgotPassword: {
    body: joi.object().keys({
      email: joi.string().trim().email().lowercase().required(),
      username: joi.string().normalize().trim().required(),
    }),
  },

  // POST /api/v1/auth-master/login
  login: {
    body: joi.object().keys({
      username: joi.string().normalize().trim().required(),
      password: joi.string().required(),
    }),
  },

  // POST /api/v1/auth-master/register
  register: {
    body: joi.object().keys({
      username: joi.string().normalize().trim().required().max(25),
      email: joi.string().trim().email().lowercase().required().max(50),
      phoneNumber: joi
        .string()
        .trim()
        .required()
        .max(20)
        .pattern(/^[-+0-9]+$/, { name: 'phone' }),
      password: joi.string().required().min(8).max(64),
      name: joi.string().trim().required().max(30),
      lastname: joi.string().trim().required().max(30),
    }),
  },

  // PATCH /api/v1/auth-master/reset-password/:token
  resetPassword: {
    params: joi.object().keys({
      token: joi.string().required(),
    }),
    body: joi.object().keys({
      newPassword: joi.string().required().min(8).max(64),
      confirmPassword: joi.string().required().min(8).max(64),
    }),
  },

  // POST /api/v1/auth-master/otp?media=...
  sendOTP: {
    query: joi.object().keys({
      media: joi.string().valid('email', 'sms', 'authenticator').required(),
    }),
  },

  // PATCH /api/v1/auth-master/update-password
  updatePassword: {
    body: joi.object().keys({
      currentPassword: joi.string().normalize().required(),
      newPassword: joi.string().normalize().required().min(8).max(64),
      confirmPassword: joi.string().normalize().required().min(8).max(64),
    }),
  },

  // PATCH /api/v1/auth-master/verify-email
  verifyEmail: {
    params: joi.object().keys({
      code: joi.string().required(),
      email: joi.string().trim().email().lowercase().required(),
    }),
  },
};

export default AuthValidation;
