// tars_db/js/storage.js

import { DB_CONFIG } from './constants.js';

function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_CONFIG.NAME, DB_CONFIG.VERSION);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(DB_CONFIG.STORE)) {
                db.createObjectStore(DB_CONFIG.STORE);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export const Storage = {
    async save(dataUint8Array) {
        const dbConn = await openDB();
        const tx = dbConn.transaction(DB_CONFIG.STORE, 'readwrite');
        tx.objectStore(DB_CONFIG.STORE).put(dataUint8Array, DB_CONFIG.KEY);
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },

    async load() {
        const dbConn = await openDB();
        const tx = dbConn.transaction(DB_CONFIG.STORE, 'readonly');
        const req = tx.objectStore(DB_CONFIG.STORE).get(DB_CONFIG.KEY);
        return new Promise((resolve, reject) => {
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }
};
