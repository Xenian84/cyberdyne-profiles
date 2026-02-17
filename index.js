/**
 * Cyberdyne Profiles
 * Main export file
 */

// Core exports
export { ProfileManager } from './lib/manager.js';
export { 
  validateProfile, 
  createDefaultProfile,
  enhanceProfile,
  sanitizeProfile,
  calculateLevel,
  calculateXP,
  calculateXPToNext,
  autoAssignBadges,
  calculateSkills
} from './lib/schema.js';
export { profileToTOON, profileFromTOON, calculateProfileSavings } from './lib/toon.js';
export { CryptoBox, sha256, deriveKey, encrypt, decrypt } from './lib/crypto.js';
export { IPFSStorage, StorageAdapter } from './lib/storage.js';
export { StateManager } from './lib/state.js';

// Namespace exports
export * as schema from './lib/schema.js';
export * as toon from './lib/toon.js';
export * as crypto from './lib/crypto.js';
export * as storage from './lib/storage.js';
export * as state from './lib/state.js';

// Version
export const VERSION = '1.0.0';
