const express = require("express");
const { getReview, getHint } = require("../services/groq");

const router = express.Router();

router.post("/", async (req, res) => {
  const { mode, code, language, problemTitle, problemDescription, difficulty, hintLevel } = req.body;

  if (code === undefined || code === null || !language || !problemTitle) {
    return res.status(400).json({
      error: "Request must include code, language, and problemTitle",
    });
  }

  try {
    if (mode === "hint") {
      const level = [1, 2, 3].includes(hintLevel) ? hintLevel : 1;
      const hint = await getHint({
        problemTitle,
        problemDescription: problemDescription || "",
        difficulty: difficulty || "Medium",
        language,
        code,
        hintLevel: level,
      });
      return res.json({ mode: "hint", hintLevel: level, hint });
    }

    const review = await getReview({
      problemTitle,
      problemDescription: problemDescription || "",
      difficulty: difficulty || "Medium",
      language,
      code,
    });
    res.json({ mode: "review", ...review });
  } catch (err) {
    console.error("Review error:", err.response?.data || err.message);
    res.status(500).json({ error: "Review failed", detail: err.message });
  }
});

module.exports = router;