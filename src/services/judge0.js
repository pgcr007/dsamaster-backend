const axios = require("axios");

const client = axios.create({
  baseURL: process.env.JUDGE0_BASE_URL,
  headers: {
    "content-type": "application/json",
    "X-RapidAPI-Key": process.env.JUDGE0_API_KEY,
    "X-RapidAPI-Host": process.env.JUDGE0_HOST,
  },
});

function toBase64(str) {
  return Buffer.from(str ?? "", "utf-8").toString("base64");
}

function fromBase64(str) {
  if (!str) return "";
  return Buffer.from(str, "base64").toString("utf-8");
}

// Ignores incidental whitespace differences (e.g. "[0, 1]" vs "[0,1]")
// so seed answers don't have to match a solution's exact print formatting.
function normalizeForComparison(str) {
  return str.replace(/\s+/g, "");
}

// Submits one source file against N test cases as a single batch request,
// then polls until every submission has finished judging.
async function runBatch({ sourceCode, languageId, testCases }) {
  const submissions = testCases.map((tc) => ({
    source_code: toBase64(sourceCode),
    language_id: languageId,
    stdin: toBase64(tc.input),
    expected_output: toBase64(tc.expectedOutput),
  }));

  const submitRes = await client.post(
    "/submissions/batch?base64_encoded=true",
    { submissions }
  );

  const tokens = submitRes.data.map((s) => s.token).join(",");

  const IN_QUEUE = 1;
  const PROCESSING = 2;
  const MAX_ATTEMPTS = 15;
  const DELAY_MS = 1000;

  let results;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const pollRes = await client.get("/submissions/batch", {
      params: {
        tokens,
        base64_encoded: true,
        fields: "stdout,stderr,status_id,status,compile_output,time,memory,expected_output",
      },
    });

    results = pollRes.data.submissions;
    const stillRunning = results.some(
      (r) => r.status_id === IN_QUEUE || r.status_id === PROCESSING
    );
    if (!stillRunning) break;

    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
  }

  return results.map((r, i) => {
    const actualOutput = fromBase64(r.stdout).trim();
    const expectedOutput = testCases[i].expectedOutput.trim();
    const statusDescription = r.status?.description ?? "Unknown";
    const passed =
      r.status_id === 3 && // 3 = Accepted
      normalizeForComparison(actualOutput) === normalizeForComparison(expectedOutput);

    return {
      input: testCases[i].input,
      expectedOutput,
      actualOutput,
      passed,
      status: statusDescription,
      stderr: fromBase64(r.stderr) || null,
      compileOutput: fromBase64(r.compile_output) || null,
      timeSeconds: r.time,
      memoryKb: r.memory,
    };
  });
}

module.exports = { runBatch };