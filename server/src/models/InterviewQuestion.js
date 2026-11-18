import mongoose from 'mongoose';

const interviewQuestionSchema = new mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      required: true,
      index: true,
    },
    targetClaimId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Claim',
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['missing_owner', 'decision_reason', 'open_question', 'conflict', 'custom'],
    },
    entityKey: {
      type: String,
      default: '',
    },
    attribute: {
      type: String,
      default: '',
    },
    question: {
      type: String,
      required: true,
    },
    conflictingValues: [
      {
        type: mongoose.Schema.Types.Mixed,
      },
    ],
    suggestedContact: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      required: true,
      enum: ['open', 'answered', 'skipped', 'reassigned'],
      default: 'open',
    },
    acl: {
      type: String,
      enum: ['team', 'leads_only', 'owner_only'],
      default: 'team',
    },
    reassignedTo: {
      type: String,
      default: '',
    },
    answer: {
      text: { type: String, default: '' },
      chosenValue: { type: String, default: '' },
      answeredBy: { type: String, default: '' },
      answeredAt: { type: Date },
      spanId: { type: String, default: '' },
      claimId: { type: mongoose.Schema.Types.ObjectId, ref: 'Claim' },
      acl: { type: String, default: 'team' },
    },
  },
  { timestamps: true }
);

export const InterviewQuestion = mongoose.model('InterviewQuestion', interviewQuestionSchema);
