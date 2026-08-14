const express = require("express");
const { resolveLanguageId } = require("../config/languages");
const { runBatch } = require("../services/judge0");

const router = express.Router();

router.post("/", async (req, res) => {
  const { sourceCode, language, testCases } = req.body;

  if (!sourceCode || !language || !Array.isArray(testCases) || testCases.length === 0) {
    return res.status(400).json({
      error: "Request must include sourceCode, language, and a non-empty testCases array",
    });
  }

  try {
    const languageId = resolveLanguageId(language);
    const results = await runBatch({ sourceCode, languageId, testCases });
    const allPassed = results.every((r) => r.passed);

    res.json({ allPassed, results });
  } catch (err) {
    console.error("Execute error:", err.response?.data || err.message);
    res.status(500).json({ error: "Execution failed", detail: err.message });
  }
});

module.exports = router;