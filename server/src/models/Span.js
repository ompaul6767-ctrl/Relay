import mongoose from 'mongoose';

const spanSchema = new mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      required: true,
      index: true,
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Source',
      required: true,
      index: true,
    },
    sourceName: {
      type: String,
      default: '',
    },
    index: {
      type: Number,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    author: {
      type: String,
      default: 'Unknown',
    },
    timestamp: {
      type: Date,
    },
    acl: {
      type: String,
      required: true,
      enum: ['team', 'leads_only', 'owner_only'],
      default: 'team',
    },
    stableId: {
      type: String,
      required: true,
      index: true, // e.g. S1.L3
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Compound index for unique span retrieval within case
spanSchema.index({ caseId: 1, stableId: 1 });

export const Span = mongoose.model('Span', spanSchema);
