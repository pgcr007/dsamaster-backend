const request = require("supertest");
const app = require("../src/app");

// /execute is used as a stand-in protected route here - requireAuth runs
// before the route handler, so an incomplete body is fine for testing auth alone.
describe("requireAuth middleware", () => {
  it("rejects requests with no Authorization header", async () => {
    const res = await request(app).post("/execute").send({});
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Unauthorized" });
  });

  it("rejects requests with the wrong token", async () => {
    const res = await request(app)
      .post("/execute")
      .set("Authorization", "Bearer wrong-token")
      .send({});
    expect(res.status).toBe(401);
  });

  it("rejects requests missing the Bearer prefix", async () => {
    const res = await request(app)
      .post("/execute")
      .set("Authorization", process.env.AUTH_TOKEN)
      .send({});
    expect(res.status).toBe(401);
  });
});