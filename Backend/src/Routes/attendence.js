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
        error: "Username and password are required",
      });
    }

    console.log(`[INFO] Login request for '${username}'...`);

    const loginUrl = "https://kiet.cybervidya.net/api/auth/login";

    const loginResponse = await gotScraping({
      url: loginUrl,
      method: "POST",
      json: {
        userName: username,
        password: password,
      },
      responseType: "json",
      throwHttpErrors: false,
    });
    
    const responseBody = loginResponse.body;
    const token = responseBody?.data?.token;

    if (loginResponse.statusCode === 200 && token) {
      const authorizationHeader = `GlobalEducation ${token}`;
      console.log(`[SUCCESS] Auth token received for '${username}'.`);
      res.json({
        success: true,
        authorization: authorizationHeader, 
      });
    } else {
      // ✅ FIX: Special check for account lockout warnings
      let errorMessage;
      const cyberVidyaMessage = responseBody?.message || ""; // Get the message safely

      if (cyberVidyaMessage.toLowerCase().includes('attempt left')) {
        // If the message contains "attempt left", use that exact message
        errorMessage = cyberVidyaMessage;
      } else {
        // Otherwise, use a standard error message
        errorMessage = "Login failed. Please check your credentials.";
      }
      
      console.error(`[ERROR] Login failed for '${username}': ${cyberVidyaMessage}`);
      
      return res.status(loginResponse.statusCode || 401).json({ success: false, error: errorMessage });
    }

  } catch (error) {
    const errorMessage = error.message || "An unknown error occurred during login.";
    console.error("❌ CRITICAL ERROR in /get-session:", errorMessage);
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// NAYA Route: '/get-attendance' - Token ka istemal karke attendance data fetch karne ke liye



// Default route
router.get("/", (req, res) => {
  res.send("Hello from Attendance API 🚀");
});

export default router;

