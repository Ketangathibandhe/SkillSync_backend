require("dotenv").config();

const express = require("express");
const { connectDB } = require("./config/database");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cookieParser());

//  CORS setup
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      "https://skill-sync-frontend-lyart.vercel.app",  // Vercel FE
      "http://localhost:5173",                         // Local dev
      "https://skillsync-frontend-uhkz.onrender.com" ,  // Render FE
      "https://skillsync-6v8s.onrender.com"
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

//  Allow credentials header
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

//  Required for secure cookies on Render
app.set("trust proxy", 1);

//  Routes import
const authRouter = require("./routes/auth");
const profileRouter = require("./routes/profile");
const aiRoutes = require("./routes/ai.routes");

//  Routes use
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
