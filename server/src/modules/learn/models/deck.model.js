import mongoose from 'mongoose';

const deckSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Deck name is required'],
      trim: true,
      maxlength: [100, 'Deck name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    color: {
      type: String,
      default: '#6366f1',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

deckSchema.index({ userId: 1, name: 1 });

export const Deck = mongoose.model('Deck', deckSchema);
