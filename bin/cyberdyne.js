#!/usr/bin/env node

/**
 * Cyberdyne Profiles CLI
 * Command-line interface for profile management
 */

import { ProfileManager } from '../lib/manager.js';
import { profileToTOON } from '../lib/toon.js';
import { writeFileSync } from 'fs';

const commands = {
  create: createProfile,
  get: getProfile,
  update: updateProfile,
  list: listProfiles,
  stats: profileStats,
  export: exportProfile,
  verify: verifyProfile,
  delete: deleteProfile,
  help: showHelp
};

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  if (!commands[command]) {
    console.error(`Unknown command: ${command}`);
    showHelp();
    process.exit(1);
  }
  
  try {
    await commands[command](args.slice(1));
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Helper: Parse argument
 */
function getArg(args, flag) {
  const equalFormat = args.find(a => a.startsWith(`${flag}=`));
  if (equalFormat) {
    return equalFormat.split('=')[1];
  }
  
  const flagIndex = args.indexOf(flag);
  if (flagIndex !== -1 && flagIndex + 1 < args.length) {
    return args[flagIndex + 1];
  }
  
  return null;
}

/**
 * Initialize ProfileManager from config
 */
function initManager(args) {
  const config = {
    walletPubkey: getArg(args, '--wallet-pubkey') || process.env.CYBERDYNE_WALLET_PUBKEY,
    walletSecretKeyBase58: getArg(args, '--wallet-secret') || process.env.CYBERDYNE_WALLET_SECRET,
    ipfsUrl: getArg(args, '--ipfs-url') || process.env.CYBERDYNE_IPFS_URL || 'https://vault.x1.xyz/ipfs',
    format: getArg(args, '--format') || 'toon',
    statePath: getArg(args, '--state-path')
  };
  
  if (!config.walletPubkey || !config.walletSecretKeyBase58) {
    throw new Error('Wallet credentials required. Set CYBERDYNE_WALLET_PUBKEY and CYBERDYNE_WALLET_SECRET env vars or use --wallet-pubkey and --wallet-secret flags');
  }
  
  return new ProfileManager(config);
}

/**
 * Create profile
 */
async function createProfile(args) {
  const manager = initManager(args);
  
  const telegramId = parseInt(getArg(args, '--telegram-id'));
  const username = getArg(args, '--username');
  const displayName = getArg(args, '--display-name') || username;
  const score = parseInt(getArg(args, '--score') || '0');
  const rank = parseInt(getArg(args, '--rank') || '0');
  const tier = getArg(args, '--tier') || 'ATTUNING';
  const xntEntitlement = parseInt(getArg(args, '--xnt-entitlement') || '0');
  const wallet = getArg(args, '--wallet');
  
  const contributions = getArg(args, '--contributions');
  const achievements = getArg(args, '--achievements');
  const communities = getArg(args, '--communities');
  
  if (!telegramId || !username) {
    console.error('❌ Required: --telegram-id and --username');
    process.exit(1);
  }
  
  const profile = {
    schema: 'cyberdyne_profile_v2',
    version: '2',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    
    identity: {
      telegram_id: telegramId,
      username,
      display_name: displayName,
      handle: `@${username}`,
      wallet: wallet || null
    },
    
    reputation: {
      score,
      rank,
      tier,
      level: 0,
      xp: 0,
      xp_to_next: 100,
      xnt_entitlement: xntEntitlement
    },
    
    contributions: contributions ? JSON.parse(contributions) : [],
    achievements: achievements ? achievements.split(',').map(a => a.trim()) : [],
    communities: communities ? communities.split(',').map(c => c.trim()) : [],
    
    skills: {
      builder: 0,
      promoter: 0,
      ecosystem: 0,
      leadership: 0
    },
    
    badges: [],
    
    metadata: {
      auto_enhanced: true,
      source: 'cyberdyne-cli',
      ipfs_cid: null
    },
    
    encryption: {
      algorithm: 'AES-256-GCM',
      key_derivation: 'wallet_signature',
      encrypted_at: new Date().toISOString()
    }
  };
  
  console.log('\n🛡️ Creating Cyberdyne Profile...\n');
  
  const result = await manager.create(profile);
  
  if (!result.success) {
    console.error(`❌ Failed: ${result.error}`);
    process.exit(1);
  }
  
  console.log('✅ Profile created successfully!\n');
  console.log(`Schema:     ${profile.schema}`);
  console.log(`Telegram:   ${telegramId} (@${username})`);
  console.log(`Score:      ${score} (Rank #${rank})`);
  console.log(`Tier:       ${tier}`);
  console.log(`Level:      ${result.profile.reputation.level} (XP: ${result.profile.reputation.xp}/${result.profile.reputation.xp + result.profile.reputation.xp_to_next})`);
  console.log(`CID:        ${result.cid}`);
  console.log(`Size:       ${result.size} bytes (${result.format})`);
  console.log(`Cost:       $0 (IPFS only)`);
  console.log(`\nView: https://ipfs.io/ipfs/${result.cid}`);
  console.log('');
}

/**
 * Get profile
 */
async function getProfile(args) {
  const manager = initManager(args);
  
  const telegramId = parseInt(getArg(args, '--telegram-id'));
  const format = getArg(args, '--format') || 'pretty';
  const wallet = getArg(args, '--wallet');
  
  if (!telegramId) {
    console.error('❌ Required: --telegram-id');
    process.exit(1);
  }
  
  console.log(`\n🔍 Fetching profile for Telegram ID: ${telegramId}...\n`);
  
  const profile = await manager.get(telegramId, wallet);
  
  if (!profile) {
    console.log('❌ Profile not found');
    process.exit(1);
  }
  
  if (format === 'json') {
    console.log(JSON.stringify(profile, null, 2));
  } else if (format === 'toon') {
    console.log(profileToTOON(profile));
  } else {
    // Pretty format
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║              CYBERDYNE PROFILE                               ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    
    console.log(`👤 ${profile.identity.display_name} (@${profile.identity.username})`);
    console.log(`   Telegram ID: ${profile.identity.telegram_id}`);
    if (profile.identity.wallet) {
      console.log(`   Wallet: ${profile.identity.wallet}`);
    }
    console.log('');
    
    console.log('📊 REPUTATION');
    console.log(`   Score:  ${profile.reputation.score} points`);
    console.log(`   Rank:   #${profile.reputation.rank}`);
    console.log(`   Tier:   ${profile.reputation.tier}`);
    console.log(`   Level:  ${profile.reputation.level} (XP: ${profile.reputation.xp}/${profile.reputation.xp + profile.reputation.xp_to_next})`);
    if (profile.reputation.xnt_entitlement) {
      console.log(`   XNT:    ${profile.reputation.xnt_entitlement} tokens`);
    }
    console.log('');
    
    if (profile.contributions && profile.contributions.length > 0) {
      console.log('🏆 CONTRIBUTIONS');
      for (const contrib of profile.contributions) {
        console.log(`   [${contrib.type}] ${contrib.name} (${contrib.score} pts)`);
        if (contrib.description) {
          console.log(`      ${contrib.description}`);
        }
      }
      console.log('');
    }
    
    if (profile.achievements && profile.achievements.length > 0) {
      console.log('🎯 ACHIEVEMENTS');
      for (const achievement of profile.achievements) {
        console.log(`   ${achievement}`);
      }
      console.log('');
    }
    
    if (profile.communities && profile.communities.length > 0) {
      console.log('🌐 COMMUNITIES');
      for (const community of profile.communities) {
        console.log(`   - ${community}`);
      }
      console.log('');
    }
    
    if (profile.badges && profile.badges.length > 0) {
      console.log('🏅 BADGES');
      for (const badge of profile.badges) {
        console.log(`   ${badge}`);
      }
      console.log('');
    }
    
    console.log('📦 METADATA');
    console.log(`   CID:     ${profile.metadata.ipfs_cid || 'N/A'}`);
    console.log(`   Version: ${profile.version}`);
    console.log(`   Created: ${profile.created_at}`);
    console.log(`   Updated: ${profile.updated_at}`);
    console.log('');
  }
}

/**
 * Update profile
 */
async function updateProfile(args) {
  const manager = initManager(args);
  
  const telegramId = parseInt(getArg(args, '--telegram-id'));
  const wallet = getArg(args, '--wallet');
  
  if (!telegramId) {
    console.error('❌ Required: --telegram-id');
    process.exit(1);
  }
  
  const updates = {};
  
  if (getArg(args, '--score')) {
    updates.reputation = { score: parseInt(getArg(args, '--score')) };
  }
  if (getArg(args, '--rank')) {
    updates.reputation = { ...updates.reputation, rank: parseInt(getArg(args, '--rank')) };
  }
  if (getArg(args, '--tier')) {
    updates.reputation = { ...updates.reputation, tier: getArg(args, '--tier') };
  }
  
  const addContribution = getArg(args, '--add-contribution');
  if (addContribution) {
    updates.contributions = JSON.parse(addContribution);
    updates.addContribution = true;
  }
  
  const addAchievement = getArg(args, '--add-achievement');
  if (addAchievement) {
    updates.achievements = [addAchievement];
    updates.addAchievement = true;
  }
  
  console.log(`\n🔄 Updating profile for Telegram ID: ${telegramId}...\n`);
  
  const result = await manager.update(telegramId, updates, wallet);
  
  if (!result.success) {
    console.error(`❌ Failed: ${result.error}`);
    process.exit(1);
  }
  
  console.log('✅ Profile updated successfully!\n');
  console.log(`New CID:    ${result.cid}`);
  console.log(`Version:    ${result.profile.version}`);
  console.log(`Size:       ${result.size} bytes`);
  console.log('');
}

/**
 * List profiles
 */
async function listProfiles(args) {
  const manager = initManager(args);
  
  const wallet = getArg(args, '--wallet');
  
  console.log('\n📋 Cyberdyne Profiles:\n');
  
  const list = manager.list(wallet);
  
  if (list.length === 0) {
    console.log('No profiles found.');
    return;
  }
  
  console.log(`Found ${list.length} profile(s):\n`);
  
  for (const p of list) {
    console.log(`👤 ${p.username || 'Unknown'} (ID: ${p.telegram_id})`);
    console.log(`   Score: ${p.score} | Rank: #${p.rank} | Tier: ${p.tier}`);
    console.log(`   CID: ${p.cid}`);
    console.log(`   Updated: ${p.updated_at}`);
    console.log('');
  }
}

/**
 * Profile statistics
 */
async function profileStats(args) {
  const manager = initManager(args);
  
  const telegramId = parseInt(getArg(args, '--telegram-id'));
  const wallet = getArg(args, '--wallet');
  
  if (!telegramId) {
    console.error('❌ Required: --telegram-id');
    process.exit(1);
  }
  
  const stats = await manager.stats(telegramId, wallet);
  
  if (!stats) {
    console.log('❌ Profile not found');
    process.exit(1);
  }
  
  console.log('\n📊 Profile Statistics:\n');
  console.log(`User:           @${stats.username} (${stats.telegram_id})`);
  console.log(`Score:          ${stats.score} points`);
  console.log(`Rank:           #${stats.rank}`);
  console.log(`Tier:           ${stats.tier}`);
  console.log(`Level:          ${stats.level} (XP: ${stats.xp}/${stats.xp + stats.xp_to_next})`);
  console.log(`Contributions:  ${stats.total_contributions}`);
  console.log(`Achievements:   ${stats.total_achievements}`);
  console.log(`Communities:    ${stats.communities_count}`);
  console.log(`Badges:         ${stats.badges_count}`);
  console.log(`CID:            ${stats.cid || 'N/A'}`);
  console.log(`Version:        ${stats.version}`);
  console.log('');
}

/**
 * Export profile
 */
async function exportProfile(args) {
  const manager = initManager(args);
  
  const telegramId = parseInt(getArg(args, '--telegram-id'));
  const output = getArg(args, '--output') || `profile_${telegramId}.json`;
  const format = getArg(args, '--format') || 'json';
  const wallet = getArg(args, '--wallet');
  
  if (!telegramId) {
    console.error('❌ Required: --telegram-id');
    process.exit(1);
  }
  
  const profile = await manager.export(telegramId, { wallet });
  
  if (!profile) {
    console.log('❌ Profile not found');
    process.exit(1);
  }
  
  let content;
  if (format === 'toon') {
    content = profileToTOON(profile);
  } else {
    content = JSON.stringify(profile, null, 2);
  }
  
  writeFileSync(output, content, 'utf8');
  
  console.log(`\n✅ Profile exported to: ${output}`);
  console.log(`Format: ${format}`);
  console.log(`Size: ${content.length} bytes\n`);
}

/**
 * Verify profile
 */
async function verifyProfile(args) {
  const manager = initManager(args);
  
  const cid = getArg(args, '--cid');
  
  if (!cid) {
    console.error('❌ Required: --cid');
    process.exit(1);
  }
  
  console.log(`\n🔍 Verifying profile: ${cid}...\n`);
  
  const result = await manager.verify(cid);
  
  if (result.valid) {
    console.log('✅ Profile verified successfully!\n');
    console.log(`Schema:   ${result.profile.schema}`);
    console.log(`Version:  ${result.profile.version}`);
    console.log(`User:     @${result.profile.identity.username}`);
    console.log(`Score:    ${result.profile.reputation.score}`);
    console.log(`CID:      ${cid}`);
    console.log('');
  } else {
    console.log('❌ Profile verification failed!\n');
    for (const error of result.errors) {
      console.log(`   - ${error}`);
    }
    console.log('');
    process.exit(1);
  }
}

/**
 * Delete profile
 */
async function deleteProfile(args) {
  const manager = initManager(args);
  
  const telegramId = parseInt(getArg(args, '--telegram-id'));
  const wallet = getArg(args, '--wallet');
  
  if (!telegramId) {
    console.error('❌ Required: --telegram-id');
    process.exit(1);
  }
  
  console.log(`\n🗑️  Deleting profile for Telegram ID: ${telegramId}...\n`);
  
  manager.delete(telegramId, wallet);
  
  console.log('✅ Profile deleted from local state\n');
  console.log('Note: IPFS data remains available (immutable)\n');
}

/**
 * Show help
 */
function showHelp() {
  console.log(`
Cyberdyne Profiles CLI - Encrypted user reputation profiles on IPFS

Usage: cyberdyne <command> [options]

Commands:
  create              Create a new profile
    --telegram-id N   Telegram user ID (required)
    --username <str>  Username (required)
    --display-name    Display name (optional)
    --score N         Reputation score (default: 0)
    --rank N          Rank position (default: 0)
    --tier <str>      Tier name (default: ATTUNING)
    --xnt-entitlement Token allocation (default: 0)
    --wallet <addr>   Wallet address (optional)
    --contributions   JSON array of contributions
    --achievements    Comma-separated achievements
    --communities     Comma-separated communities
  
  get                 Get a profile
    --telegram-id N   Telegram user ID (required)
    --format <fmt>    Output format: pretty|json|toon (default: pretty)
    --wallet <addr>   Wallet address (optional)
  
  update              Update a profile
    --telegram-id N   Telegram user ID (required)
    --score N         New score
    --rank N          New rank
    --tier <str>      New tier
    --add-contribution JSON contribution object
    --add-achievement Achievement text
    --wallet <addr>   Wallet address (optional)
  
  list                List all profiles
    --wallet <addr>   Wallet address (optional)
  
  stats               Show profile statistics
    --telegram-id N   Telegram user ID (required)
    --wallet <addr>   Wallet address (optional)
  
  export              Export profile to file
    --telegram-id N   Telegram user ID (required)
    --output <file>   Output filename (default: profile_<id>.json)
    --format <fmt>    Format: json|toon (default: json)
    --wallet <addr>   Wallet address (optional)
  
  verify              Verify profile integrity
    --cid <cid>       Profile CID (required)
  
  delete              Delete profile from local state
    --telegram-id N   Telegram user ID (required)
    --wallet <addr>   Wallet address (optional)
  
  help                Show this help message

Global Options:
  --wallet-pubkey     Wallet public key (or set CYBERDYNE_WALLET_PUBKEY)
  --wallet-secret     Wallet secret key (or set CYBERDYNE_WALLET_SECRET)
  --ipfs-url          IPFS endpoint (default: https://vault.x1.xyz/ipfs)
  --state-path        State file path (default: ~/.cyberdyne/state.json)

Environment Variables:
  CYBERDYNE_WALLET_PUBKEY    Wallet public key
  CYBERDYNE_WALLET_SECRET    Wallet secret key (base58)
  CYBERDYNE_IPFS_URL         IPFS endpoint URL

Examples:
  # Create a profile
  cyberdyne create --telegram-id 12345 --username skywalker --score 417 --rank 8

  # Get a profile
  cyberdyne get --telegram-id 12345

  # List all profiles
  cyberdyne list

  # Update profile score
  cyberdyne update --telegram-id 12345 --score 450

Note: Both --flag value and --flag=value formats are supported
`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
