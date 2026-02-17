/**
 * IPFS Storage for Cyberdyne Profiles
 * Standalone IPFS client for X1 Vault
 */

/**
 * Simple IPFS Storage client
 */
export class IPFSStorage {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || config.ipfsUrl || 'https://vault.x1.xyz/ipfs';
    this.maxRetries = config.maxRetries || 3;
  }

  /**
   * Upload data to IPFS
   */
  async add(data, filename = 'profile.json') {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const url = `${this.baseUrl}/api/v0/add`;
        
        // Create form data
        const formData = new FormData();
        const blob = new Blob([payload], { type: 'application/json' });
        formData.append('file', blob, filename);
        
        const response = await fetch(url, {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error(`IPFS upload failed: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        return {
          cid: result.Hash || result.cid,
          size: result.Size || payload.length
        };
      } catch (error) {
        if (attempt === this.maxRetries) {
          throw new Error(`IPFS upload failed after ${this.maxRetries} attempts: ${error.message}`);
        }
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  /**
   * Retrieve data from IPFS
   */
  async cat(cid) {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const url = `${this.baseUrl}/api/v0/cat?arg=${cid}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`IPFS fetch failed: ${response.status} ${response.statusText}`);
        }
        
        const text = await response.text();
        return text;
      } catch (error) {
        if (attempt === this.maxRetries) {
          throw new Error(`IPFS fetch failed after ${this.maxRetries} attempts: ${error.message}`);
        }
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  /**
   * Pin a CID (keep it available)
   */
  async pin(cid) {
    try {
      const url = `${this.baseUrl}/api/v0/pin/add?arg=${cid}`;
      
      const response = await fetch(url, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`IPFS pin failed: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      // Pin failures are non-critical
      console.warn('IPFS pin failed:', error.message);
      return null;
    }
  }

  /**
   * Check if CID is pinned
   */
  async isPinned(cid) {
    try {
      const url = `${this.baseUrl}/api/v0/pin/ls?arg=${cid}`;
      
      const response = await fetch(url, {
        method: 'POST'
      });
      
      if (!response.ok) {
        return false;
      }
      
      const result = await response.json();
      return result.Keys && result.Keys[cid];
    } catch (error) {
      return false;
    }
  }
}

/**
 * Storage adapter interface
 * Allows using different storage backends
 */
export class StorageAdapter {
  constructor(storage) {
    if (typeof storage === 'string') {
      // Create IPFS storage from URL
      this.storage = new IPFSStorage({ baseUrl: storage });
    } else if (storage instanceof IPFSStorage) {
      this.storage = storage;
    } else if (storage && typeof storage.add === 'function' && typeof storage.cat === 'function') {
      // Duck-typed storage (e.g., AegisMemory's VaultApi)
      this.storage = storage;
    } else {
      // Default to X1 Vault
      this.storage = new IPFSStorage();
    }
  }

  async upload(data, filename) {
    return await this.storage.add(data, filename);
  }

  async download(cid) {
    return await this.storage.cat(cid);
  }

  async pin(cid) {
    if (this.storage.pin) {
      return await this.storage.pin(cid);
    }
    return null;
  }
}
