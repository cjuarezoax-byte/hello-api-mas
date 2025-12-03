// src/services/tokenStore.js

class InMemoryTokenStore {
  constructor() {
    // Map<userId, Set<token>>
    this.tokensByUser = new Map();
  }

  saveRefreshToken(userId, token) {
    if (!this.tokensByUser.has(userId)) {
      this.tokensByUser.set(userId, new Set());
    }
    this.tokensByUser.get(userId).add(token);
  }

  isValidRefreshToken(userId, token) {
    const set = this.tokensByUser.get(userId);
    if (!set) return false;
    return set.has(token);
  }

  revokeRefreshToken(userId, token) {
    const set = this.tokensByUser.get(userId);
    if (!set) return;
    set.delete(token);
    if (set.size === 0) {
      this.tokensByUser.delete(userId);
    }
  }

  revokeAllTokensForUser(userId) {
    this.tokensByUser.delete(userId);
  }

  clearAll() {
    this.tokensByUser.clear();
  }
}

// Instancia por defecto para este proceso
export const tokenStore = new InMemoryTokenStore();
