const mockVerifyIdToken = jest.fn();

jest.mock("google-auth-library", () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

jest.mock("../src/models/User", () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

const request = require("supertest");
const app = require("../src/app");
const User = require("../src/models/User");

function mockTicket(overrides = {}) {
  return {
    getPayload: () => ({
      email: "googleuser@example.com",
      sub: "google-sub-123",
      name: "Google User",
      ...overrides,
    }),
  };
}

describe("POST /auth/google", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when idToken is missing", async () => {
    const res = await request(app).post("/auth/google").send({});
    expect(res.status).toBe(400);
  });

  it("returns 401 when the Google token fails verification", async () => {
    mockVerifyIdToken.mockRejectedValue(new Error("invalid token"));

    const res = await request(app).post("/auth/google").send({ idToken: "bad-token" });

    expect(res.status).toBe(401);
  });

  it("creates a new user on first Google sign-in", async () => {
    mockVerifyIdToken.mockResolvedValue(mockTicket());
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({
      _id: "new-google-user-id",
      email: "googleuser@example.com",
      name: "Google User",
    });

    const res = await request(app).post("/auth/google").send({ idToken: "valid-token" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toEqual({
      id: "new-google-user-id",
      email: "googleuser@example.com",
      name: "Google User",
    });
    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "googleuser@example.com",
        googleId: "google-sub-123",
        authProvider: "google",
      })
    );
  });

  it("links googleId onto an existing password account with the same email", async () => {
    mockVerifyIdToken.mockResolvedValue(mockTicket());
    const save = jest.fn().mockResolvedValue();
    User.findOne.mockResolvedValue({
      _id: "existing-id",
      email: "googleuser@example.com",
      name: "Google User",
      googleId: undefined,
      save,
    });

    const res = await request(app).post("/auth/google").send({ idToken: "valid-token" });

    expect(res.status).toBe(200);
    expect(save).toHaveBeenCalled();
  });

  it("logs an existing Google user straight in without re-saving", async () => {
    mockVerifyIdToken.mockResolvedValue(mockTicket());
    const save = jest.fn();
    User.findOne.mockResolvedValue({
      _id: "existing-google-id",
      email: "googleuser@example.com",
      name: "Google User",
      googleId: "google-sub-123",
      save,
    });

    const res = await request(app).post("/auth/google").send({ idToken: "valid-token" });

    expect(res.status).toBe(200);
    expect(save).not.toHaveBeenCalled();
  });
});