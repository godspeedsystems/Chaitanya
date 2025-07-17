import appPromise from './index';
import { setApp, shutdownApp } from './state';

beforeAll(async () => {
  const gsApp = await appPromise;
  setApp(gsApp);
});

afterAll(async () => {
  console.log('done');
});
