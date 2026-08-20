const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Groq's free tier hosts open-weight models on very fast LPU hardware.
// llama-3.3-70b-versatile is the best quality/free-limit tradeoff for review text.
const MODEL = "openai/gpt-oss-120b";

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

// ---- Mock Interview prompts ----
// These three power Phase 9: an interviewer persona that reacts to the
// candidate's stated approach, then their code, then wraps with a summary.

function buildClarifyingQuestionPrompt({ problemTitle, problemDescription, difficulty, approach }) {
  return `You are a senior engineer conducting a live coding interview at a major tech company (MNC-level bar). The candidate has just explained their planned approach in plain English, before writing any code. Respond with ONLY a JSON object, no markdown fences, no preamble, matching exactly this shape:

{
  "question": "string - ONE realistic clarifying question a real interviewer would ask right now about this approach (e.g. about an edge case, an assumption, input constraints, or a gap in the explanation). Keep it natural and conversational, 1-2 sentences.",
  "acknowledgement": "string - a brief one-sentence in-character reaction to their approach before the question (e.g. 'Okay, that sounds reasonable.' or 'Interesting, let's dig into that.'). Stay neutral - don't reveal whether the approach is correct."
}

Problem: ${problemTitle} (${difficulty})
Description: ${problemDescription}

Candidate's stated approach:
"${approach}"

Respond with ONLY the JSON object.`;
}

function buildFollowUpPrompt({ problemTitle, problemDescription, difficulty, approach, language, code }) {
  return `You are a senior engineer conducting a live coding interview at a major tech company (MNC-level bar). The candidate has finished writing code for the problem below. Respond with ONLY a JSON object, no markdown fences, no preamble, matching exactly this shape:

{
  "question": "string - ONE realistic scaling or extension follow-up question, in the classic interviewer style (e.g. 'What if the input were 10x larger?', 'How would this change if the array were sorted?', 'What if we couldn't hold everything in memory?', 'How would you handle duplicates/negative numbers/concurrent updates?'). Pick whichever angle is most relevant to THIS specific solution. 1-2 sentences."
}

Problem: ${problemTitle} (${difficulty})
Description: ${problemDescription}

Candidate's stated approach: "${approach}"

Candidate's ${language} code:
\`\`\`${language}
${code}
\`\`\`

Respond with ONLY the JSON object.`;
}

function buildSummaryPrompt({
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
}) {
  const minutes = Math.max(1, Math.round((durationSeconds || 0) / 60));

  return `You are a senior engineer who just finished conducting a live coding interview (MNC-level bar) and now need to write private feedback notes on the candidate's performance. Respond with ONLY a JSON object, no markdown fences, no preamble, matching exactly this shape:

{
  "wentWell": ["string", "string"] - 2-4 short, specific bullet points on what the candidate did well across the whole session (communication, approach, code, handling follow-ups). Each bullet under 20 words.,
  "workOn": ["string", "string"] - 2-4 short, specific, constructive bullet points on what to improve. Each bullet under 20 words.,
  "overallNotes": "string - 2-3 sentence overall summary, honest but encouraging, as if writing feedback for the candidate to read afterward."
}

Problem: ${problemTitle} (${difficulty})
Time spent: about ${minutes} minute(s)

Stated approach: "${approach}"

Interviewer's clarifying question: "${clarifyingQuestion}"
Candidate's answer: "${clarifyingAnswer}"

Candidate's ${language} code:
\`\`\`${language}
${code}
\`\`\`

Interviewer's follow-up question: "${followUpQuestion}"
Candidate's answer: "${followUpAnswer}"

Respond with ONLY the JSON object.`;
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

async function getClarifyingQuestion({ problemTitle, problemDescription, difficulty, approach }) {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: buildClarifyingQuestionPrompt({ problemTitle, problemDescription, difficulty, approach }),
      },
    ],
  });

  const text = completion.choices[0].message.content;
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

async function getFollowUpQuestion({ problemTitle, problemDescription, difficulty, approach, language, code }) {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: buildFollowUpPrompt({ problemTitle, problemDescription, difficulty, approach, language, code }),
      },
    ],
  });

  const text = completion.choices[0].message.content;
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

async function getSessionSummary(params) {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: 700,
    messages: [
      {
        role: "user",
        content: buildSummaryPrompt(params),
      },
    ],
  });

  const text = completion.choices[0].message.content;
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

module.exports = {
  getReview,
  getHint,
  getClarifyingQuestion,
  getFollowUpQuestion,
  getSessionSummary,
};