import app from './core/express/app';
import log from './util/tslog';

(async () => {
  try {
    await app.constructAsync();
    await app.start();
  } catch (err) {
    log.error(`Exec file error: ${err}`);
  }
})();
