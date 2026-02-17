/**
 * Cyberdyne Profile Manager
 * Main API for creating, updating, and retrieving profiles
 */

import { validateProfile, enhanceProfile, sanitizeProfile } from './schema.js';
import { profileToTOON, profileFromTOON } from './toon.js';
import { CryptoBox, sha256 } from './crypto.js';
import { StorageAdapter } from './storage.js';
import { StateManager } from './state.js';

/**
 * Profile Manager
 */
export class ProfileManager {
  constructor(config = {}) {
    this.config = {
      walletPubkey: config.walletPubkey,
      walletSecretKeyBase58: config.walletSecretKeyBase58,
      derivationMsg: config.derivationMsg || 'IPFS_ENCRYPTION_KEY_V1',
      format: config.format || 'toon', // 'json' or 'toon'
      statePath: config.statePath,
      ...config
    };
    
    // Initialize components
    this.crypto = config.crypto || new CryptoBox(
      this.config.walletPubkey,
      this.config.walletSecretKeyBase58,
      this.config.derivationMsg
    );
    
    this.storage = config.storage || new StorageAdapter(
      config.ipfsUrl || config.baseUrl || 'https://vault.x1.xyz/ipfs'
    );
    
    this.state = config.state || new StateManager({
      statePath: this.config.statePath
    });
  }

  /**
   * Create a new profile
   */
  async create(profileData) {
    try {
      // Enhance profile with auto-calculated fields
      const profile = enhanceProfile(profileData);
      
      // Validate
      const validation = validateProfile(profile);
      if (!validation.valid) {
        throw new Error(`Profile validation failed: ${validation.errors.join(', ')}`);
      }
      
      const telegramId = profile.identity.telegram_id;
      const wallet = profile.identity.wallet || this.config.walletPubkey;
      
      // Check for existing profile
      const existing = this.state.getProfile(telegramId, wallet);
      if (existing && existing.cid) {
        profile.metadata.previous_cid = existing.cid;
        profile.version = String(parseInt(existing.version || '2') + 1);
      }
      
      // Determine format
      const format = this.config.format;
      let plaintext;
      
      if (format === 'toon') {
        plaintext = profileToTOON(profile);
      } else {
        plaintext = JSON.stringify(profile, null, 2);
      }
      
      // Calculate SHA256
      const plaintextSha256 = sha256(plaintext);
      
      // Encrypt
      const encryptedPayload = await this.crypto.encrypt(plaintext);
      
      // Upload to IPFS
      const filename = `cyberdyne_${telegramId}_v${profile.version}.json`;
      const result = await this.storage.upload(encryptedPayload, filename);
      
      const cid = result.cid;
      
      // Update profile with CID
      profile.metadata.ipfs_cid = cid;
      
      // Store in state
      this.state.setProfile(telegramId, {
        cid,
        sha256: plaintextSha256,
        username: profile.identity.username,
        score: profile.reputation.score,
        rank: profile.reputation.rank,
        tier: profile.reputation.tier,
        version: profile.version,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        format
      }, wallet);
      
      return {
        success: true,
        cid,
        profile,
        size: plaintext.length,
        format
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get profile by telegram ID
   */
  async get(telegramId, wallet = null) {
    try {
      const walletAddr = wallet || this.config.walletPubkey;
      
      // Get from state
      const metadata = this.state.getProfile(telegramId, walletAddr);
      
      if (!metadata || !metadata.cid) {
        return null;
      }
      
      // Fetch from IPFS
      const text = await this.storage.download(metadata.cid);
      const encryptedPayload = JSON.parse(text);
      
      // Decrypt
      const plaintext = await this.crypto.decrypt(encryptedPayload);
      
      // Parse based on format
      let profile;
      if (plaintext.startsWith('@cyberdyne')) {
        // TOON format
        profile = profileFromTOON(plaintext);
      } else {
        // JSON format
        profile = JSON.parse(plaintext);
      }
      
      return profile;
    } catch (error) {
      throw new Error(`Failed to get profile: ${error.message}`);
    }
  }

  /**
   * Update existing profile
   */
  async update(telegramId, updates, wallet = null) {
    // Get existing profile
    const existing = await this.get(telegramId, wallet);
    
    if (!existing) {
      throw new Error(`Profile not found for telegram_id: ${telegramId}`);
    }
    
    // Merge updates
    const updated = {
      ...existing,
      updated_at: new Date().toISOString()
    };
    
    // Update reputation if provided
    if (updates.reputation) {
      updated.reputation = {
        ...updated.reputation,
        ...updates.reputation
      };
    }
    
    // Update contributions if provided
    if (updates.contributions) {
      if (updates.addContribution) {
        updated.contributions.push(updates.contributions);
      } else {
        updated.contributions = updates.contributions;
      }
    }
    
    // Update achievements if provided
    if (updates.achievements) {
      if (updates.addAchievement) {
        updated.achievements.push(...updates.achievements);
      } else {
        updated.achievements = updates.achievements;
      }
    }
    
    // Update communities if provided
    if (updates.communities) {
      updated.communities = updates.communities;
    }
    
    // Re-enhance (recalculate skills, badges)
    const enhanced = enhanceProfile(updated);
    
    // Save as new version
    return await this.create(enhanced);
  }

  /**
   * List all profiles
   */
  list(wallet = null) {
    const walletAddr = wallet || this.config.walletPubkey;
    return this.state.listProfiles(walletAddr);
  }

  /**
   * Get profile statistics
   */
  async stats(telegramId, wallet = null) {
    const profile = await this.get(telegramId, wallet);
    
    if (!profile) {
      return null;
    }
    
    return {
      telegram_id: profile.identity.telegram_id,
      username: profile.identity.username,
      score: profile.reputation.score,
      rank: profile.reputation.rank,
      tier: profile.reputation.tier,
      level: profile.reputation.level,
      xp: profile.reputation.xp,
      xp_to_next: profile.reputation.xp_to_next,
      total_contributions: profile.contributions.length,
      total_achievements: profile.achievements.length,
      communities_count: profile.communities.length,
      badges_count: profile.badges.length,
      cid: profile.metadata.ipfs_cid,
      version: profile.version
    };
  }

  /**
   * Export profile
   */
  async export(telegramId, options = {}) {
    const profile = await this.get(telegramId, options.wallet);
    
    if (!profile) {
      throw new Error(`Profile not found for telegram_id: ${telegramId}`);
    }
    
    // Sanitize if requested
    if (options.sanitize) {
      return sanitizeProfile(profile, options);
    }
    
    return profile;
  }

  /**
   * Verify profile integrity
   */
  async verify(cid) {
    try {
      // Fetch from IPFS
      const text = await this.storage.download(cid);
      const encryptedPayload = JSON.parse(text);
      
      // Decrypt
      const plaintext = await this.crypto.decrypt(encryptedPayload);
      
      // Parse
      let profile;
      if (plaintext.startsWith('@cyberdyne')) {
        profile = profileFromTOON(plaintext);
      } else {
        profile = JSON.parse(plaintext);
      }
      
      // Validate
      const validation = validateProfile(profile);
      
      return {
        valid: validation.valid,
        errors: validation.errors,
        profile: validation.valid ? profile : null,
        cid
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error.message],
        profile: null,
        cid
      };
    }
  }

  /**
   * Delete profile
   */
  delete(telegramId, wallet = null) {
    const walletAddr = wallet || this.config.walletPubkey;
    this.state.deleteProfile(telegramId, walletAddr);
    return { success: true };
  }
}
