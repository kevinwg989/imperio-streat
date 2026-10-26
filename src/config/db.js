const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const dbPath = process.env.DB_PATH || './data/imperio.db';
const resolvedPath = path.resolve(process.cwd(), dbPath);
const dbDir = path.dirname(resolvedPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let dbInstance = null;

function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = new sqlite3.Database(resolvedPath, (err) => {
    if (err) {
      console.error('❌ Erro ao conectar ao banco SQLite:', err.message);
    } else {
      // Configurações recomendadas para integridade e concorrência no SQLite
      dbInstance.run('PRAGMA foreign_keys = ON;');
      dbInstance.run('PRAGMA journal_mode = WAL;');
      dbInstance.run('PRAGMA synchronous = NORMAL;');
      if (process.env.NODE_ENV !== 'test') {
        console.log(`📦 Banco SQLite conectado com sucesso: ${resolvedPath}`);
      }
    }
  });

  return dbInstance;
}

// Helpers baseados em Promises para consultas limpas e assíncronas
const db = {
  getRawDb: getDb,

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      getDb().all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  },

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      getDb().get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      });
    });
  },

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      getDb().run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },

  exec(sql) {
    return new Promise((resolve, reject) => {
      getDb().exec(sql, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  },

  close() {
    return new Promise((resolve, reject) => {
      if (!dbInstance) return resolve();
      dbInstance.close((err) => {
        if (err) return reject(err);
        dbInstance = null;
        resolve();
      });
    });
  }
};

module.exports = db;
