const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'imperio_fallback_secret_never_use_in_prod';

async function authenticateAdmin(req, res, next) {
  try {
    let token = null;

    // Header Authorization: Bearer <token>
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.imperio_admin_token) {
      token = req.cookies.imperio_admin_token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Acesso não autorizado. Faça login para acessar o painel administrativo.'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const admin = await db.get(
      'SELECT id, name, email, role, created_at, last_login FROM admins WHERE id = ?',
      [decoded.id]
    );

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'Administrador não encontrado ou inativo.'
      });
    }

    req.admin = admin;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Sessão expirada ou inválida. Por favor, autentique-se novamente.'
    });
  }
}

module.exports = {
  authenticateAdmin,
  JWT_SECRET
};
