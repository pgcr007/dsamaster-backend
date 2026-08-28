const request = require("supertest");
const app = require("../src/app");
const { authHeader } = require("./helpers/authToken");

describe("requireAuth middleware", () => {
  it("rejects requests with no Authorization header", async () => {
    const res = await request(app).post("/execute").send({});
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Unauthorized" });
  });

  it("rejects requests with a garbage token", async () => {
    const res = await request(app)
      .post("/execute")
      .set("Authorization", "Bearer garbage-token")
      .send({});
    expect(res.status).toBe(401);
  });

  it("rejects requests missing the Bearer prefix", async () => {
    const res = await request(app)
      .post("/execute")
      .set("Authorization", "not-a-bearer-token")
      .send({});
    expect(res.status).toBe(401);
  });

  it("accepts requests with a valid JWT and lets them reach the route", async () => {
    // An empty body still triggers the route's own 400 validation - what matters
    // here is that we did NOT get a 401, meaning auth itself passed.
    const res = await request(app)
      .post("/execute")
      .set("Authorization", authHeader())
      .send({});
    expect(res.status).not.toBe(401);
  });
});