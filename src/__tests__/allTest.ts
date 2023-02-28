import { testAuth } from '../__tests__suites__/e2eAuthentication.spec';
import { testProfile } from '../__tests__suites__/e2eProfile.spec';
import app from '../core/express/app';
import { typeormInstance } from '../db/typeorm-connection';

jest.mock('axios');
jest.mock('aws-sdk', () => ({
  ...jest.requireActual('aws-sdk'),
  config: {
    setPromisesDependency: jest.fn(),
    update: jest.fn(),
  },
}));
describe('Sequentially run all tests', () => {
  beforeAll(async () => {
    await typeormInstance.connect();
  });
  testAuth(app);
  testProfile(app);
});
