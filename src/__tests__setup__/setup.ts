import app from '../core/express/app';
import { startServer } from '../core/express/start-server';
import { typeormInstance } from '../db/typeorm-connection';

const setup = async () => {
  await startServer(app);
  await typeormInstance.syncModels(true);
  console.log('Setup Done', new Date().toTimeString().split(' ')[0]);
};
export default setup;
