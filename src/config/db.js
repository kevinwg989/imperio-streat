const path = require('path');
const fs = require('fs');
require('dotenv').config();

// ============================================================
// IMPÉRIO STREETWEAR — Adaptador de Banco de Dados Dual
// SQLite para desenvolvimento local | PostgreSQL (Neon) para produção
// ============================================================

const isPostgres = Boolean(process.env.DATABASE_URL);
const dbPath = process.env.DB_PATH || './data/imperio.db';
const resolvedPath = path.resolve(process.cwd(), dbPath);
const dbDir = path.dirname(resolvedPath);

// Em produção, exige PostgreSQL para garantir persistência real
if (process.env.NODE_ENV === 'production' && !isPostgres) {
  throw new Error(
    'DATABASE_URL deve apontar para um banco PostgreSQL persistente em produção. ' +
    'Configure a variável DATABASE_URL nas configurações do ambiente (ex: Vercel Dashboard).'
  );
}

// Cria diretório local do SQLite se necessário
if (!isPostgres && !fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let sqliteInstance = null;
let postgresPool = null;

// ------------------------------------------------------------------
// SQLite — Desenvolvimento local
// ------------------------------------------------------------------
function getSqliteDb() {
  if (sqliteInstance) return sqliteInstance;

  const sqlite3 = require('sqlite3').verbose();
  sqliteInstance = new sqlite3.Database(resolvedPath, (err) => {
    if (err) {
      console.error('❌ Erro ao conectar ao banco SQLite:', err.message);
    } else {
      sqliteInstance.run('PRAGMA foreign_keys = ON;');
      sqliteInstance.run('PRAGMA journal_mode = WAL;');
      sqliteInstance.run('PRAGMA synchronous = NORMAL;');
      if (process.env.NODE_ENV !== 'test') {
        console.log(`📦 SQLite conectado: ${resolvedPath}`);
      }
    }
  });

  return sqliteInstance;
}

// ------------------------------------------------------------------
// PostgreSQL — Neon (produção / Vercel)
// Pool configurado para ambiente serverless:
//   max: 3  → limita conexões simultâneas no plano gratuito Neon
//   idleTimeoutMillis: 10s → fecha conexões ociosas rapidamente
//   connectionTimeoutMillis: 10s → falha rápido em vez de travar
//   ssl: require → obrigatório no Neon
// ------------------------------------------------------------------
function getPostgresPool() {
  if (postgresPool) return postgresPool;

  const { Pool, types } = require('pg');

  // Garante que BIGINT retorna number (não string) no Node.js
  types.setTypeParser(20, (value) => Number(value));
  // Garante que campos NUMERIC retornam float (não string)
  types.setTypeParser(1700, (value) => parseFloat(value));

  postgresPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // SSL obrigatório — Neon rejeita conexões sem SSL
    ssl: { rejectUnauthorized: false },
    max: 3,                    // Máximo de conexões no pool
    idleTimeoutMillis: 10000,  // Fecha conexão ociosa após 10s
    connectionTimeoutMillis: 10000 // Timeout para obter conexão do pool
  });

  postgresPool.on('error', (err) => {
    console.error('❌ Erro inesperado no pool PostgreSQL:', err.message);
  });

  return postgresPool;
}

// ------------------------------------------------------------------
// Converte placeholders SQLite (?) para PostgreSQL ($1, $2...)
// Garante compatibilidade total entre os dois dialetos
// ------------------------------------------------------------------
function toPgParams(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

// ------------------------------------------------------------------
// API pública — mesma interface independente do banco
// Todas as funções retornam Promises
// ------------------------------------------------------------------
const db = {
  /** Retorna o cliente raw (Pool ou sqlite3.Database) */
  getRawDb() {
    return isPostgres ? getPostgresPool() : getSqliteDb();
  },

  /** Retorna todas as linhas de uma consulta */
  all(sql, params = []) {
    if (isPostgres) {
      return getPostgresPool()
        .query(toPgParams(sql), params)
        .then((result) => result.rows);
    }

    return new Promise((resolve, reject) => {
      getSqliteDb().all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  },

  /** Retorna a primeira linha ou null */
  get(sql, params = []) {
    if (isPostgres) {
      return getPostgresPool()
        .query(toPgParams(sql), params)
        .then((result) => result.rows[0] || null);
    }

    return new Promise((resolve, reject) => {
      getSqliteDb().get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      });
    });
  },

  /**
   * Executa INSERT / UPDATE / DELETE.
   * Retorna { lastID, changes } — compatível com os controllers existentes.
   * Para INSERT no PostgreSQL, adiciona RETURNING * automaticamente.
   */
  run(sql, params = []) {
    if (isPostgres) {
      const pgSql = toPgParams(sql);
      const isInsert = /^\s*INSERT\b/i.test(pgSql);
      const hasReturning = /\bRETURNING\b/i.test(pgSql);
      const finalSql = isInsert && !hasReturning
        ? `${pgSql.trimEnd().replace(/;$/, '')} RETURNING *`
        : pgSql;

      return getPostgresPool()
        .query(finalSql, params)
        .then((result) => ({
          lastID: result.rows[0]?.id ?? undefined,
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

  /**
   * Executa SQL bruto (DDL, múltiplas instruções separadas por ;).
   * Usado pelo setup/migrations.
   * No PostgreSQL, divide por ";" e executa cada instrução individualmente.
   */
  async exec(sql) {
    if (isPostgres) {
      const pool = getPostgresPool();
      const client = await pool.connect();
      try {
        // Divide as instruções e filtra linhas vazias/comentários
        const statements = sql
          .split(/;\s*\n/)
          .map((s) => s.trim())
          .filter((s) => s && !s.startsWith('--'));

        for (const stmt of statements) {
          if (stmt) await client.query(stmt);
        }
      } finally {
        client.release();
      }
      return;
    }

    return new Promise((resolve, reject) => {
      getSqliteDb().exec(sql, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  },

  /**
   * Executa múltiplas operações em uma única transação PostgreSQL.
   * No SQLite não há suporte nativo aqui, executa sequencialmente.
   * @param {Function} callback — recebe { run, all, get } com o client da transação
   */
  async transaction(callback) {
    if (isPostgres) {
      const pool = getPostgresPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const txDb = {
          run: (sql, params = []) => {
            const pgSql = toPgParams(sql);
            const isInsert = /^\s*INSERT\b/i.test(pgSql);
            const hasReturning = /\bRETURNING\b/i.test(pgSql);
            const finalSql = isInsert && !hasReturning
              ? `${pgSql.trimEnd().replace(/;$/, '')} RETURNING *`
              : pgSql;
            return client.query(finalSql, params).then((r) => ({
              lastID: r.rows[0]?.id ?? undefined,
              changes: r.rowCount
            }));
          },
          all: (sql, params = []) =>
            client.query(toPgParams(sql), params).then((r) => r.rows),
          get: (sql, params = []) =>
            client.query(toPgParams(sql), params).then((r) => r.rows[0] || null)
        };
        const result = await callback(txDb);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // SQLite — executa sequencialmente (sem transação explícita neste wrapper)
    return callback(db);
  },

  /** Encerra o pool/banco (usado nos testes e graceful shutdown) */
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
