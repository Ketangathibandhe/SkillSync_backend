require("dotenv").config();

const express = require("express");
const { connectDB } = require("./config/database");
const cookieParser = require("cookie-parser");
const cors = require("cors");
app.get("/", (req, res) => {
  res.send("SkillSync Backend Running 🚀");
});
const app = express();
app.use(express.json());
app.use(cookieParser());

//  Log incoming origin for debugging
app.use((req, res, next) => {
  console.log("Incoming Origin:", req.headers.origin);
  next();
});

// Allowed origins list — must match frontend exactly
const allowedOrigins = [
  "https://skillsync-6v8s.onrender.com", // your deployed frontend
  "http://localhost:5173"                // local dev (optional)
];

//  CORS options with dynamic origin check
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log("Blocked Origin:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept"],
};

// Apply CORS middleware globally
app.use(cors(corsOptions));

//  Required for secure cookies on Render
app.set("trust proxy", 1);

// Routes import
const authRouter = require("./routes/auth");
const profileRouter = require("./routes/profile");
const aiRoutes = require("./routes/ai.routes");

// Routes use
app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/ai", aiRoutes);

//  DB connect + Server run
connectDB()
  .then(() => {
    console.log("Database connection established...");
    app.listen(3000, () => {
      console.log("Server running on port 3000...");
    });
  })
  .catch((err) => {
    console.error("Database connection failed!", err);
  });