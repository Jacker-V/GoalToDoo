import dotenv from 'dotenv';
dotenv.config();

export const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/goalcalendar',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'default_access_secret_for_dev_mode_only',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret_for_dev_mode_only',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  MAX_DAILY_CHAT_REQUESTS: parseInt(process.env.MAX_DAILY_CHAT_REQUESTS || process.env.AI_DAILY_QUOTA_REQUESTS || '50', 10),
  AI_DAILY_QUOTA_REQUESTS: parseInt(process.env.MAX_DAILY_CHAT_REQUESTS || process.env.AI_DAILY_QUOTA_REQUESTS || '50', 10),
  MAX_DAILY_INPUT_TOKENS: parseInt(process.env.MAX_DAILY_INPUT_TOKENS || '100000', 10),
  MAX_DAILY_OUTPUT_TOKENS: parseInt(process.env.MAX_DAILY_OUTPUT_TOKENS || '50000', 10),
  MAX_UPLOAD_FILE_SIZE_MB: parseInt(process.env.MAX_UPLOAD_FILE_SIZE_MB || '10', 10),
  ALLOWED_FILE_TYPES: process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/webp,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};
