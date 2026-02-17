/**
 * State management for Cyberdyne Profiles
 * Persistent storage of profile metadata and CID mappings
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { homedir } from 'os';

/**
 * Simple state manager
 */
export class StateManager {
  constructor(config = {}) {
    this.statePath = config.statePath || this.getDefaultStatePath();
    this.data = this.load();
  }

  /**
   * Get default state path
   */
  getDefaultStatePath() {
    const home = homedir();
    return `${home}/.cyberdyne/state.json`;
  }

  /**
   * Load state from disk
   */
  load() {
    try {
      if (existsSync(this.statePath)) {
        const content = readFileSync(this.statePath, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn('Failed to load state:', error.message);
    }
    
    return {
      version: 1,
      profiles: {},
      metadata: {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    };
  }

  /**
   * Save state to disk
   */
  save() {
    try {
      // Ensure directory exists
      const dir = dirname(this.statePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      
      // Update timestamp
      this.data.metadata.updated_at = new Date().toISOString();
      
      // Write to disk
      writeFileSync(this.statePath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (error) {
      throw new Error(`Failed to save state: ${error.message}`);
    }
  }

  /**
   * Get profile metadata by telegram ID
   */
  getProfile(telegramId, wallet = null) {
    const key = wallet ? `${wallet}:${telegramId}` : String(telegramId);
    return this.data.profiles[key] || null;
  }

  /**
   * Set profile metadata
   */
  setProfile(telegramId, metadata, wallet = null) {
    const key = wallet ? `${wallet}:${telegramId}` : String(telegramId);
    this.data.profiles[key] = {
      ...metadata,
      updated_at: new Date().toISOString()
    };
    this.save();
  }

  /**
   * Delete profile metadata
   */
  deleteProfile(telegramId, wallet = null) {
    const key = wallet ? `${wallet}:${telegramId}` : String(telegramId);
    delete this.data.profiles[key];
    this.save();
  }

  /**
   * List all profiles
   */
  listProfiles(wallet = null) {
    const profiles = [];
    
    for (const [key, metadata] of Object.entries(this.data.profiles)) {
      if (wallet) {
        // Filter by wallet
        if (key.startsWith(`${wallet}:`)) {
          profiles.push({
            key,
            telegram_id: parseInt(key.split(':')[1]),
            ...metadata
          });
        }
      } else {
        profiles.push({
          key,
          telegram_id: parseInt(key.includes(':') ? key.split(':')[1] : key),
          ...metadata
        });
      }
    }
    
    return profiles;
  }

  /**
   * Clear all state
   */
  clear() {
    this.data = {
      version: 1,
      profiles: {},
      metadata: {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    };
    this.save();
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      total_profiles: Object.keys(this.data.profiles).length,
      state_path: this.statePath,
      created_at: this.data.metadata.created_at,
      updated_at: this.data.metadata.updated_at
    };
  }
}
