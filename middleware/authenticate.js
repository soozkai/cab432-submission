const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  if (process.env.NODE_ENV === 'development') {
    return next(); 
}
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ success: false, message: 'Unauthorized: No token provided' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Forbidden: Invalid token' });
    req.user = user; 
    next(); 
  });
}

module.exports = authenticateToken;