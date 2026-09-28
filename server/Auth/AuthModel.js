const client = require('../utils/conn');
const jwt = require('jsonwebtoken');
const { comparePasswords } = require('../utils/hash');
const { createSession } = require('./sessionStore');

const LoginModel = async (user_mail, user_password, deviceInfo, ipAddress) => {
  const result = await client.query(
    `SELECT mail_data, password, role, name
     FROM public.user_date
     WHERE lower(mail_data) = lower($1)
     LIMIT 1`,
    [user_mail]
  );
  if (!result.rows.length) {
    return { status: 'Invalid credentials', code: 401 };
  }

  const user = result.rows[0];
  if (!await comparePasswords(user_password, user.password)) {
    return { status: 'Invalid credentials', code: 401 };
  }

  const session = await createSession(user, deviceInfo, ipAddress);
  const tokenPayload = {
    sub: user.mail_data,
    people_id: user.mail_data,
    user_mail: user.mail_data,
    role: user.role || 'user',
    sid: session.id,
  };
  const accessToken = jwt.sign(tokenPayload, process.env.ACCESS_TOKEN_SECRET, {
    algorithm: 'HS256',
    expiresIn: '1h',
  });

  return {
    accessToken,
    id: user.mail_data,
    role: user.role || 'user',
    people_id: user.mail_data,
    status: 'Login Authenticated',
    name: user.name || user.mail_data,
    code: 200,
  };
};

module.exports = LoginModel;
