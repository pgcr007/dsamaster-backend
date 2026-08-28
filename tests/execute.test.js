jest.mock("../src/services/judge0", () => ({
  runBatch: jest.fn(),
}));

const request = require("supertest");
const app = require("../src/app");
const { runBatch } = require("../src/services/judge0");
const { authHeader } = require("./helpers/authToken");

describe("POST /execute", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await request(app)
      .post("/execute")
      .set("Authorization", authHeader())
      .send({ sourceCode: "print(1)" });

    expect(res.status).toBe(400);
    expect(runBatch).not.toHaveBeenCalled();
  });

  it("returns allPassed and results when Judge0 reports success", async () => {
    runBatch.mockResolvedValue([
      { input: "1 2", expectedOutput: "3", actualOutput: "3", passed: true, status: "Accepted" },
    ]);

    const res = await request(app)
      .post("/execute")
      .set("Authorization", authHeader())
      .send({
        sourceCode: "print(1+2)",
        language: "python",
        testCases: [{ input: "1 2", expectedOutput: "3" }],
      });

    expect(res.status).toBe(200);
    expect(res.body.allPassed).toBe(true);
    expect(res.body.results).toHaveLength(1);
  });

  it("returns 500 when Judge0 throws", async () => {
    runBatch.mockRejectedValue(new Error("Judge0 unreachable"));

    const res = await request(app)
      .post("/execute")
      .set("Authorization", authHeader())
      .send({
        sourceCode: "print(1)",
        language: "python",
        testCases: [{ input: "", expectedOutput: "" }],
      });

    expect(res.status).toBe(500);
  });
});