import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../../../middlewares/auth.middleware.js';
import {
  validateBody,
  validateParams,
  idParamSchema,
} from '../../../middlewares/validate.middleware.js';
import {
  createConversationSchema,
  updateConversationSchema,
  sendMessageSchema,
  messageFeedbackSchema,
  addCardsActionSchema,
  updateLearnerProfileSchema,
  applyPlanSchema,
} from '../validators/chat.validator.js';
import * as chatController from '../controllers/chat.controller.js';
import { fileService } from '../services/file.service.js';

const router = Router();

// Rate limiter for chat message generation (20 requests per minute per user)
const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 100 : 20,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Bạn đã gửi quá nhiều yêu cầu chat. Tối đa 20 yêu cầu mỗi phút. Vui lòng thử lại sau giây lát.',
    },
  },
});

/**
 * Middleware wrapper for multer file upload with standardized error responses.
 */
const handleFileUpload = (req, res, next) => {
  fileService.upload.array('files', 5)(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'Kích thước tệp vượt quá giới hạn 10MB',
          },
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'TOO_MANY_FILES',
            message: 'Tối đa 5 tệp cho mỗi lần gửi',
          },
        });
      }
      return res.status(400).json({
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: err.message,
        },
      });
    }
    next();
  });
};

router.use(requireAuth);

// Usage stats
router.get('/usage', chatController.getAiUsage);

// File attachments API
router.post('/files', handleFileUpload, chatController.uploadFiles);
router.get('/files/:id', validateParams(idParamSchema), chatController.getFile);
router.delete('/files/:id', validateParams(idParamSchema), chatController.deleteFile);

// Learner Profile API (Giai đoạn 13)
router.get('/profile', chatController.getLearnerProfile);
router.patch('/profile', validateBody(updateLearnerProfileSchema), chatController.updateLearnerProfile);
router.delete('/profile', chatController.resetLearnerProfile);

// Action: Add proposed cards to deck
router.post('/actions/add-cards', validateBody(addCardsActionSchema), chatController.addCardsAction);

// Action: Apply hierarchical study plan to calendar & goals (Giai đoạn 13)
router.post('/actions/apply-plan', validateBody(applyPlanSchema), chatController.applyPlanAction);

// Conversations CRUD
router.get('/conversations', chatController.getConversations);
router.post('/conversations', validateBody(createConversationSchema), chatController.createConversation);
router.patch(
  '/conversations/:id',
  validateParams(idParamSchema),
  validateBody(updateConversationSchema),
  chatController.updateConversation
);
router.delete('/conversations/:id', validateParams(idParamSchema), chatController.deleteConversation);

// Messages in conversation
router.get('/conversations/:id/messages', validateParams(idParamSchema), chatController.getMessages);
router.post(
  '/conversations/:id/messages',
  chatRateLimiter,
  validateParams(idParamSchema),
  validateBody(sendMessageSchema),
  chatController.sendMessageStream
);

// Message Feedback
router.post(
  '/messages/:id/feedback',
  validateParams(idParamSchema),
  validateBody(messageFeedbackSchema),
  chatController.updateMessageFeedback
);

export default router;
