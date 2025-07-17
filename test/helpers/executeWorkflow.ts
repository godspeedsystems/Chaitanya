
import { GSStatus, GSContext } from '@godspeedsystems/core';
import { getApp } from '../state';

export async function executeWorkflow(ctx: GSContext, workflowName: string, args: Record<string, unknown> = {}){
  const gsApp = await getApp();
  const workflow = gsApp.workflows[workflowName];
  const result: GSStatus = await workflow(ctx, args);
  return result;
}
