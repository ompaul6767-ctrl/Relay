import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    role: {
      type: String,
      required: true,
      enum: ['lead', 'departing', 'incoming_dev', 'incoming_designer'],
    },
    caseIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
      },
    ],
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
