const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { seedDatabase } = require('./seeds');

async function setup() {
  try {
    const schemaFile = process.env.DATABASE_URL ? 'schema.postgres.sql' : 'schema.sql';
    const databaseType = process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite';
    console.log(`🚀 Iniciando configuração do banco de dados ${databaseType}...`);
    const schemaSql = fs.readFileSync(path.join(__dirname, schemaFile), 'utf-8');
    
    // Executa o script DDL do banco selecionado.
    await db.exec(schemaSql);
    console.log(`📄 Tabelas e índices ${databaseType} criados com sucesso.`);

    await seedDatabase();
    console.log('🎉 Setup do banco de dados concluído com sucesso!');
  } catch (error) {
    console.error('❌ Falha ao configurar o banco de dados:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  setup().then(() => {
    process.exit(0);
  });
}

module.exports = { setup };
