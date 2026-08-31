const mongoose = require("mongoose");

const streakEntrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  date: {
    type: String, // "yyyy-MM-dd"
    required: true,
  },
  minutesActive: {
    type: Number,
    default: 0,
  },
  problemsSolved: {
    type: Number,
    default: 0,
  },
  streakFreezeUsed: {
    type: Boolean,
    default: false,
  },
  updatedAt: {
    type: Number,
    required: true,
  },
});

// One streak row per (account, day).
streakEntrySchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("StreakEntry", streakEntrySchema);