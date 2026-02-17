/**
 * Cyberdyne Profiles - Basic Usage Example
 */

import { ProfileManager } from '../index.js';

async function main() {
  // Initialize ProfileManager
  const manager = new ProfileManager({
    walletPubkey: process.env.CYBERDYNE_WALLET_PUBKEY,
    walletSecretKeyBase58: process.env.CYBERDYNE_WALLET_SECRET,
    ipfsUrl: 'https://vault.x1.xyz/ipfs',
    format: 'toon' // Use TOON format (40% smaller)
  });

  console.log('🛡️ Cyberdyne Profiles - Basic Usage Example\n');

  // 1. Create a profile
  console.log('1. Creating profile...');
  const createResult = await manager.create({
    schema: 'cyberdyne_profile_v2',
    version: '2',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    
    identity: {
      telegram_id: 12345,
      username: 'example_user',
      display_name: 'Example User',
      handle: '@example_user'
    },
    
    reputation: {
      score: 100,
      rank: 50,
      tier: 'ATTUNING',
      level: 0,
      xp: 0,
      xp_to_next: 100,
      xnt_entitlement: 0
    },
    
    contributions: [
      {
        type: 'builder',
        name: 'Example Project',
        description: 'Built something cool',
        score: 50
      }
    ],
    
    achievements: ['First contribution'],
    communities: ['X1 XEN CRYPTO'],
    skills: {},
    badges: [],
    metadata: {
      auto_enhanced: true,
      source: 'example',
      ipfs_cid: null
    },
    encryption: {
      algorithm: 'AES-256-GCM',
      key_derivation: 'wallet_signature',
      encrypted_at: new Date().toISOString()
    }
  });

  if (createResult.success) {
    console.log(`✅ Profile created!`);
    console.log(`   CID: ${createResult.cid}`);
    console.log(`   Size: ${createResult.size} bytes`);
    console.log(`   Format: ${createResult.format}\n`);
  } else {
    console.error(`❌ Failed: ${createResult.error}`);
    return;
  }

  // 2. Retrieve the profile
  console.log('2. Retrieving profile...');
  const profile = await manager.get(12345);
  
  if (profile) {
    console.log(`✅ Profile retrieved!`);
    console.log(`   Username: @${profile.identity.username}`);
    console.log(`   Score: ${profile.reputation.score}`);
    console.log(`   Rank: #${profile.reputation.rank}\n`);
  }

  // 3. Update the profile
  console.log('3. Updating profile...');
  const updateResult = await manager.update(12345, {
    reputation: {
      score: 150,
      rank: 45
    },
    addAchievement: true,
    achievements: ['Reached 150 points']
  });

  if (updateResult.success) {
    console.log(`✅ Profile updated!`);
    console.log(`   New CID: ${updateResult.cid}`);
    console.log(`   Version: ${updateResult.profile.version}\n`);
  }

  // 4. Get statistics
  console.log('4. Getting statistics...');
  const stats = await manager.stats(12345);
  
  if (stats) {
    console.log(`✅ Statistics:`);
    console.log(`   Score: ${stats.score}`);
    console.log(`   Level: ${stats.level}`);
    console.log(`   Contributions: ${stats.total_contributions}`);
    console.log(`   Achievements: ${stats.total_achievements}\n`);
  }

  // 5. List all profiles
  console.log('5. Listing profiles...');
  const list = manager.list();
  console.log(`✅ Found ${list.length} profile(s)\n`);

  console.log('🎉 Example complete!');
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
