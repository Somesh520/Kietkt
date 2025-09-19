import express from "express";
import  attendence from "./src/Routes/attendence.js";
import details from "./src/Routes/details.js";
import cors from "cors";
const app = express();
const PORT = 3000;
// 👇 Ye do line sabse important hai
app.use(express.json());
app.use(cors()); 
app.use(express.urlencoded({ extended: true }));

// Route mount
app.use("/api", attendence);
app.use("/api", details);

app.get("/", (req, res) => {
  res.send("Server chal raha hai. API endpoints ke liye /api par jayein.");
});
app.listen(3000, () => {
  console.log(" Server running at http://localhost:3000");
});
