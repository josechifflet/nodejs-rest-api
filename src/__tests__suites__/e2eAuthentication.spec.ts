import crypto from 'crypto';
import request from 'supertest';

jest.mock('aws-sdk', () => ({
  ...jest.requireActual('aws-sdk'),
  config: { setPromisesDependency: jest.fn(), update: jest.fn() },
}));
export const testAuth = (app: Express.Application) => {
  const UUID_VERIFY_EMAIL = '969f6ef0-ab5a-452e-a7ae-dd8f78f4ff18';
  let jwt: string;

  describe('Running Authentication Tests', () => {
    beforeEach(() => {
      jest.resetAllMocks();
      jest.resetModules();
    });

    afterAll(async () => {
      jest.resetAllMocks();
      jest.resetModules();
    });

    it('Signup step 1: create user /api/v1/auth-master/register', async () => {
      jest.spyOn(crypto, 'randomUUID').mockReturnValue(UUID_VERIFY_EMAIL);

      const res = await request(app)
        .post('/api/v1/auth-master/register')
        .set('Accept', 'application/json')
        .set('x-requested-with', 'supertest')
        .send({
          email: 'user@gmail.com',
          phoneNumber: '59898123456',
          username: 'User',
          password: '12346789',
          name: 'John',
          lastname: 'Doe',
        });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
    });

    it('Signup step 2: verify user email /api/v1/auth-master/verify-email/:code/:email', async () => {
      const res = await request(app)
        .patch(
          `/api/v1/auth-master/verify-email/${UUID_VERIFY_EMAIL}/user@gmail.com`
        )
        .set('Accept', 'application/json')
        .set('x-requested-with', 'supertest')
        .send();
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    it('Login step 1: login user /api/v1/auth-master/login', async () => {
      const res = await request(app)
        .post('/api/v1/auth-master/login')
        .set('Accept', 'application/json')
        .set('x-requested-with', 'supertest')
        .send({
          username: 'User',
          password: '12346789',
        });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      jwt = res.body.data.jwt;
    });

    it('Logout step 1: logut user /api/v1/auth-master/logout', async () => {
      const res = await request(app)
        .post('/api/v1/auth-master/logout')
        .set('Accept', 'application/json')
        .set('x-requested-with', 'supertest')
        .set('x-mu-authorization', jwt)
        .send();
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });
  });
};
