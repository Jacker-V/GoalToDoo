import { Card, Deck } from '../models/index.js';
import { parseRawCardsText } from '../services/parser.service.js';
import { syncLearnGoals, syncDailyReviewTask } from '../services/learnTaskSync.service.js';
import { sendSuccess, sendError, AppError } from '../../../utils/response.js';

function escapeRegex(text) {
  if (!text) return '';
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export const getCards = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const {
      deckId,
      status,
      tag,
      source,
      search,
      dueOnly,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const filter = { userId };

    if (deckId) {
      filter.deckId = deckId;
    }

    if (status) {
      filter['srs.status'] = status;
    }

    if (tag) {
      filter.tags = tag;
    }

    if (source) {
      filter.source = { $regex: escapeRegex(source), $options: 'i' };
    }

    if (dueOnly) {
      filter['srs.status'] = { $ne: 'suspended' };
      filter['srs.dueDate'] = { $lte: new Date() };
    }

    if (search) {
      const escaped = escapeRegex(search);
      filter.$or = [
        { word: { $regex: escaped, $options: 'i' } },
        { meaning: { $regex: escaped, $options: 'i' } },
        { example: { $regex: escaped, $options: 'i' } },
      ];
    }

    const sortDirection = sortOrder === 'asc' || sortOrder === '1' ? 1 : -1;
    const total = await Card.countDocuments(filter);
    const cards = await Card.find(filter)
      .populate('deckId', 'name color')
      .sort({ [sortBy]: sortDirection })
      .skip((page - 1) * limit)
      .limit(limit);

    return sendSuccess(res, cards, 200, {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    next(err);
  }
};

export const getCardById = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const card = await Card.findOne({ _id: id, userId }).populate('deckId', 'name color');
    if (!card) {
      return next(new AppError('Card not found', 404, 'NOT_FOUND'));
    }

    return sendSuccess(res, card);
  } catch (err) {
    next(err);
  }
};

export const createCard = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const {
      deckId,
      word,
      meaning,
      partOfSpeech = 'other',
      example = '',
      note = '',
      source = '',
      tags = [],
      imageUrl = '',
      allowDuplicate = false,
    } = req.body;

    const deck = await Deck.findOne({ _id: deckId, userId });
    if (!deck) {
      return next(new AppError('Deck not found', 404, 'DECK_NOT_FOUND'));
    }

    const trimmedWord = word.trim();
    const existing = await Card.findOne({
      userId,
      deckId,
      word: { $regex: `^${escapeRegex(trimmedWord)}$`, $options: 'i' },
    });

    if (existing && !allowDuplicate) {
      return sendError(res, 'Từ này đã tồn tại trong deck', 409, 'DUPLICATE_CARD', {
        existingCardId: existing._id,
        word: existing.word,
      });
    }

    const card = await Card.create({
      userId,
      deckId,
      word: trimmedWord,
      meaning: meaning.trim(),
      partOfSpeech,
      example: example.trim(),
      note: note.trim(),
      source: source.trim(),
      tags: Array.isArray(tags) ? tags : [],
      imageUrl: imageUrl.trim(),
    });

    const populated = await Card.findById(card._id).populate('deckId', 'name color');

    await syncLearnGoals(userId);
    await syncDailyReviewTask(userId);

    return sendSuccess(res, populated, 201);
  } catch (err) {
    next(err);
  }
};

export const updateCard = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const {
      deckId,
      word,
      meaning,
      partOfSpeech,
      example,
      note,
      source,
      tags,
      imageUrl,
      srs,
    } = req.body;

    const card = await Card.findOne({ _id: id, userId });
    if (!card) {
      return next(new AppError('Card not found', 404, 'NOT_FOUND'));
    }

    if (deckId && (!card.deckId || deckId !== card.deckId.toString())) {
      const deck = await Deck.findOne({ _id: deckId, userId });
      if (!deck) {
        return next(new AppError('Target deck not found', 404, 'DECK_NOT_FOUND'));
      }
      card.deckId = deckId;
    }

    if (word !== undefined) card.word = word.trim();
    if (meaning !== undefined) card.meaning = meaning.trim();
    if (partOfSpeech !== undefined) card.partOfSpeech = partOfSpeech;
    if (example !== undefined) card.example = example.trim();
    if (note !== undefined) card.note = note.trim();
    if (source !== undefined) card.source = source.trim();
    if (tags !== undefined) card.tags = tags;
    if (imageUrl !== undefined) card.imageUrl = imageUrl.trim();

    if (srs && typeof srs === 'object') {
      if (srs.easeFactor !== undefined) card.srs.easeFactor = srs.easeFactor;
      if (srs.intervalDays !== undefined) card.srs.intervalDays = srs.intervalDays;
      if (srs.repetitions !== undefined) card.srs.repetitions = srs.repetitions;
      if (srs.lapses !== undefined) card.srs.lapses = srs.lapses;
      if (srs.dueDate !== undefined) card.srs.dueDate = srs.dueDate;
      if (srs.lastReviewedAt !== undefined) card.srs.lastReviewedAt = srs.lastReviewedAt;
      if (srs.status !== undefined) card.srs.status = srs.status;
    }

    await card.save();
    const updated = await Card.findById(card._id).populate('deckId', 'name color');

    await syncLearnGoals(userId);
    await syncDailyReviewTask(userId);

    return sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
};

export const deleteCard = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const card = await Card.findOneAndDelete({ _id: id, userId });
    if (!card) {
      return next(new AppError('Card not found', 404, 'NOT_FOUND'));
    }

    await syncLearnGoals(userId);
    await syncDailyReviewTask(userId);

    return sendSuccess(res, { message: 'Card deleted successfully' });
  } catch (err) {
    next(err);
  }
};

export const suspendCard = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const card = await Card.findOne({ _id: id, userId });
    if (!card) {
      return next(new AppError('Card not found', 404, 'NOT_FOUND'));
    }

    if (card.srs.status === 'suspended') {
      card.srs.status = card.srs.repetitions > 0 || card.srs.intervalDays > 0 ? 'review' : 'new';
    } else {
      card.srs.status = 'suspended';
    }

    await card.save();
    const updated = await Card.findById(card._id).populate('deckId', 'name color');

    await syncLearnGoals(userId);
    await syncDailyReviewTask(userId);

    return sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
};

export const bulkImportCards = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const {
      deckId,
      rawText,
      cards: manualCards,
      preview = false,
      skipDuplicates = true,
      updateDuplicates = false,
      source = '',
      tags = [],
    } = req.body;

    const deck = await Deck.findOne({ _id: deckId, userId });
    if (!deck) {
      return next(new AppError('Deck not found', 404, 'DECK_NOT_FOUND'));
    }

    let itemsToProcess = [];
    if (Array.isArray(manualCards) && manualCards.length > 0) {
      itemsToProcess = manualCards.map((c) => ({
        word: (c.word || '').trim(),
        meaning: (c.meaning || '').trim(),
        partOfSpeech: c.partOfSpeech || 'other',
        example: (c.example || '').trim(),
        note: (c.note || '').trim(),
        source: (c.source || source || '').trim(),
        tags: Array.isArray(c.tags) && c.tags.length > 0 ? c.tags : tags,
      }));
    } else if (rawText) {
      itemsToProcess = parseRawCardsText(rawText, { source, tags });
    }

    if (itemsToProcess.length === 0) {
      return next(new AppError('No valid cards to import', 400, 'NO_CARDS_PARSED'));
    }

    // Check duplicates against user's cards in this deck
    const existingCards = await Card.find({ userId, deckId }).select('word _id');
    const existingMap = new Map();
    for (const c of existingCards) {
      existingMap.set(c.word.trim().toLowerCase(), c._id);
    }

    const seenInBatch = new Set();
    const processedItems = itemsToProcess.map((item) => {
      const normalized = item.word.trim().toLowerCase();
      const isExistingInDb = existingMap.has(normalized);
      const isDuplicateInBatch = seenInBatch.has(normalized);
      const isDuplicate = isExistingInDb || isDuplicateInBatch;

      seenInBatch.add(normalized);

      return {
        ...item,
        isDuplicate,
        duplicateReason: isExistingInDb
          ? 'Đã tồn tại trong deck này'
          : isDuplicateInBatch
          ? 'Lặp lại trong danh sách nhập'
          : null,
        existingCardId: isExistingInDb ? existingMap.get(normalized) : null,
      };
    });

    const duplicatesCount = processedItems.filter((i) => i.isDuplicate).length;

    // PREVIEW MODE: return parsed cards without touching DB
    if (preview) {
      return sendSuccess(res, {
        preview: true,
        total: processedItems.length,
        duplicatesCount,
        cards: processedItems,
      });
    }

    // COMMIT / SAVE MODE
    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const cardsToInsert = [];

    for (const item of processedItems) {
      if (item.isDuplicate) {
        if (item.existingCardId) {
          if (updateDuplicates) {
            await Card.updateOne(
              { _id: item.existingCardId, userId },
              {
                $set: {
                  meaning: item.meaning,
                  partOfSpeech: item.partOfSpeech,
                  example: item.example,
                  note: item.note,
                  source: item.source,
                  tags: item.tags,
                },
              }
            );
            updatedCount++;
          } else if (skipDuplicates) {
            skippedCount++;
          } else {
            // Force insert duplicate
            cardsToInsert.push({
              userId,
              deckId,
              word: item.word,
              meaning: item.meaning,
              partOfSpeech: item.partOfSpeech,
              example: item.example,
              note: item.note,
              source: item.source,
              tags: item.tags,
            });
          }
        } else {
          // Duplicate within current import batch
          if (updateDuplicates) {
            const foundInBatch = cardsToInsert.find(
              (c) => c.word.toLowerCase() === item.word.toLowerCase()
            );
            if (foundInBatch) {
              foundInBatch.meaning = item.meaning;
              foundInBatch.partOfSpeech = item.partOfSpeech;
              foundInBatch.example = item.example;
              foundInBatch.note = item.note;
              foundInBatch.source = item.source;
              foundInBatch.tags = item.tags;
              updatedCount++;
            } else {
              cardsToInsert.push({
                userId,
                deckId,
                word: item.word,
                meaning: item.meaning,
                partOfSpeech: item.partOfSpeech,
                example: item.example,
                note: item.note,
                source: item.source,
                tags: item.tags,
              });
            }
          } else if (skipDuplicates) {
            skippedCount++;
          } else {
            cardsToInsert.push({
              userId,
              deckId,
              word: item.word,
              meaning: item.meaning,
              partOfSpeech: item.partOfSpeech,
              example: item.example,
              note: item.note,
              source: item.source,
              tags: item.tags,
            });
          }
        }
      } else {
        cardsToInsert.push({
          userId,
          deckId,
          word: item.word,
          meaning: item.meaning,
          partOfSpeech: item.partOfSpeech,
          example: item.example,
          note: item.note,
          source: item.source,
          tags: item.tags,
        });
      }
    }

    let insertedCards = [];
    if (cardsToInsert.length > 0) {
      insertedCards = await Card.insertMany(cardsToInsert);
      insertedCount = insertedCards.length;
    }

    await syncLearnGoals(userId);
    await syncDailyReviewTask(userId);

    return sendSuccess(
      res,
      {
        message: 'Bulk import completed successfully',
        totalProcessed: processedItems.length,
        insertedCount,
        updatedCount,
        skippedCount,
        cards: insertedCards,
      },
      201
    );
  } catch (err) {
    next(err);
  }
};
