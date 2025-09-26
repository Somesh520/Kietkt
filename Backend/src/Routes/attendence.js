import express from "express";
import { gotScraping } from "got-scraping";

const router = express.Router();


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
      let errorMessage;
      const cyberVidyaMessage = responseBody?.message || ""; 

      if (cyberVidyaMessage.toLowerCase().includes('attempt left')) {
        errorMessage = cyberVidyaMessage;
      } else {
        errorMessage = "Login failed. Please check your credentials.";
      }
      
      console.error(`[ERROR] Login failed for '${username}': ${cyberVidyaMessage}`);
      
      return res.status(loginResponse.statusCode || 401).json({ success: false, error: errorMessage });
    }

  } catch (error) {
    // CyberVidya server down hone ki error ko yahan handle kiya gaya hai
    if (['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED'].includes(error.code)) {
        console.error("❌ NETWORK ERROR in /get-session:", error.message);
        return res.status(503).json({ success: false, error: "The CyberVidya server is not responding. Please try again later." });
    }

    const errorMessage = error.message || "An unknown error occurred during login.";
    console.error("❌ CRITICAL ERROR in /get-session:", errorMessage);
    res.status(500).json({ success: false, error: errorMessage });
  }
});









export default router;

