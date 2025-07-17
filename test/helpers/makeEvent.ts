import { GSCloudEvent, GSActor } from '@godspeedsystems/core';

export function makeEvent(data: Record<string, any>) {
  return new GSCloudEvent('', '', new Date(), '', '', data, 'REST', new GSActor('user'), {});
}