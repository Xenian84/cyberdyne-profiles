# Cyberdyne Profiles 🛡️

**Encrypted user reputation profiles on IPFS with zero-knowledge architecture**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/Xenian84/cyberdyne-profiles/releases)

---

## 🚀 Features

- 🔐 **Client-side Encryption** - AES-256-GCM with wallet signatures
- 📦 **IPFS Storage** - Free decentralized storage via X1 Vault
- 🎯 **Zero-Knowledge** - AI never sees plaintext profiles
- 📊 **Rich Schema** - Reputation, contributions, achievements, communities
- 🔄 **Version Tracking** - Complete profile history via CID chain
- 💾 **TOON Format** - 40% smaller than JSON, human-readable
- 🛠️ **CLI Tools** - Complete command-line interface
- 🤖 **OpenClaw Plugin** - Native integration for Telegram bots

---

## 📦 Installation

```bash
# Via npm
npm install cyberdyne-profiles

# Via yarn
yarn add cyberdyne-profiles

# Global CLI
npm install -g cyberdyne-profiles
```

---

## 🎯 Quick Start

### **As a Library**

```javascript
import { ProfileManager } from 'cyberdyne-profiles';

const manager = new ProfileManager({
  walletPubkey: 'YOUR_WALLET_PUBKEY',
  walletSecretKeyBase58: 'YOUR_SECRET_KEY',
  ipfsUrl: 'https://vault.x1.xyz/ipfs'
});

// Create a profile
const result = await manager.create({
  schema: 'cyberdyne_profile_v2',
  version: '2',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  identity: {
    telegram_id: 5451495644,
    username: 'Skywalker432',
    display_name: 'Skywalker',
    handle: '@Skywalker432'
  },
  reputation: {
    score: 417,
    rank: 8,
    tier: 'HARMONIC'
  },
  contributions: [],
  achievements: [],
  communities: [],
  skills: {},
  badges: [],
  metadata: {},
  encryption: {}
});

console.log(`Profile created! CID: ${result.cid}`);
```

### **As a CLI**

```bash
# Set credentials
export CYBERDYNE_WALLET_PUBKEY="your_pubkey"
export CYBERDYNE_WALLET_SECRET="your_secret"

# Create a profile
cyberdyne create \
  --telegram-id 5451495644 \
  --username Skywalker432 \
  --score 417 \
  --rank 8 \
  --tier HARMONIC

# Get a profile
cyberdyne get --telegram-id 5451495644

# List all profiles
cyberdyne list
```

### **As an OpenClaw Plugin**

```json
{
  "plugins": [
    {
      "name": "cyberdyne-profiles",
      "path": "./node_modules/cyberdyne-profiles/plugins/openclaw",
      "config": {
        "walletPubkey": "YOUR_WALLET_PUBKEY",
        "walletSecretKeyBase58": "YOUR_SECRET_KEY"
      }
    }
  ]
}
```

Then in your bot:

```javascript
// Create profile
const result = await ctx.call_tool("cyberdyne_create_profile", {
  telegram_id: ctx.from.id,
  username: ctx.from.username,
  score: 417,
  rank: 8
});
```

---

## 📚 Documentation

- **[API Documentation](./docs/API.md)** - Complete API reference
- **[CLI Documentation](./docs/CLI.md)** - Command-line usage
- **[OpenClaw Integration](./docs/OPENCLAW.md)** - Plugin setup and usage
- **[Examples](./examples/)** - Code examples

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Telegram Bot (Theo)                     │
│  - Generates profile from user activity                     │
│  - Requests user approval via web client                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Cyberdyne Profile Manager                   │
│  - Validates schema                                          │
│  - Encrypts with user's wallet                              │
│  - Uploads to IPFS                                           │
│  - Maintains CID chain                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    X1 Vault (IPFS)                          │
│  - Stores encrypted profiles                                │
│  - Returns CID                                               │
│  - Free storage (no XNT required)                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 💰 Storage & Costs

- **IPFS Storage:** FREE (via X1 Vault)
- **No XNT Required:** Profiles stored on IPFS only
- **Size Optimization:** TOON format saves 40% space
- **Typical Profile:** ~650 bytes (TOON) vs ~1,100 bytes (JSON)

---

## 🔐 Security

- **Zero-Knowledge Architecture** - AI never sees plaintext
- **Client-side Encryption** - AES-256-GCM with wallet signatures
- **Key Derivation** - ed25519 wallet signature
- **Version Tracking** - Complete history via CID chain
- **Immutable Storage** - IPFS content-addressed

---

## 📊 Profile Schema v2

```json
{
  "schema": "cyberdyne_profile_v2",
  "version": "2",
  "identity": {
    "telegram_id": 5451495644,
    "username": "Skywalker432",
    "display_name": "Skywalker",
    "handle": "@Skywalker432"
  },
  "reputation": {
    "score": 417,
    "rank": 8,
    "tier": "HARMONIC",
    "level": 4,
    "xp": 17,
    "xp_to_next": 100,
    "xnt_entitlement": 100
  },
  "contributions": [...],
  "achievements": [...],
  "communities": [...],
  "skills": {...},
  "badges": [...]
}
```

---

## 🛠️ Development

```bash
# Clone repository
git clone https://github.com/Xenian84/cyberdyne-profiles.git
cd cyberdyne-profiles

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build
```

---

## 🤝 Integration with AegisMemory

Cyberdyne Profiles can work standalone or integrate with [AegisMemory](https://github.com/Xenian84/aegismemory):

```javascript
import { ProfileManager } from 'cyberdyne-profiles';
import { VaultApi, CryptoBox } from 'aegismemory';

// Reuse AegisMemory's infrastructure
const manager = new ProfileManager({
  storage: new VaultApi(...),
  crypto: new CryptoBox(...)
});
```

---

## 📝 License

MIT License - see [LICENSE](./LICENSE) file for details

---

## 🙏 Credits

- **Architecture:** Tachyon & Cursor AI
- **Implementation:** Cursor AI Agent
- **X1 Ecosystem:** X1 Network Team

---

## 🔗 Links

- **GitHub:** https://github.com/Xenian84/cyberdyne-profiles
- **npm:** https://www.npmjs.com/package/cyberdyne-profiles
- **X1 Network:** https://x1.xyz
- **AegisMemory:** https://github.com/Xenian84/aegismemory

---

**Built with ❤️ for the X1 Ecosystem**
