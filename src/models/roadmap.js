const mongoose = require("mongoose");

const roadmapSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetRole: {
      type: String,
      required: true,
    },
    currentSkills: {
      type: [String],
      default: [],
    },
    skillGap: {
      type: String,
      default: "",
    },
    progress: {
      type: Number,
      default: 0, // % completed
    },
    steps: [
      {
        title: { type: String, required: true }, // e.g. "Master JavaScript Fundamentals"
        duration: { type: String }, // e.g. "4-6 weeks"
        topics: { type: [String], default: [] },
        resources: { type: [String], default: [] },
        projects: { type: [String], default: [] },
        status: {
          type: String,
          enum: ["pending", "in-progress", "completed"],
          default: "pending",
        },
      },
    ],
    rawText: {
      type: String, // full markdown string from Gemini
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Roadmap", roadmapSchema);
