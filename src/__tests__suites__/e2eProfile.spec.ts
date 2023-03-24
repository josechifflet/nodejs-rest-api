import request from 'supertest';

jest.mock('aws-sdk', () => ({
  ...jest.requireActual('aws-sdk'),
  config: { setPromisesDependency: jest.fn(), update: jest.fn() },
}));
export const testProfile = (app: Express.Application) => {
  let userJwt: string;
  let profileJwt: string;
  let createdProfileId: string;

  describe('Running Profile Tests', () => {
    beforeAll(async () => {
      // Login with the user before all tests and save the x-mu-authorization token
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
      userJwt = res.body.data.jwt;
    });

    beforeEach(() => {
      jest.resetAllMocks();
      jest.resetModules();
    });

    afterAll(async () => {
      jest.resetAllMocks();
      jest.resetModules();
    });

    it('Register profile as user /api/v1/profiles/me', async () => {
      const res = await request(app)
        .post('/api/v1/profiles/me')
        .set('Accept', 'application/json')
        .set('x-requested-with', 'supertest')
        .set('x-mu-authorization', userJwt)
        .send({
          password: '12346789',
          username: 'MyProfile',
          email: 'test-profile@test.com',
          name: 'John',
          lastname: 'Doe',
        });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      createdProfileId = res.body.data.profileID;
    });

    describe('Login profile', () => {
      it('Wrong password login profile /api/v1/auth-profile/login', async () => {
        const res = await request(app)
          .post('/api/v1/auth-profile/login')
          .set('Accept', 'application/json')
          .set('x-requested-with', 'supertest')
          .set('x-mu-authorization', userJwt)
          .send({
            password: 'wrong password',
            username: 'MyProfile',
          });
        expect(res.status).toBe(401);
        expect(res.body.status).toBe('fail');
        expect(res.body.message).toBe('Invalid Credentials');
      });

      it('Login profile /api/v1/auth-profile/login', async () => {
        const res = await request(app)
          .post('/api/v1/auth-profile/login')
          .set('Accept', 'application/json')
          .set('x-requested-with', 'supertest')
          .set('x-mu-authorization', userJwt)
          .send({
            password: '12346789',
            username: 'MyProfile',
          });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        profileJwt = res.body.data.jwt;
      });
    });

    it('Get master User profiles /api/v1/profiles/me', async () => {
      const res = await request(app)
        .get('/api/v1/profiles/me')
        .set('Accept', 'application/json')
        .set('x-requested-with', 'supertest')
        .set('x-mu-authorization', userJwt)
        .send();
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    describe('Get single profile', () => {
      it('Get non existing profile and expect to fail /api/v1/profiles/me:id', async () => {
        const res = await request(app)
          .get('/api/v1/profiles/me/' + createdProfileId)
          .set('Accept', 'application/json')
          .set('x-requested-with', 'supertest')
          .set('x-mu-authorization', userJwt + 'wrong-code')
          .send();
        expect(res.status).toBe(401);
        expect(res.body.status).toBe('fail');
      });

      it('Get created profile /api/v1/profiles/me:id', async () => {
        const res = await request(app)
          .get('/api/v1/profiles/me/' + createdProfileId)
          .set('Accept', 'application/json')
          .set('x-requested-with', 'supertest')
          .set('x-mu-authorization', userJwt)
          .send();
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
      });
    });

    describe('Update profile', () => {
      it('Update Profile /api/v1/profiles/me/:id', async () => {
        const res = await request(app)
          .patch('/api/v1/profiles/me/' + createdProfileId)
          .set('Accept', 'application/json')
          .set('x-requested-with', 'supertest')
          .set('x-mu-authorization', userJwt)
          .set('x-profile-authorization', profileJwt)
          .send({
            name: 'Nic2',
            lastname: 'Mauto2',
          });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.data.name).toBe('Nic2');
        expect(res.body.data.lastname).toBe('Mauto2');
      });

      it('Update profile without login profile and fail /api/v1/profiles/me/:id', async () => {
        const res = await request(app)
          .patch('/api/v1/profiles/me/' + createdProfileId)
          .set('Accept', 'application/json')
          .set('x-requested-with', 'supertest')
          .set('x-mu-authorization', userJwt)
          .send({
            name: 'Nic3',
            lastname: 'Mauto3',
          });
        expect(res.status).toBe(401);
        expect(res.body.status).toBe('fail');
      });
    });

    describe('Delete profile', () => {
      it('Delete profile with wrong password /api/v1/profiles/me:id and fails', async () => {
        const res = await request(app)
          .delete('/api/v1/profiles/me/' + createdProfileId)
          .set('Accept', 'application/json')
          .set('x-requested-with', 'supertest')
          .set('x-mu-authorization', userJwt)
          .set('x-profile-authorization', profileJwt)
          .send({ password: 'wrong password' });
        expect(res.status).toBe(401);
        expect(res.body.status).toBe('fail');
      });

      it('Delete profile with Profile password /api/v1/profiles/me:id', async () => {
        const res = await request(app)
          .delete('/api/v1/profiles/me/' + createdProfileId)
          .set('Accept', 'application/json')
          .set('x-requested-with', 'supertest')
          .set('x-mu-authorization', userJwt)
          .set('x-profile-authorization', profileJwt)
          .send({ password: '12346789' });
        expect(res.status).toBe(204);
      });
    });
  });
};
