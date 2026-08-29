const express = require("express");
const User = require("../models/User");

const router = express.Router();

const TARGET_ROLES = ["", "SDE-1", "SDE-2", "SDE-3", "Senior SDE", "ML Engineer", "Other"];
const EXPERIENCE_LEVELS = ["", "Student", "0-1 years", "1-3 years", "3-5 years", "5+ years"];
const LANGUAGES = ["python", "java", "cpp"];

function toProfileDto(user) {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name || "",
    bio: user.bio || "",
    targetRole: user.targetRole || "",
    targetCompanies: user.targetCompanies || [],
    experienceLevel: user.experienceLevel || "",
    preferredLanguage: user.preferredLanguage || "python",
    githubHandle: user.githubHandle || "",
    linkedinUrl: user.linkedinUrl || "",
    interviewTargetDate: user.interviewTargetDate
      ? user.interviewTargetDate.toISOString().slice(0, 10)
      : null,
    authProvider: user.authProvider || "local",
    createdAt: user.createdAt ? user.createdAt.toISOString() : null,
  };
}

router.get("/me", async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(toProfileDto(user));
  } catch (err) {
    console.error("Get profile error:", err.message);
    res.status(500).json({ error: "Failed to load profile" });
  }
});

router.put("/me", async (req, res) => {
  const {
    name,
    bio,
    targetRole,
    targetCompanies,
    experienceLevel,
    preferredLanguage,
    githubHandle,
    linkedinUrl,
    interviewTargetDate,
  } = req.body;

  const update = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0 || name.trim().length > 60) {
      return res.status(400).json({ error: "Name must be 1-60 characters" });
    }
    update.name = name.trim();
  }

  if (bio !== undefined) {
    if (typeof bio !== "string" || bio.length > 200) {
      return res.status(400).json({ error: "Bio must be 200 characters or fewer" });
    }
    update.bio = bio.trim();
  }

  if (targetRole !== undefined) {
    if (!TARGET_ROLES.includes(targetRole)) {
      return res.status(400).json({ error: "Invalid target role" });
    }
    update.targetRole = targetRole;
  }

  if (targetCompanies !== undefined) {
    if (!Array.isArray(targetCompanies) || targetCompanies.some((c) => typeof c !== "string")) {
      return res.status(400).json({ error: "targetCompanies must be an array of strings" });
    }
    update.targetCompanies = targetCompanies
      .map((c) => c.trim())
      .filter((c) => c.length > 0)
      .slice(0, 10);
  }

  if (experienceLevel !== undefined) {
    if (!EXPERIENCE_LEVELS.includes(experienceLevel)) {
      return res.status(400).json({ error: "Invalid experience level" });
    }
    update.experienceLevel = experienceLevel;
  }

  if (preferredLanguage !== undefined) {
    if (!LANGUAGES.includes(preferredLanguage)) {
      return res.status(400).json({ error: "Invalid preferred language" });
    }
    update.preferredLanguage = preferredLanguage;
  }

  if (githubHandle !== undefined) {
    if (typeof githubHandle !== "string" || githubHandle.length > 40) {
      return res.status(400).json({ error: "GitHub handle must be 40 characters or fewer" });
    }
    update.githubHandle = githubHandle.trim().replace(/^@/, "");
  }

  if (linkedinUrl !== undefined) {
    if (typeof linkedinUrl !== "string" || linkedinUrl.length > 200) {
      return res.status(400).json({ error: "LinkedIn URL must be 200 characters or fewer" });
    }
    update.linkedinUrl = linkedinUrl.trim();
  }

  if (interviewTargetDate !== undefined) {
    if (interviewTargetDate === "" || interviewTargetDate === null) {
      update.interviewTargetDate = null;
    } else {
      const parsed = new Date(interviewTargetDate);
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ error: "Invalid interviewTargetDate" });
      }
      update.interviewTargetDate = parsed;
    }
  }

  try {
    const user = await User.findByIdAndUpdate(req.userId, update, { new: true });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(toProfileDto(user));
  } catch (err) {
    console.error("Update profile error:", err.message);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

module.exports = router;