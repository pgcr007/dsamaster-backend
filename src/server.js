require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { requireAuth } = require("./middleware/auth");
const executeRouter = require("./routes/execute");
const reviewRouter = require("./routes/review");
const interviewRouter = require("./routes/interview");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/execute", requireAuth, executeRouter);
app.use("/review", requireAuth, reviewRouter);
app.use("/interview", requireAuth, interviewRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`dsamaster-backend listening on port ${PORT}`);
});