jest.mock("../src/services/groq", () => ({
  getReview: jest.fn(),
  getHint: jest.fn(),
  getClarifyingQuestion: jest.fn(),
  getFollowUpQuestion: jest.fn(),
  getSessionSummary: jest.fn(),
}));

const request = require("supertest");
const app = require("../src/app");
const {
  getClarifyingQuestion,
  getFollowUpQuestion,
  getSessionSummary,
} = require("../src/services/groq");

describe("POST /interview", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 for an unknown mode", async () => {
    const res = await request(app)
      .post("/interview")
      .set("Authorization", `Bearer ${process.env.AUTH_TOKEN}`)
      .send({ mode: "banana" });

    expect(res.status).toBe(400);
  });

  it("clarify mode requires problemTitle and approach", async () => {
    const res = await request(app)
      .post("/interview")
      .set("Authorization", `Bearer ${process.env.AUTH_TOKEN}`)
      .send({ mode: "clarify", problemTitle: "Two Sum" });

    expect(res.status).toBe(400);
    expect(getClarifyingQuestion).not.toHaveBeenCalled();
  });

  it("returns a clarifying question", async () => {
    getClarifyingQuestion.mockResolvedValue({
      question: "What if the array is empty?",
      acknowledgement: "Okay, makes sense.",
    });

    const res = await request(app)
      .post("/interview")
      .set("Authorization", `Bearer ${process.env.AUTH_TOKEN}`)
      .send({ mode: "clarify", problemTitle: "Two Sum", approach: "Use a hash map" });

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe("clarify");
    expect(res.body.question).toContain("empty");
  });

  it("returns a follow-up question", async () => {
    getFollowUpQuestion.mockResolvedValue({ question: "What if the input is 10x larger?" });

    const res = await request(app)
      .post("/interview")
      .set("Authorization", `Bearer ${process.env.AUTH_TOKEN}`)
      .send({
        mode: "followup",
        problemTitle: "Two Sum",
        language: "python",
        code: "def solve(): pass",
      });

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe("followup");
  });

  it("returns a session summary", async () => {
    getSessionSummary.mockResolvedValue({
      wentWell: ["Clear explanation"],
      workOn: ["Discuss edge cases earlier"],
      overallNotes: "Solid attempt overall.",
    });

    const res = await request(app)
      .post("/interview")
      .set("Authorization", `Bearer ${process.env.AUTH_TOKEN}`)
      .send({
        mode: "summary",
        problemTitle: "Two Sum",
        language: "python",
        code: "def solve(): pass",
      });

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe("summary");
    expect(res.body.wentWell).toHaveLength(1);
  });
});