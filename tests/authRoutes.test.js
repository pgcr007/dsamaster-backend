jest.mock("../src/models/User", () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock("../src/utils/password", () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
}));

const request = require("supertest");
const app = require("../src/app");
const User = require("../src/models/User");
const { hashPassword, comparePassword } = require("../src/utils/password");

describe("POST /auth/register", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when email or password is missing", async () => {
    const res = await request(app).post("/auth/register").send({ email: "a@b.com" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid email format", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "not-an-email", password: "password123" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for a password under 6 characters", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "a@b.com", password: "123" });
    expect(res.status).toBe(400);
  });

  it("returns 409 when the email is already registered", async () => {
    User.findOne.mockResolvedValue({ _id: "existing-id", email: "a@b.com" });

    const res = await request(app)
      .post("/auth/register")
      .send({ email: "a@b.com", password: "password123" });

    expect(res.status).toBe(409);
    expect(User.create).not.toHaveBeenCalled();
  });

  it("creates a user and returns a token on success", async () => {
    User.findOne.mockResolvedValue(null);
    hashPassword.mockResolvedValue("hashed-password");
    User.create.mockResolvedValue({
      _id: "new-user-id",
      email: "a@b.com",
      name: "Prathamesh",
    });

    const res = await request(app)
      .post("/auth/register")
      .send({ email: "a@b.com", password: "password123", name: "Prathamesh" });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toEqual({ id: "new-user-id", email: "a@b.com", name: "Prathamesh" });
  });
});

describe("POST /auth/login", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when email or password is missing", async () => {
    const res = await request(app).post("/auth/login").send({ email: "a@b.com" });
    expect(res.status).toBe(400);
  });

  it("returns 401 with a generic message when the email doesn't exist", async () => {
    User.findOne.mockResolvedValue(null);

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "nobody@example.com", password: "password123" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password");
  });

  it("returns the same generic message when the password is wrong", async () => {
    User.findOne.mockResolvedValue({ _id: "u1", email: "a@b.com", passwordHash: "hashed" });
    comparePassword.mockResolvedValue(false);

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "a@b.com", password: "wrongpass" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password");
  });

  it("returns a token on successful login", async () => {
    User.findOne.mockResolvedValue({
      _id: "u1",
      email: "a@b.com",
      name: "Prathamesh",
      passwordHash: "hashed",
    });
    comparePassword.mockResolvedValue(true);

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "a@b.com", password: "correctpass" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe("a@b.com");
  });
});