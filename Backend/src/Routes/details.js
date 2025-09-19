import e from 'express';
import express from 'express';
const router = express.Router();
import { gotScraping } from "got-scraping";

router.post("/get-registered-courses", async (req, res) => {
    try {
        const { authorization } = req.body;

        if (!authorization) {
            return res.status(400).json({
                success: false,
                error: "Authorization token zaroori hai",
            });
        }
        
        console.log("[INFO] Registered courses ka data fetch kiya ja raha hai...");

        // Screenshot se mila sahi URL
        const coursesUrl = "https://kiet.cybervidya.net/api/student/dashboard/registered-courses";

        const coursesResponse = await gotScraping({
            url: coursesUrl,
            method: 'GET',
            headers: {
                'Authorization': authorization, // Auth token header mein bhejein
            },
            responseType: 'json',
            throwHttpErrors: false,
        });
        
        const responseBody = coursesResponse.body;

        if (coursesResponse.statusCode !== 200) {
            const errorMessage = responseBody?.message || "Registered courses fetch nahi ho sake. Token invalid ya expire ho sakta hai.";
            console.error(`[ERROR] Registered courses fetch karne mein galti: ${errorMessage}`);
            return res.status(coursesResponse.statusCode).json({ success: false, error: errorMessage });
        }
        
        console.log("[SUCCESS] Registered courses safaltapoorvak fetch ho gaye.");
        
        // CyberVidya se mila poora data frontend ko bhej dein
        res.json({
            success: true,
            data: responseBody,
        });

    } catch (error) {
        const errorMessage = error.message || "Registered courses fetch karne ke dauraan ek anjaan error aayi.";
        console.error("❌ ERROR /get-registered-courses mein:", errorMessage);
        res.status(500).json({ success: false, error: errorMessage });
    }
});


router.post("/get-upcoming-classes", async (req, res) => {
    try {
        const { authorization } = req.body;

        if (!authorization) {
            return res.status(400).json({
                success: false,
                error: "Authorization token zaroori hai",
            });
        }
        
        console.log("[INFO] Upcoming classes ka data fetch kiya ja raha hai...");

        // Aapke dwara diya gaya naya URL
        const upcomingClassesUrl = "https://kiet.cybervidya.net/api/student/dashboard/upcoming/classes";

        const classesResponse = await gotScraping({
            url: upcomingClassesUrl,
            method: 'GET',
            headers: {
                'Authorization': authorization, // Auth token header mein bhejein
            },
            responseType: 'json',
            throwHttpErrors: false,
        });
        
        const responseBody = classesResponse.body;

        if (classesResponse.statusCode !== 200) {
            const errorMessage = responseBody?.message || "Upcoming classes fetch nahi ho saki. Token invalid ya expire ho sakta hai.";
            console.error(`[ERROR] Upcoming classes fetch karne mein galti: ${errorMessage}`);
            return res.status(classesResponse.statusCode).json({ success: false, error: errorMessage });
        }
        
        console.log("[SUCCESS] Upcoming classes safaltapoorvak fetch ho gayi.");
        
        // CyberVidya se mila poora data frontend ko bhej dein
        res.json({
            success: true,
            data: responseBody,
        });

    } catch (error) {
        const errorMessage = error.message || "Upcoming classes fetch karne ke dauraan ek anjaan error aayi.";
        console.error("❌ ERROR /get-upcoming-classes mein:", errorMessage);
        res.status(500).json({ success: false, error: errorMessage });
    }
});

router.post("/get-dashboard-attendance", async (req, res) => {
    try {
        const { authorization } = req.body;

        if (!authorization) {
            return res.status(400).json({
                success: false,
                error: "Authorization token zaroori hai",
            });
        }
        
        console.log("[INFO] Dashboard attendance ka data fetch kiya ja raha hai...");

        const dashboardAttendanceUrl = "https://kiet.cybervidya.net/api/student/dashboard/attendance";

        const attendanceResponse = await gotScraping({
            url: dashboardAttendanceUrl,
            method: 'GET',
            headers: {
                'Authorization': authorization,
            },
            responseType: 'json',
            throwHttpErrors: false,
        });
        
        const responseBody = attendanceResponse.body;

        if (attendanceResponse.statusCode !== 200) {
            const errorMessage = responseBody?.message || "Dashboard attendance fetch nahi ho saki. Token invalid ya expire ho sakta hai.";
            console.error(`[ERROR] Dashboard attendance fetch karne mein galti: ${errorMessage}`);
            return res.status(attendanceResponse.statusCode).json({ success: false, error: errorMessage });
        }
        
        console.log("[SUCCESS] Dashboard attendance safaltapoorvak fetch ho gayi.");
        
        res.json({
            success: true,
            data: responseBody,
        });

    } catch (error) {
        const errorMessage = error.message || "Dashboard attendance fetch karne ke dauraan ek anjaan error aayi.";
        console.error("❌ ERROR /get-dashboard-attendance mein:", errorMessage);
        res.status(500).json({ success: false, error: errorMessage });
    }
});

router.post("/get-detailed-attendance", async (req, res) => {
    try {
        const { authorization } = req.body;

        if (!authorization) {
            return res.status(400).json({
                success: false,
                error: "Authorization token zaroori hai",
            });
        }
        
        console.log("[INFO] Detailed attendance data fetch kiya ja raha hai...");

        const attendanceUrl = "https://kiet.cybervidya.net/api/attendance/course/component/student";

        const attendanceResponse = await gotScraping({
            url: attendanceUrl,
            method: 'GET',
            headers: {
                'Authorization': authorization,
            },
            responseType: 'json',
            throwHttpErrors: false,
        });
        
        const responseBody = attendanceResponse.body;

        if (attendanceResponse.statusCode !== 200) {
            const errorMessage = responseBody?.message || "Detailed attendance fetch nahi ho saki. Token invalid ya expire ho sakta hai.";
            console.error(`[ERROR] Detailed attendance fetch karne mein galti: ${errorMessage}`);
            return res.status(attendanceResponse.statusCode).json({ success: false, error: errorMessage });
        }
        
        console.log("[SUCCESS] Detailed attendance data safaltapoorvak fetch ho gaya.");
        
        res.json({
            success: true,
            data: responseBody,
        });

    } catch (error) {
        const errorMessage = error.message || "Detailed attendance fetch karne ke dauraan ek anjaan error aayi.";
        console.error("❌ ERROR /get-detailed-attendance mein:", errorMessage);
        res.status(500).json({ success: false, error: errorMessage });
    }
});

router.post("/get-lecture-wise-attendance", async (req, res) => {
    try {
        // Is endpoint ke liye hamein auth ke alawa kuch aur IDs bhi chahiye
        const { authorization, studentId, courseId, courseCompId } = req.body;

        if (!authorization || !studentId || !courseId || !courseCompId) {
            return res.status(400).json({
                success: false,
                error: "Authorization, studentId, courseId, aur courseCompId zaroori hai",
            });
        }
        
        console.log(`[INFO] Lecture-wise attendance fetch ki ja rahi hai courseId: ${courseId} ke liye...`);

        const lectureWiseUrl = "https://kiet.cybervidya.net/api/attendance/schedule/student/course/attendance/percentage";

        const lectureResponse = await gotScraping({
            url: lectureWiseUrl,
            method: 'POST', // Yeh ek POST request hai
            headers: {
                'Authorization': authorization,
            },
            // Body mein JSON payload bhejein
            json: {
                studentId: studentId,
                sessionId: null, // Default null bhej rahe hain
                courseId: courseId,
                courseCompId: courseCompId
            },
            responseType: 'json',
            throwHttpErrors: false,
        });
        
        const responseBody = lectureResponse.body;

        if (lectureResponse.statusCode !== 200) {
            const errorMessage = responseBody?.message || "Lecture-wise attendance fetch nahi ho saki.";
            console.error(`[ERROR] Lecture-wise attendance fetch karne mein galti: ${errorMessage}`);
            return res.status(lectureResponse.statusCode).json({ success: false, error: errorMessage });
        }
        
        console.log("[SUCCESS] Lecture-wise attendance safaltapoorvak fetch ho gayi.");
        
        res.json({
            success: true,
            data: responseBody,
        });

    } catch (error) {
        const errorMessage = error.message || "Lecture-wise attendance fetch karne ke dauraan ek anjaan error aayi.";
        console.error("❌ ERROR /get-lecture-wise-attendance mein:", errorMessage);
        res.status(500).json({ success: false, error: errorMessage });
    }
});

export default router;
