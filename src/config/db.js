const path = require('path');
const fs = require('fs');
require('dotenv').config();

const isPostgres = Boolean(process.env.DATABASE_URL);
const dbPath = process.env.DB_PATH || './data/imperio.db';
const resolvedPath = path.resolve(process.cwd(), dbPath);
const dbDir = path.dirname(resolvedPath);

if (process.env.NODE_ENV === 'production' && !isPostgres) {
  throw new Error('DATABASE_URL deve apontar para um banco PostgreSQL persistente em produção.');
}

if (!isPostgres && !fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let sqliteInstance = null;
let postgresPool = null;

function getSqliteDb() {
  if (sqliteInstance) {
    return sqliteInstance;
  }

  const sqlite3 = require('sqlite3').verbose();
  sqliteInstance = new sqlite3.Database(resolvedPath, (err) => {
    if (err) {
      console.error('❌ Erro ao conectar ao banco SQLite:', err.message);
    } else {
      // Configurações recomendadas para integridade e concorrência no SQLite
      sqliteInstance.run('PRAGMA foreign_keys = ON;');
      sqliteInstance.run('PRAGMA journal_mode = WAL;');
      sqliteInstance.run('PRAGMA synchronous = NORMAL;');
      if (process.env.NODE_ENV !== 'test') {
        console.log(`📦 Banco SQLite conectado com sucesso: ${resolvedPath}`);
      }
    }
  });

  return sqliteInstance;
}

function getPostgresPool() {
  if (!postgresPool) {
    const { Pool, types } = require('pg');
    types.setTypeParser(20, (value) => Number(value));
    postgresPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000
    });
  }

  return postgresPool;
}

function getRawDb() {
  return isPostgres ? getPostgresPool() : getSqliteDb();
}

function postgresQuery(sql) {
  let parameterIndex = 0;
  return sql.replace(/\?/g, () => `$${++parameterIndex}`);
}

// Helpers baseados em Promises para consultas limpas e assíncronas
const db = {
  getRawDb,

  all(sql, params = []) {
    if (isPostgres) {
      return getPostgresPool().query(postgresQuery(sql), params).then((result) => result.rows);
    }

    return new Promise((resolve, reject) => {
      getSqliteDb().all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  },

  get(sql, params = []) {
    if (isPostgres) {
      return getPostgresPool().query(postgresQuery(sql), params).then((result) => result.rows[0] || null);
    }

    return new Promise((resolve, reject) => {
      getSqliteDb().get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      });
    });
  },

  run(sql, params = []) {
    if (isPostgres) {
      const query = postgresQuery(sql);
      const insertQuery = /^\s*INSERT\b/i.test(query) && !/\bRETURNING\b/i.test(query)
        ? `${query.trimEnd().replace(/;$/, '')} RETURNING *`
        : query;

      return getPostgresPool().query(insertQuery, params).then((result) => ({
        lastID: result.rows[0] ? result.rows[0].id : undefined,
        changes: result.rowCount
      }));
    }

    return new Promise((resolve, reject) => {
      getSqliteDb().run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },

  exec(sql) {
    if (isPostgres) {
      return getPostgresPool().query(sql).then(() => undefined);
    }

    return new Promise((resolve, reject) => {
      getSqliteDb().exec(sql, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  },

  close() {
    if (isPostgres) {
      if (!postgresPool) return Promise.resolve();
      const pool = postgresPool;
      postgresPool = null;
      return pool.end();
    }

    return new Promise((resolve, reject) => {
      if (!sqliteInstance) return resolve();
      sqliteInstance.close((err) => {
        if (err) return reject(err);
        sqliteInstance = null;
        resolve();
      });
    });
  }
};

module.exports = db;
