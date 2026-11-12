import mongoose from 'mongoose';

const acknowledgementSchema = new mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      required: true,
      index: true,
    },
    versionNumber: {
      type: Number,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userRole: {
      type: String,
      required: true,
    },
    acknowledgedAt: {
      type: Date,
      default: Date.now,
    },
    questionsRaised: [
      {
        text: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

acknowledgementSchema.index({ caseId: 1, versionNumber: 1, userId: 1 });

export const Acknowledgement = mongoose.model('Acknowledgement', acknowledgementSchema);
