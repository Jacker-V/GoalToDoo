import { Router } from 'express';
import { requireAuth } from '../../../middlewares/auth.middleware.js';
import {
  validateBody,
  validateQuery,
  validateParams,
  idParamSchema,
} from '../../../middlewares/validate.middleware.js';
import {
  createDeckSchema,
  updateDeckSchema,
  mergeDeckSchema,
} from '../validators/deck.validator.js';
import {
  createCardSchema,
  updateCardSchema,
  queryCardSchema,
  bulkImportSchema,
} from '../validators/card.validator.js';
import {
  reviewQueueQuerySchema,
  answerCardSchema,
  updateLearnSettingsSchema,
} from '../validators/review.validator.js';
import * as deckController from '../controllers/deck.controller.js';
import * as cardController from '../controllers/card.controller.js';
import * as reviewController from '../controllers/review.controller.js';
import chatRoutes from './chat.routes.js';

const router = Router();

router.use(requireAuth);

// --- Settings API ---
router.get('/settings', reviewController.getLearnSettings);
router.patch('/settings', validateBody(updateLearnSettingsSchema), reviewController.updateLearnSettings);

// --- Review Session API ---
router.get('/review/queue', validateQuery(reviewQueueQuerySchema), reviewController.getReviewQueue);
router.post('/review/answer', validateBody(answerCardSchema), reviewController.answerCard);

// --- Learn Stats API ---
router.get('/stats', reviewController.getLearnStats);

// --- Decks API ---
router.get('/decks', deckController.getDecks);
router.post('/decks', validateBody(createDeckSchema), deckController.createDeck);
router.patch('/decks/:id', validateParams(idParamSchema), validateBody(updateDeckSchema), deckController.updateDeck);
router.delete('/decks/:id', validateParams(idParamSchema), deckController.deleteDeck);
router.post('/decks/merge', validateBody(mergeDeckSchema), deckController.mergeDecks);

// --- Cards API ---
router.get('/cards', validateQuery(queryCardSchema), cardController.getCards);
router.post('/cards', validateBody(createCardSchema), cardController.createCard);
router.post('/cards/bulk', validateBody(bulkImportSchema), cardController.bulkImportCards);
router.get('/cards/:id', validateParams(idParamSchema), cardController.getCardById);
router.patch('/cards/:id', validateParams(idParamSchema), validateBody(updateCardSchema), cardController.updateCard);
router.delete('/cards/:id', validateParams(idParamSchema), cardController.deleteCard);
router.patch('/cards/:id/suspend', validateParams(idParamSchema), cardController.suspendCard);

// --- AI Chatbot Sub-routes ---
router.use('/chat', chatRoutes);

export default router;
