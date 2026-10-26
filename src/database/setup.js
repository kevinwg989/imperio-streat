const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { seedDatabase } = require('./seeds');

async function setup() {
  try {
    console.log('🚀 Iniciando configuração do banco de dados SQLite...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    
    // SQLite executa todo o script DDL
    await db.exec(schemaSql);
    console.log('📄 Tabelas e índices criados com sucesso.');

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
