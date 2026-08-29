const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    // Only required for accounts created with email + password.
    // Social-only accounts (Google/Facebook/LinkedIn) skip this.
    required: function () {
      return !this.googleId && !this.facebookId && !this.linkedinId;
    },
  },
  name: {
    type: String,
    trim: true,
    default: "",
  },
  authProvider: {
    type: String,
    enum: ["local", "google", "facebook", "linkedin"],
    default: "local",
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  facebookId: {
    type: String,
    unique: true,
    sparse: true,
  },
  linkedinId: {
    type: String,
    unique: true,
    sparse: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", userSchema);