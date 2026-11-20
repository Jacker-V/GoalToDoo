import { Deck, Card } from '../models/index.js';
import { syncLearnGoals, syncDailyReviewTask } from '../services/learnTaskSync.service.js';
import { sendSuccess, sendError, AppError } from '../../../utils/response.js';

export const getDecks = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const decks = await Deck.find({ userId }).sort({ createdAt: -1 });

    const now = new Date();
    const stats = await Card.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$deckId',
          totalCards: { $sum: 1 },
          dueCards: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$srs.status', 'suspended'] },
                    { $lte: ['$srs.dueDate', now] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          masteredCards: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$srs.status', 'suspended'] },
                    {
                      $or: [
                        { $gte: ['$srs.intervalDays', 21] },
                        { $gte: ['$srs.repetitions', 3] },
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const statsMap = new Map();
    for (const s of stats) {
      if (s._id) {
        statsMap.set(s._id.toString(), {
          totalCards: s.totalCards || 0,
          dueCards: s.dueCards || 0,
          masteredCards: s.masteredCards || 0,
        });
      }
    }

    const decksWithStats = decks.map((deck) => {
      const s = statsMap.get(deck._id.toString()) || {
        totalCards: 0,
        dueCards: 0,
        masteredCards: 0,
      };
      return {
        ...deck.toObject(),
        totalCards: s.totalCards,
        dueCards: s.dueCards,
        masteredCards: s.masteredCards,
      };
    });

    return sendSuccess(res, decksWithStats);
  } catch (err) {
    next(err);
  }
};

export const createDeck = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { name, color, description } = req.body;

    const deck = await Deck.create({
      userId,
      name,
      color: color || '#6366f1',
      description: description || '',
    });

    return sendSuccess(res, {
      ...deck.toObject(),
      totalCards: 0,
      dueCards: 0,
      masteredCards: 0,
    }, 201);
  } catch (err) {
    next(err);
  }
};

export const updateDeck = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const { name, color, description } = req.body;

    const deck = await Deck.findOne({ _id: id, userId });
    if (!deck) {
      return next(new AppError('Deck not found', 404, 'NOT_FOUND'));
    }

    if (name !== undefined) deck.name = name;
    if (color !== undefined) deck.color = color;
    if (description !== undefined) deck.description = description;

    await deck.save();
    return sendSuccess(res, deck);
  } catch (err) {
    next(err);
  }
};

export const deleteDeck = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const cascade = req.query.cascade !== 'false';

    const deck = await Deck.findOne({ _id: id, userId });
    if (!deck) {
      return next(new AppError('Deck not found', 404, 'NOT_FOUND'));
    }

    let deletedCardsCount = 0;
    let releasedCardsCount = 0;
    if (cascade) {
      const deleteResult = await Card.deleteMany({ deckId: deck._id, userId });
      deletedCardsCount = deleteResult.deletedCount;
    } else {
      const updateResult = await Card.updateMany(
        { deckId: deck._id, userId },
        { $set: { deckId: null } }
      );
      releasedCardsCount = updateResult.modifiedCount;
    }

    await Deck.deleteOne({ _id: deck._id });

    if (deletedCardsCount > 0) {
      await syncLearnGoals(userId);
      await syncDailyReviewTask(userId);
    }

    return sendSuccess(res, {
      message: 'Deck deleted successfully',
      deletedCardsCount,
      releasedCardsCount,
    });
  } catch (err) {
    next(err);
  }
};

export const mergeDecks = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { sourceDeckId, targetDeckId } = req.body;

    if (sourceDeckId === targetDeckId) {
      return next(new AppError('Source deck and target deck must be different', 400, 'INVALID_REQUEST'));
    }

    const [sourceDeck, targetDeck] = await Promise.all([
      Deck.findOne({ _id: sourceDeckId, userId }),
      Deck.findOne({ _id: targetDeckId, userId }),
    ]);

    if (!sourceDeck) {
      return next(new AppError('Source deck not found', 404, 'SOURCE_DECK_NOT_FOUND'));
    }
    if (!targetDeck) {
      return next(new AppError('Target deck not found', 404, 'TARGET_DECK_NOT_FOUND'));
    }

    const updateResult = await Card.updateMany(
      { deckId: sourceDeck._id, userId },
      { $set: { deckId: targetDeck._id } }
    );

    await Deck.deleteOne({ _id: sourceDeck._id });

    return sendSuccess(res, {
      message: 'Decks merged successfully',
      movedCardsCount: updateResult.modifiedCount,
      targetDeckId: targetDeck._id,
      targetDeckName: targetDeck.name,
    });
  } catch (err) {
    next(err);
  }
};
