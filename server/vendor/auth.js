const jwt = require('jsonwebtoken');

function requireUser(req, res, next) {
  const secret = process.env.ACCESS_TOKEN_SECRET || process.env.AUTH_JWT_SECRET;
  if (!secret) {
    return res.status(503).json({ error: 'Vendor authentication is not configured' });
  }
  const match = /^Bearer (.+)$/i.exec(req.headers.authorization || '');
  if (!match) return res.status(401).json({ error: 'Sign in to manage vendors' });
  try {
    const claims = jwt.verify(match[1], secret, {
      algorithms: ['HS256'],
    });
    const userId = claims.people_id || claims.peopleId || claims.user_id || claims.userId || claims.sub;
    if (!userId) throw new Error('Missing user ID');
    req.vendorUserId = String(userId);
    next();
  } catch (_error) {
    res.status(401).json({ error: 'Your sign-in has expired or is invalid' });
  }
}

module.exports = { requireUser };
