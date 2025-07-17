import { GSContext, logger } from '@godspeedsystems/core';
import { makeEvent } from './makeEvent';
import { getApp } from '../state';

export async function makeContext(data: Record<string, any>) {
  const app = await getApp();
  const event = makeEvent(data);
  const childLogger = logger.child(app.getCommonAttrs(event));
  return new GSContext(app.config, app.datasources, event, app.mappings, app.nativeFunctions, app.plugins, logger, childLogger);
}