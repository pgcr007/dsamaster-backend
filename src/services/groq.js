const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Groq's free tier hosts open-weight models on very fast LPU hardware.
// llama-3.3-70b-versatile is the best quality/free-limit tradeoff for review text.
const MODEL = "llama-3.3-70b-versatile";

function buildReviewPrompt({ problemTitle, problemDescription, difficulty, language, code }) {
  return `You are reviewing a candidate's solution to a coding interview problem. Respond with ONLY a JSON object, no markdown fences, no preamble, matching exactly this shape:

{
  "correctness": "string - is the solution correct? mention any bugs or edge cases it misses",
  "timeComplexity": "string - Big-O time complexity with a one-line justification",
  "spaceComplexity": "string - Big-O space complexity with a one-line justification",
  "improvement": "string - one concrete, specific improvement (naming, structure, edge case, efficiency, or style)",
  "followUpQuestion": "string - one realistic interview-style follow-up question an interviewer might ask next"
}

Problem: ${problemTitle} (${difficulty})
Description: ${problemDescription}

Candidate's ${language} solution:
\`\`\`${language}
${code}
\`\`\`

Respond with ONLY the JSON object.`;
}

function buildHintPrompt({ problemTitle, problemDescription, difficulty, language, code, hintLevel }) {
  const levelInstructions = {
    1: "Give a small NUDGE only - point at what to think about (e.g. a pattern, data structure, or edge case) without naming the approach outright. 1-2 sentences.",
    2: "Give a BIGGER HINT - name the general technique or pattern to use (e.g. 'two pointers', 'dynamic programming with a 2D table'), but do not describe the exact steps. 2-3 sentences.",
    3: "Give an APPROACH OUTLINE - describe the high-level steps of the algorithm in plain English, but do NOT write any code and do NOT give the full solution. 3-5 sentences.",
  };
  const instruction = levelInstructions[hintLevel] || levelInstructions[1];

  return `You are helping a candidate who is stuck on a coding interview problem. ${instruction}

Never write actual code. Never give away the complete solution. Stay strictly within the hint level requested.

Problem: ${problemTitle} (${difficulty})
Description: ${problemDescription}

Candidate's current ${language} attempt (may be incomplete or empty):
\`\`\`${language}
${code}
\`\`\`

Respond with ONLY the hint text - no preamble like "Here's a hint", no markdown headers.`;
}

async function getReview({ problemTitle, problemDescription, difficulty, language, code }) {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: buildReviewPrompt({ problemTitle, problemDescription, difficulty, language, code }),
      },
    ],
  });

  const text = completion.choices[0].message.content;
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

async function getHint({ problemTitle, problemDescription, difficulty, language, code, hintLevel }) {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: 400,
    messages: [
      {
        role: "user",
        content: buildHintPrompt({ problemTitle, problemDescription, difficulty, language, code, hintLevel }),
      },
    ],
  });

  return completion.choices[0].message.content.trim();
}

module.exports = { getReview, getHint };