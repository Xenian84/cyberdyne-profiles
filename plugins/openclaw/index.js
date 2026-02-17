/**
 * Cyberdyne Profiles - OpenClaw Plugin
 * Provides profile management tools for OpenClaw bots
 */

import { ProfileManager } from '../../lib/manager.js';

export default {
  id: "cyberdyne-profiles",
  name: "Cyberdyne Profiles",
  version: "1.0.0",
  description: "Encrypted user reputation profiles on IPFS with zero-knowledge architecture",
  kind: "extension",
  entrypoint: "./index.js",
  author: "Cyberdyne Contributors",
  repository: "https://github.com/Xenian84/cyberdyne-profiles",
  license: "MIT",
  
  configSchema: {
    type: "object",
    properties: {
      walletPubkey: {
        type: "string",
        description: "Wallet public key for encryption",
        sensitive: false
      },
      walletSecretKeyBase58: {
        type: "string",
        description: "Wallet secret key (base58)",
        sensitive: true
      },
      ipfsUrl: {
        type: "string",
        default: "https://vault.x1.xyz/ipfs",
        description: "IPFS endpoint URL"
      },
      derivationMsg: {
        type: "string",
        default: "IPFS_ENCRYPTION_KEY_V1",
        description: "Key derivation message"
      },
      format: {
        type: "string",
        enum: ["json", "toon"],
        default: "toon",
        description: "Storage format (toon is 40% smaller)"
      },
      statePath: {
        type: "string",
        default: "~/.cyberdyne/state.json",
        description: "State file path"
      }
    },
    required: ["walletPubkey", "walletSecretKeyBase58"]
  },
  
  register(api) {
    console.log("🎯 Registering Cyberdyne Profiles plugin");
    
    const config = api.pluginConfig || api.config || {};
    
    // Initialize ProfileManager
    const manager = new ProfileManager(config);
    
    // Register tools
    api.registerTool(() => [
      {
        name: "cyberdyne_create_profile",
        description: "Create and store an encrypted Cyberdyne profile for a Telegram user. Returns IPFS CID. Profile includes reputation score, rank, tier, contributions, achievements, and communities.",
        parameters: {
          type: "object",
          properties: {
            telegram_id: {
              type: "number",
              description: "Telegram user ID"
            },
            username: {
              type: "string",
              description: "Telegram username"
            },
            display_name: {
              type: "string",
              description: "Display name (optional, defaults to username)"
            },
            score: {
              type: "number",
              description: "Reputation score",
              default: 0
            },
            rank: {
              type: "number",
              description: "Rank position",
              default: 0
            },
            tier: {
              type: "string",
              description: "Tier name (ATTUNING, ENTRAINED, HARMONIC, etc.)",
              default: "ATTUNING"
            },
            xnt_entitlement: {
              type: "number",
              description: "XNT token allocation",
              default: 0
            },
            wallet: {
              type: "string",
              description: "Wallet address (optional)"
            },
            contributions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  name: { type: "string" },
                  description: { type: "string" },
                  score: { type: "number" }
                }
              },
              description: "Array of contribution objects"
            },
            achievements: {
              type: "array",
              items: { type: "string" },
              description: "Array of achievement strings"
            },
            communities: {
              type: "array",
              items: { type: "string" },
              description: "Array of community names"
            }
          },
          required: ["telegram_id", "username"]
        },
        async execute(params) {
          try {
            const profile = {
              schema: 'cyberdyne_profile_v2',
              version: '2',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              
              identity: {
                telegram_id: params.telegram_id,
                username: params.username,
                display_name: params.display_name || params.username,
                handle: `@${params.username}`,
                wallet: params.wallet || null
              },
              
              reputation: {
                score: params.score || 0,
                rank: params.rank || 0,
                tier: params.tier || 'ATTUNING',
                level: 0,
                xp: 0,
                xp_to_next: 100,
                xnt_entitlement: params.xnt_entitlement || 0
              },
              
              contributions: params.contributions || [],
              achievements: params.achievements || [],
              communities: params.communities || [],
              
              skills: {
                builder: 0,
                promoter: 0,
                ecosystem: 0,
                leadership: 0
              },
              
              badges: [],
              
              metadata: {
                auto_enhanced: true,
                source: 'openclaw-tool',
                ipfs_cid: null
              },
              
              encryption: {
                algorithm: 'AES-256-GCM',
                key_derivation: 'wallet_signature',
                encrypted_at: new Date().toISOString()
              }
            };
            
            const result = await manager.create(profile);
            
            if (!result.success) {
              return {
                success: false,
                error: result.error
              };
            }
            
            return {
              success: true,
              cid: result.cid,
              profile: {
                telegram_id: params.telegram_id,
                username: params.username,
                score: result.profile.reputation.score,
                rank: result.profile.reputation.rank,
                tier: result.profile.reputation.tier,
                level: result.profile.reputation.level,
                xp: result.profile.reputation.xp
              },
              ipfs_url: `https://ipfs.io/ipfs/${result.cid}`,
              size: result.size,
              format: result.format,
              message: `✅ Profile created! CID: ${result.cid}`
            };
          } catch (error) {
            return {
              success: false,
              error: error.message
            };
          }
        }
      },
      {
        name: "cyberdyne_get_profile",
        description: "Retrieve and decrypt a Cyberdyne profile from IPFS by Telegram ID",
        parameters: {
          type: "object",
          properties: {
            telegram_id: {
              type: "number",
              description: "Telegram user ID"
            },
            wallet: {
              type: "string",
              description: "Wallet address (optional)"
            }
          },
          required: ["telegram_id"]
        },
        async execute(params) {
          try {
            const profile = await manager.get(params.telegram_id, params.wallet);
            
            if (!profile) {
              return {
                success: false,
                error: "Profile not found"
              };
            }
            
            return {
              success: true,
              profile: {
                telegram_id: profile.identity.telegram_id,
                username: profile.identity.username,
                display_name: profile.identity.display_name,
                score: profile.reputation.score,
                rank: profile.reputation.rank,
                tier: profile.reputation.tier,
                level: profile.reputation.level,
                xp: profile.reputation.xp,
                xnt_entitlement: profile.reputation.xnt_entitlement,
                contributions: profile.contributions,
                achievements: profile.achievements,
                communities: profile.communities,
                badges: profile.badges
              },
              cid: profile.metadata.ipfs_cid,
              version: profile.version
            };
          } catch (error) {
            return {
              success: false,
              error: error.message
            };
          }
        }
      },
      {
        name: "cyberdyne_update_profile",
        description: "Update an existing Cyberdyne profile (score, rank, tier, etc.)",
        parameters: {
          type: "object",
          properties: {
            telegram_id: {
              type: "number",
              description: "Telegram user ID"
            },
            score: {
              type: "number",
              description: "New reputation score"
            },
            rank: {
              type: "number",
              description: "New rank position"
            },
            tier: {
              type: "string",
              description: "New tier name"
            },
            xnt_entitlement: {
              type: "number",
              description: "New XNT token allocation"
            },
            add_contribution: {
              type: "object",
              description: "Contribution to add",
              properties: {
                type: { type: "string" },
                name: { type: "string" },
                description: { type: "string" },
                score: { type: "number" }
              }
            },
            add_achievement: {
              type: "string",
              description: "Achievement to add"
            },
            wallet: {
              type: "string",
              description: "Wallet address (optional)"
            }
          },
          required: ["telegram_id"]
        },
        async execute(params) {
          try {
            const updates = {};
            
            if (params.score !== undefined || params.rank !== undefined || params.tier || params.xnt_entitlement !== undefined) {
              updates.reputation = {};
              if (params.score !== undefined) updates.reputation.score = params.score;
              if (params.rank !== undefined) updates.reputation.rank = params.rank;
              if (params.tier) updates.reputation.tier = params.tier;
              if (params.xnt_entitlement !== undefined) updates.reputation.xnt_entitlement = params.xnt_entitlement;
            }
            
            if (params.add_contribution) {
              updates.contributions = params.add_contribution;
              updates.addContribution = true;
            }
            
            if (params.add_achievement) {
              updates.achievements = [params.add_achievement];
              updates.addAchievement = true;
            }
            
            const result = await manager.update(params.telegram_id, updates, params.wallet);
            
            if (!result.success) {
              return {
                success: false,
                error: result.error
              };
            }
            
            return {
              success: true,
              cid: result.cid,
              old_version: parseInt(result.profile.version) - 1,
              new_version: result.profile.version,
              message: `✅ Profile updated! New CID: ${result.cid}`
            };
          } catch (error) {
            return {
              success: false,
              error: error.message
            };
          }
        }
      },
      {
        name: "cyberdyne_list_profiles",
        description: "List all Cyberdyne profiles for the current wallet",
        parameters: {
          type: "object",
          properties: {
            wallet: {
              type: "string",
              description: "Wallet address (optional)"
            }
          }
        },
        async execute(params) {
          try {
            const list = manager.list(params.wallet);
            
            return {
              success: true,
              count: list.length,
              profiles: list
            };
          } catch (error) {
            return {
              success: false,
              error: error.message
            };
          }
        }
      }
    ], {
      names: [
        "cyberdyne_create_profile",
        "cyberdyne_get_profile",
        "cyberdyne_update_profile",
        "cyberdyne_list_profiles"
      ]
    });
    
    console.log("✅ Cyberdyne Profiles plugin registered successfully");
  }
};
