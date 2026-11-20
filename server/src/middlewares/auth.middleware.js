import { verifyAccessToken } from '../utils/jwt.js';
import { User } from '../models/user.model.js';
import { AppError } from '../utils/response.js';

export const requireAuth = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && /^Bearer\s+/i.test(authHeader)) {
      token = authHeader.replace(/^Bearer\s+/i, '').trim();
    } else if (req.query && req.query.token) {
      token = req.query.token;
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return next(new AppError('Authentication required. No token provided.', 401, 'UNAUTHORIZED'));
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new AppError('Token expired. Please refresh your session.', 401, 'TOKEN_EXPIRED'));
      }
      return next(new AppError('Invalid token.', 401, 'INVALID_TOKEN'));
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new AppError('User belonging to this token no longer exists.', 401, 'USER_NOT_FOUND'));
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};
