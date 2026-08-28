jest.mock("../src/services/groq", () => ({
  getReview: jest.fn(),
  getHint: jest.fn(),
  getClarifyingQuestion: jest.fn(),
  getFollowUpQuestion: jest.fn(),
  getSessionSummary: jest.fn(),
}));

const request = require("supertest");
const app = require("../src/app");
const { getReview, getHint } = require("../src/services/groq");
const { authHeader } = require("./helpers/authToken");

describe("POST /review", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await request(app)
      .post("/review")
      .set("Authorization", authHeader())
      .send({ language: "python" });

    expect(res.status).toBe(400);
  });

  it("returns a full review in review mode", async () => {
    getReview.mockResolvedValue({
      correctness: "Looks correct.",
      timeComplexity: "O(n)",
      spaceComplexity: "O(1)",
      improvement: "Add a docstring.",
      followUpQuestion: "What about duplicates?",
    });

    const res = await request(app)
      .post("/review")
      .set("Authorization", authHeader())
      .send({
        code: "def solve(): pass",
        language: "python",
        problemTitle: "Two Sum",
      });

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe("review");
    expect(res.body.timeComplexity).toBe("O(n)");
  });

  it("returns a hint in hint mode", async () => {
    getHint.mockResolvedValue("Think about a hash map.");

    const res = await request(app)
      .post("/review")
      .set("Authorization", authHeader())
      .send({
        mode: "hint",
        code: "",
        language: "python",
        problemTitle: "Two Sum",
        hintLevel: 2,
      });

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe("hint");
    expect(res.body.hintLevel).toBe(2);
    expect(res.body.hint).toBe("Think about a hash map.");
  });

  it("allows an empty-string code for hint requests (regression: empty string is valid, not missing)", async () => {
    getHint.mockResolvedValue("Start by thinking about the data structure.");

    const res = await request(app)
      .post("/review")
      .set("Authorization", authHeader())
      .send({ mode: "hint", code: "", language: "python", problemTitle: "Two Sum" });

    expect(res.status).toBe(200);
  });
});