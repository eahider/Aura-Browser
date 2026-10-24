// Aura Browser - Secure Local Password Manager & Credential Vault
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');

class PasswordManager {
  constructor() {
    this.userDataPath = app ? app.getPath('userData') : path.join(__dirname, 'browser_data');
    if (!fs.existsSync(this.userDataPath)) {
      try {
        fs.mkdirSync(this.userDataPath, { recursive: true });
      } catch (e) {}
    }

    this.vaultFile = path.join(this.userDataPath, 'aura_vault.bin');
    // Machine-specific salt for local encryption at rest
    this.encKey = this.deriveKey();
    this.credentials = this.loadVault();
  }

  deriveKey() {
    // Generate/retrieve machine local salt
    const saltFile = path.join(this.userDataPath, '.vault_salt');
    let salt;
    if (fs.existsSync(saltFile)) {
      salt = fs.readFileSync(saltFile);
    } else {
      salt = crypto.randomBytes(32);
      try {
        fs.writeFileSync(saltFile, salt);
      } catch (e) {}
    }
    return crypto.scryptSync('Aura_Browser_Vault_Master', salt, 32);
  }

  loadVault() {
    try {
      if (fs.existsSync(this.vaultFile)) {
        const raw = fs.readFileSync(this.vaultFile);
        if (raw.length > 28) {
          const iv = raw.subarray(0, 12);
          const tag = raw.subarray(12, 28);
          const ciphertext = raw.subarray(28);

          const decipher = crypto.createDecipheriv('aes-256-gcm', this.encKey, iv);
          decipher.setAuthTag(tag);
          const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
          return JSON.parse(decrypted);
        }
      }
    } catch (err) {
      console.warn('Could not decrypt vault, starting fresh or fallback:', err.message);
    }
    return [];
  }

  saveVault() {
    try {
      const dataStr = JSON.stringify(this.credentials);
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', this.encKey, iv);

      let encrypted = cipher.update(dataStr, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      const tag = cipher.getAuthTag();

      const output = Buffer.concat([iv, tag, encrypted]);
      fs.writeFileSync(this.vaultFile, output);
    } catch (err) {
      console.error('Failed to save vault:', err);
    }
  }

  getAll() {
    return this.credentials.map(c => ({
      id: c.id,
      domain: c.domain,
      username: c.username,
      password: c.password,
      updatedAt: c.updatedAt
    }));
  }

  getForDomain(domain) {
    if (!domain) return [];
    const cleanDomain = domain.toLowerCase().replace(/^www\./, '');
    return this.credentials.filter(c => {
      const entryDomain = c.domain.toLowerCase().replace(/^www\./, '');
      return entryDomain === cleanDomain || cleanDomain.endsWith('.' + entryDomain);
    });
  }

  save(domain, username, password) {
    if (!domain || !username || !password) return null;
    const cleanDomain = domain.toLowerCase().replace(/^www\./, '');

    // Check if entry already exists for domain + username
    const existingIdx = this.credentials.findIndex(
      c => c.domain.toLowerCase().replace(/^www\./, '') === cleanDomain && c.username.toLowerCase() === username.toLowerCase()
    );

    const now = new Date().toISOString();
    if (existingIdx !== -1) {
      // Update password
      this.credentials[existingIdx].password = password;
      this.credentials[existingIdx].updatedAt = now;
      this.saveVault();
      return this.credentials[existingIdx];
    }

    const newEntry = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
      domain: cleanDomain,
      username,
      password,
      createdAt: now,
      updatedAt: now
    };

    this.credentials.unshift(newEntry);
    this.saveVault();
    return newEntry;
  }

  delete(id) {
    this.credentials = this.credentials.filter(c => c.id !== id);
    this.saveVault();
    return true;
  }
}

module.exports = { PasswordManager };
