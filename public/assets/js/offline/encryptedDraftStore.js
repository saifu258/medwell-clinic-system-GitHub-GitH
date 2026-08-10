export const EncryptedDraftStore = {
  dbName: "MedwellOfflineDrafts",
  storeName: "drafts",

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: "draftId" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getEncryptionKey() {
    let rawKey = sessionStorage.getItem("medwell_draft_key");
    if (!rawKey) {
      const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
      const exported = await crypto.subtle.exportKey("raw", key);
      rawKey = btoa(String.fromCharCode(...new Uint8Array(exported)));
      sessionStorage.setItem("medwell_draft_key", rawKey);
      return key;
    }
    const binaryStr = atob(rawKey);
    const binaryDer = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
        binaryDer[i] = binaryStr.charCodeAt(i);
    }
    return crypto.subtle.importKey("raw", binaryDer, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
  },

  async saveDraft(uid, resourceType, resourceId, baseVersion, dataObj) {
    try {
      const db = await this.initDB();
      const key = await this.getEncryptionKey();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encoded = new TextEncoder().encode(JSON.stringify(dataObj));
      const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);

      const draftId = `${uid}_${resourceType}_${resourceId}`;
      const metadata = {
        draftId,
        uid,
        resourceType,
        resourceId,
        baseVersion,
        iv,
        ciphertext,
        schemaVersion: 1,
        updatedAt: new Date().toISOString()
      };

      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, "readwrite");
        const store = tx.objectStore(this.storeName);
        const req = store.put(metadata);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.error("OFFLINE_DRAFT_ENCRYPTION_FAILED", e);
      throw new Error("OFFLINE_DRAFT_ENCRYPTION_FAILED");
    }
  },

  async getDraft(uid, resourceType, resourceId) {
    try {
      const db = await this.initDB();
      const draftId = `${uid}_${resourceType}_${resourceId}`;

      const metadata = await new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, "readonly");
        const store = tx.objectStore(this.storeName);
        const req = store.get(draftId);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      if (!metadata) return null;
      if (metadata.schemaVersion !== 1) throw new Error("UNKNOWN_SCHEMA_VERSION");

      const key = await this.getEncryptionKey();
      const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: metadata.iv }, key, metadata.ciphertext);
      const dataObj = JSON.parse(new TextDecoder().decode(decrypted));

      return { baseVersion: metadata.baseVersion, data: dataObj, updatedAt: metadata.updatedAt };
    } catch (e) {
      console.error("Draft decryption failed or corrupted", e);
      return null;
    }
  },

  async discardDraft(uid, resourceType, resourceId) {
    const db = await this.initDB();
    const draftId = `${uid}_${resourceType}_${resourceId}`;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readwrite");
      const store = tx.objectStore(this.storeName);
      const req = store.delete(draftId);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }
};
