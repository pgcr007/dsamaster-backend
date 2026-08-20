const express = require("express");
const {
  getClarifyingQuestion,
  getFollowUpQuestion,
  getSessionSummary,
} = require("../services/groq");

const router = express.Router();

router.post("/", async (req, res) => {
  const { mode } = req.body;

  try {
    if (mode === "clarify") {
      const { problemTitle, problemDescription, difficulty, approach } = req.body;
      if (!problemTitle || !approach) {
        return res.status(400).json({
          error: "mode=clarify requires problemTitle and approach",
        });
      }
      const result = await getClarifyingQuestion({
        problemTitle,
        problemDescription: problemDescription || "",
        difficulty: difficulty || "Medium",
        approach,
      });
      return res.json({ mode: "clarify", ...result });
    }

    if (mode === "followup") {
      const { problemTitle, problemDescription, difficulty, approach, language, code } = req.body;
      if (!problemTitle || code === undefined || code === null || !language) {
        return res.status(400).json({
          error: "mode=followup requires problemTitle, language, and code",
        });
      }
      const result = await getFollowUpQuestion({
        problemTitle,
        problemDescription: problemDescription || "",
        difficulty: difficulty || "Medium",
        approach: approach || "",
        language,
        code,
      });
      return res.json({ mode: "followup", ...result });
    }

    if (mode === "summary") {
      const {
        problemTitle,
        difficulty,
        approach,
        clarifyingQuestion,
        clarifyingAnswer,
        language,
        code,
        followUpQuestion,
        followUpAnswer,
        durationSeconds,
      } = req.body;
      if (!problemTitle || code === undefined || code === null || !language) {
        return res.status(400).json({
          error: "mode=summary requires problemTitle, language, and code",
        });
      }
      const result = await getSessionSummary({
        problemTitle,
        difficulty: difficulty || "Medium",
        approach: approach || "",
        clarifyingQuestion: clarifyingQuestion || "",
        clarifyingAnswer: clarifyingAnswer || "",
        language,
        code,
        followUpQuestion: followUpQuestion || "",
        followUpAnswer: followUpAnswer || "",
        durationSeconds: durationSeconds || 0,
      });
      return res.json({ mode: "summary", ...result });
    }

    return res.status(400).json({ error: "mode must be one of: clarify, followup, summary" });
  } catch (err) {
    console.error("Interview error:", err.response?.data || err.message);
    res.status(500).json({ error: "Interview request failed", detail: err.message });
  }
});

module.exports = router;