// Public surface of the Integration layer (Layer 4).
// Consumers import services + contract types from here:
//   import { services } from '@integration';
//   import type { AiReply } from '@integration/contracts/ai';

export { services, USE_MOCK } from './registry';
export type { ServiceRegistry } from './registry';
export * from './contracts/ai';
export * from './contracts/discovery';
