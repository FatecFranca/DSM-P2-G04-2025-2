const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt');

const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return next();
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
  } catch (error) {
  }
  next();
};

module.exports = optionalAuth;


