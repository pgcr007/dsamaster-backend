const mongoose = require("mongoose");

const userProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  problemId: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    required: true, // "not_started" | "attempted" | "solved"
  },
  lastAttemptDate: {
    type: Number, // epoch millis
    default: null,
  },
  timesReviewed: {
    type: Number,
    default: 0,
  },
  nextReviewDate: {
    type: Number, // epoch millis
    default: null,
  },
  // Last-write-wins clock used to reconcile this record across devices.
  updatedAt: {
    type: Number,
    required: true,
  },
});

// One progress row per (account, problem).
userProgressSchema.index({ userId: 1, problemId: 1 }, { unique: true });

module.exports = mongoose.model("UserProgress", userProgressSchema);