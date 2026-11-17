import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { AppError, sendSuccess } from '../utils/response.js';

// Helper to configure refresh token cookie
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const setRefreshTokenCookie = (res, token) => {
  res.cookie('refreshToken', token, REFRESH_COOKIE_OPTIONS);
};

export const register = async (req, res, next) => {
  try {
    const { name, email, password, settings } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('An account with this email already exists', 409, 'EMAIL_EXISTS'));
    }

    const passwordHash = await User.hashPassword(password);
    const user = new User({
      name,
      email,
      passwordHash,
      settings: settings || {},
    });

    const accessToken = signAccessToken({ id: user._id, email: user.email });
    const refreshToken = signRefreshToken({ id: user._id, email: user.email });

    user.refreshTokens = [refreshToken];
    await user.save();

    setRefreshTokenCookie(res, refreshToken);

    return sendSuccess(
      res,
      {
        user: user.toJSON(),
        accessToken,
        refreshToken,
      },
      201
    );
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      return next(new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
    }

    const accessToken = signAccessToken({ id: user._id, email: user.email });
    const refreshToken = signRefreshToken({ id: user._id, email: user.email });

    // Atomically append new refresh token and keep at most 5 latest (prevents VersionError on concurrent logins)
    await User.findByIdAndUpdate(user._id, {
      $push: {
        refreshTokens: {
          $each: [refreshToken],
          $slice: -5,
        },
      },
    });

    setRefreshTokenCookie(res, refreshToken);

    return sendSuccess(res, {
      user: user.toJSON(),
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const token = req.body.refreshToken || req.cookies?.refreshToken;
    if (!token) {
      return next(new AppError('Refresh token required', 400, 'MISSING_REFRESH_TOKEN'));
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (err) {
      return next(new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN'));
    }

    // Prepare rotated credentials
    const newAccessToken = signAccessToken({ id: decoded.id, email: decoded.email });
    const newRefreshToken = signRefreshToken({ id: decoded.id, email: decoded.email });

    // Atomic rotation using update pipeline to avoid ConflictingUpdateOperators on refreshTokens
    const updatedUser = await User.findOneAndUpdate(
      { _id: decoded.id, refreshTokens: token },
      [
        {
          $set: {
            refreshTokens: {
              $slice: [
                {
                  $concatArrays: [
                    {
                      $filter: {
                        input: { $ifNull: ['$refreshTokens', []] },
                        as: 't',
                        cond: { $ne: ['$$t', token] },
                      },
                    },
                    [newRefreshToken],
                  ],
                },
                -5,
              ],
            },
          },
        },
      ],
      { new: true }
    );

    if (!updatedUser) {
      // The token was cryptographically valid but not present in active tokens array.
      // This indicates TOKEN REUSE (compromise/theft)! Invalidate all sessions per OAuth 2.0 BCP.
      const userExists = await User.findById(decoded.id);
      if (userExists) {
        await User.findByIdAndUpdate(decoded.id, { $set: { refreshTokens: [] } });
      }
      return next(
        new AppError(
          'Refresh token revoked or invalid. All active sessions terminated.',
          401,
          'REVOKED_TOKEN'
        )
      );
    }

    setRefreshTokenCookie(res, newRefreshToken);

    return sendSuccess(res, {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    const token = req.body.refreshToken || req.cookies?.refreshToken;
    if (token && typeof token === 'string') {
      try {
        // Decode without expiration check so expired tokens can still be pruned from DB
        const decoded = jwt.decode(token);
        if (decoded?.id) {
          await User.findByIdAndUpdate(decoded.id, {
            $pull: { refreshTokens: token },
          });
        }
      } catch {
        // Silently continue
      }
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return sendSuccess(res, { message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res, next) => {
  try {
    return sendSuccess(res, { user: req.user.toJSON() });
  } catch (err) {
    next(err);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const { name, language, theme, weekStartsOn } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return next(new AppError('User not found', 404, 'NOT_FOUND'));
    }

    if (name) user.name = name;
    if (language !== undefined) user.settings.language = language;
    if (theme !== undefined) user.settings.theme = theme;
    if (weekStartsOn !== undefined) user.settings.weekStartsOn = weekStartsOn;

    await user.save();

    return sendSuccess(res, { user: user.toJSON() });
  } catch (err) {
    next(err);
  }
};
