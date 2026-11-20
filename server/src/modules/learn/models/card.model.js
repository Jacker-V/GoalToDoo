import mongoose from 'mongoose';

const srsSchema = new mongoose.Schema(
  {
    easeFactor: {
      type: Number,
      default: 2.5,
    },
    intervalDays: {
      type: Number,
      default: 0,
    },
    repetitions: {
      type: Number,
      default: 0,
    },
    lapses: {
      type: Number,
      default: 0,
    },
    dueDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastReviewedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['new', 'learning', 'review', 'suspended'],
      default: 'new',
    },
  },
  { _id: false }
);

const cardSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    deckId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deck',
      default: null,
      index: true,
    },
    word: {
      type: String,
      required: [true, 'Word is required'],
      trim: true,
    },
    meaning: {
      type: String,
      required: [true, 'Meaning is required'],
      trim: true,
    },
    partOfSpeech: {
      type: String,
      enum: [
        'noun',
        'verb',
        'adjective',
        'adverb',
        'preposition',
        'conjunction',
        'idiom',
        'phrase',
        'other',
      ],
      default: 'other',
    },
    example: {
      type: String,
      default: '',
      trim: true,
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
    source: {
      type: String,
      default: '',
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    imageUrl: {
      type: String,
      default: '',
      trim: true,
    },
    srs: {
      type: srsSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

cardSchema.index({ userId: 1, 'srs.dueDate': 1 });
cardSchema.index({ userId: 1, word: 1 });
cardSchema.index({ userId: 1, deckId: 1 });

export const Card = mongoose.model('Card', cardSchema);
