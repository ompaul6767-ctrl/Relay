import mongoose from 'mongoose';

const versionSchema = new mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      required: true,
      index: true,
    },
    number: {
      type: Number,
      required: true,
    },
    approvedClaimSnapshot: [
      {
        type: mongoose.Schema.Types.Mixed,
      },
    ],
    publishedBy: {
      type: String,
      required: true,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    diffFromPrevious: {
      type: mongoose.Schema.Types.Mixed,
      default: { added: 0, modified: 0, removed: 0, details: [] },
    },
  },
  { timestamps: true }
);

versionSchema.index({ caseId: 1, number: 1 }, { unique: true });

export const Version = mongoose.model('Version', versionSchema);
