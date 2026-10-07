/**
 * Typed message contract between extension contexts (content script, service worker,
 * side panel, devtools). Adding a message means adding one member to DevFlowRequest
 * and one entry to DevFlowResultMap; the compiler then forces every sender and the
 * router to agree on the payload.
 */

import type { ApiResponse } from './api.js';

export interface PingRequest {
  readonly type: 'devflow:ping';
}

/** Discriminated union of everything that can be sent over chrome.runtime messaging. */
export type DevFlowRequest = PingRequest;

export type DevFlowRequestType = DevFlowRequest['type'];

/** Maps each request type to the payload carried in a successful response. */
export interface DevFlowResultMap {
  'devflow:ping': { readonly ready: true; readonly url: string };
}

export type ResponseFor<TRequest extends DevFlowRequest> = ApiResponse<
  DevFlowResultMap[TRequest['type']]
>;
