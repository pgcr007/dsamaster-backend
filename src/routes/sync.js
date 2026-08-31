const express = require("express");
const UserProgress = require("../models/UserProgress");
const StreakEntry = require("../models/StreakEntry");

const router = express.Router();

function toProgressDto(doc) {
  return {
    problemId: doc.problemId,
    status: doc.status,
    lastAttemptDate: doc.lastAttemptDate,
    timesReviewed: doc.timesReviewed,
    nextReviewDate: doc.nextReviewDate,
    updatedAt: doc.updatedAt,
  };
}

function toStreakDto(doc) {
  return {
    date: doc.date,
    minutesActive: doc.minutesActive,
    problemsSolved: doc.problemsSolved,
    streakFreezeUsed: doc.streakFreezeUsed,
    updatedAt: doc.updatedAt,
  };
}

/**
 * GET /sync — pull everything the signed-in account has stored in the cloud.
 * Used right after login to restore progress/streaks onto a device.
 */
router.get("/", async (req, res) => {
  try {
    const [progress, streaks] = await Promise.all([
      UserProgress.find({ userId: req.userId }),
      StreakEntry.find({ userId: req.userId }),
    ]);

    res.json({
      progress: progress.map(toProgressDto),
      streaks: streaks.map(toStreakDto),
    });
  } catch (err) {
    console.error("Sync pull error:", err.message);
    res.status(500).json({ error: "Failed to load synced data" });
  }
});

/**
 * POST /sync — push local changes for the signed-in account.
 * Body: { progress: [...], streaks: [...] } (either array may be omitted/empty).
 * Each incoming record only overwrites the stored one if its updatedAt is
 * newer or equal (last-write-wins), so this is safe to call from multiple
 * devices without clobbering more recent data.
 * Responds with the full, reconciled dataset for the account.
 */
router.post("/", async (req, res) => {
  const { progress, streaks } = req.body || {};
  const progressList = Array.isArray(progress) ? progress : [];
  const streakList = Array.isArray(streaks) ? streaks : [];

  try {
    for (const item of progressList) {
      if (
        !item ||
        typeof item.problemId !== "number" ||
        typeof item.status !== "string" ||
        typeof item.updatedAt !== "number"
      ) {
        continue;
      }

      const existing = await UserProgress.findOne({
        userId: req.userId,
        problemId: item.problemId,
      });

      if (!existing || item.updatedAt >= existing.updatedAt) {
        await UserProgress.findOneAndUpdate(
          { userId: req.userId, problemId: item.problemId },
          {
            userId: req.userId,
            problemId: item.problemId,
            status: item.status,
            lastAttemptDate: item.lastAttemptDate ?? null,
            timesReviewed: item.timesReviewed ?? 0,
            nextReviewDate: item.nextReviewDate ?? null,
            updatedAt: item.updatedAt,
          },
          { upsert: true }
        );
      }
    }

    for (const item of streakList) {
      if (
        !item ||
        typeof item.date !== "string" ||
        typeof item.updatedAt !== "number"
      ) {
        continue;
      }

      const existing = await StreakEntry.findOne({
        userId: req.userId,
        date: item.date,
      });

      if (!existing || item.updatedAt >= existing.updatedAt) {
        await StreakEntry.findOneAndUpdate(
          { userId: req.userId, date: item.date },
          {
            userId: req.userId,
            date: item.date,
            minutesActive: item.minutesActive ?? 0,
            problemsSolved: item.problemsSolved ?? 0,
            streakFreezeUsed: !!item.streakFreezeUsed,
            updatedAt: item.updatedAt,
          },
          { upsert: true }
        );
      }
    }

    const [allProgress, allStreaks] = await Promise.all([
      UserProgress.find({ userId: req.userId }),
      StreakEntry.find({ userId: req.userId }),
    ]);

    res.json({
      progress: allProgress.map(toProgressDto),
      streaks: allStreaks.map(toStreakDto),
    });
  } catch (err) {
    console.error("Sync push error:", err.message);
    res.status(500).json({ error: "Failed to sync data" });
  }
});

module.exports = router;