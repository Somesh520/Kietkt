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
      // ✅ FIX: Data ko 'form' ke bajaye 'json' format mein bhej rahe hain
      // Isse Content-Type apne aap application/json set ho jayega
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
router.post("/get-attendance", async (req, res) => {
    try {
        const { authorization } = req.body;

        if (!authorization) {
            return res.status(400).json({
                success: false,
                error: "Authorization token zaroori hai",
            });
        }
        
        console.log("[INFO] Attendance data fetch kiya ja raha hai...");

        const attendanceUrl = "https://kiet.cybervidya.net/api/attendance/course/component/student";

        const attendanceResponse = await gotScraping({
            url: attendanceUrl,
            method: 'GET',
            headers: {
                'Authorization': authorization, // Poora header yahan istemal karein
            },
            responseType: 'json',
            throwHttpErrors: false,
        });
        
        const responseBody = attendanceResponse.body;

        if (attendanceResponse.statusCode !== 200) {
            const errorMessage = responseBody?.message || "Attendance fetch nahi ho saki. Token invalid ya expire ho sakta hai.";
            console.error(`[ERROR] Attendance fetch karne mein galti: ${errorMessage}`);
            return res.status(attendanceResponse.statusCode).json({ success: false, error: errorMessage });
        }
        
        console.log("[SUCCESS] Attendance data safaltapoorvak fetch ho gaya.");
        
        res.json({
            success: true,
            data: responseBody,
        });

    } catch (error) {
        const errorMessage = error.message || "Attendance fetch karne ke dauraan ek anjaan error aayi.";
        console.error("❌ ERROR /get-attendance mein:", errorMessage);
        res.status(500).json({ success: false, error: errorMessage });
    }
});


// Default route
router.get("/", (req, res) => {
  res.send("Hello from Attendance API 🚀");
});

export default router;

