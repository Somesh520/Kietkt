import express from "express";
import { gotScraping } from "got-scraping";

const router = express.Router();

// Route: '/get-session' - Login karke Authorization Token haasil karne ke liye
router.post("/get-session", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: "Username aur password zaroori hai",
      });
    }

    console.log(`[INFO] '${username}' ke liye login request kiya ja raha hai...`);

    const loginUrl = "https://kiet.cybervidya.net/api/auth/login";

    const loginResponse = await gotScraping({
      url: loginUrl,
      method: "POST",
      // ✅ FIX: Data ko dobara 'json' format mein bhej rahe hain, jaisa Postman mein hai
      json: {
        userName: username,
        password: password,
      },
      responseType: "json",
      throwHttpErrors: false,
    });
    
    const responseBody = loginResponse.body;

    const token = responseBody?.data?.token;

    if (loginResponse.statusCode !== 200 || !token) {
        const errorMessage = responseBody?.message || "Login fail hua. Credentials galat ho sakte hain.";
        console.error(`[ERROR] '${username}' ke liye login fail hua: ${errorMessage}`);
        return res.status(loginResponse.statusCode || 401).json({ success: false, error: errorMessage });
    }

    const authorizationHeader = `GlobalEducation ${token}`;
    console.log(`[SUCCESS] '${username}' ke liye Auth token safaltapoorvak mil gaya.`);

    res.json({
      success: true,
      authorization: authorizationHeader, 
    });

  } catch (error) {
    const errorMessage = error.message || "Login ke dauraan ek anjaan error aayi.";
    console.error("❌ ERROR /get-session mein:", errorMessage);
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// NAYA Route: '/get-attendance' - Token ka istemal karke attendance data fetch karne ke liye



// Default route
router.get("/", (req, res) => {
  res.send("Hello from Attendance API 🚀");
});

export default router;

