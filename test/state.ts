
let appInstance: any = null;

export function setApp(app: any) {
  appInstance = app;
}

export function getApp() {
  if (!appInstance) {
    throw new Error('Godspeed app not initialized. Did you forget to require test/setup.ts?');
  }
  return appInstance;
}

export async function shutdownApp() {
  if (appInstance?.shutdown) {
    await appInstance.shutdown();
  }
}
