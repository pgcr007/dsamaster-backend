const express = require("express");
const cors = require("cors");
const { requireAuth } = require("./middleware/auth");
const authRouter = require("./routes/auth");
const executeRouter = require("./routes/execute");
const reviewRouter = require("./routes/review");
const interviewRouter = require("./routes/interview");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/execute", requireAuth, executeRouter);
app.use("/review", requireAuth, reviewRouter);
app.use("/interview", requireAuth, interviewRouter);

module.exports = app;