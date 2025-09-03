require("dotenv").config();

const express = require("express");
const { connectDB } = require("./config/database");
const cookieParser = require("cookie-parser");

const app = express();
app.use(express.json());
app.use(cookieParser());
const cors = require("cors");
app.use(cors({
  origin:"http://localhost:5173",
   methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials:true,
}))
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