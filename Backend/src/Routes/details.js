import express from 'express';
const router = express.Router();
import { gotScraping } from "got-scraping";

router.post("/get-registered-courses", async (req, res) => {
    try {
        const { authorization } = req.headers;

        if (!authorization) {
            return res.status(400).json({
                success: false,
                error: "Authorization token is required",
            });
        }
        
        console.log("[INFO] Fetching registered courses data...");

        const coursesUrl = "https://kiet.cybervidya.net/api/student/dashboard/registered-courses";

        const coursesResponse = await gotScraping({
            url: coursesUrl,
            method: 'GET',
            headers: {
                'Authorization': authorization,
            },
            responseType: 'json',
            throwHttpErrors: false,
        });
        
        const responseBody = coursesResponse.body;

        if (coursesResponse.statusCode !== 200) {
            const errorMessage = responseBody?.message || "Could not fetch registered courses. Token might be invalid or expired.";
            console.error(`[ERROR] Error fetching registered courses: ${errorMessage}`);
            return res.status(coursesResponse.statusCode).json({ success: false, error: errorMessage });
        }
        
        console.log("[SUCCESS] Successfully fetched registered courses.");
        
        res.json({
            success: true,
            data: responseBody,
        });

    } catch (error) {
        const errorMessage = error.message || "An unknown error occurred while fetching registered courses.";
        console.error("❌ ERROR in /get-registered-courses:", errorMessage);
        res.status(500).json({ success: false, error: errorMessage });
    }
});

const getFormattedDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

router.post("/get-weekly-schedule", async (req, res) => {
    try {
        const { authorization } = req.headers;
        if (!authorization) {
            return res.status(400).json({ success: false, error: "Authorization token is required" });
        }
        
        console.log("[INFO] Fetching schedule for the next 7 days...");
        
        const startDateObj = new Date();
        const endDateObj = new Date();
        endDateObj.setDate(startDateObj.getDate() + 6);

        const weekStartDate = getFormattedDate(startDateObj);
        const weekEndDate = getFormattedDate(endDateObj);

        console.log(`[DATE] Fetching data for: ${weekStartDate} to ${weekEndDate}`);
        
        const scheduleUrl = `https://kiet.cybervidya.net/api/student/schedule/class?weekEndDate=${weekEndDate}&weekStartDate=${weekStartDate}`;

        const scheduleResponse = await gotScraping({
            url: scheduleUrl,
            method: 'GET',
            headers: { 'Authorization': authorization },
            responseType: 'json',
            throwHttpErrors: false,
        });
        
        const responseBody = scheduleResponse.body;

        if (scheduleResponse.statusCode !== 200) {
            throw new Error(responseBody?.message || "Failed to fetch weekly schedule.");
        }

        console.log("[SUCCESS] Successfully fetched weekly schedule.");

        res.json({
            success: true,
            data: responseBody,
        });

    } catch (error) {
        console.error("❌ ERROR in /get-weekly-schedule:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post("/get-dashboard-attendance", async (req, res) => {
    try {
        const { authorization } = req.headers;

        if (!authorization) {
            return res.status(400).json({
                success: false,
                error: "Authorization token is required",
            });
        }
        
        console.log("[INFO] Fetching dashboard attendance data...");

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
            const errorMessage = responseBody?.message || "Could not fetch dashboard attendance. Token might be invalid or expired.";
            console.error(`[ERROR] Error fetching dashboard attendance: ${errorMessage}`);
            return res.status(attendanceResponse.statusCode).json({ success: false, error: errorMessage });
        }
        
        console.log("[SUCCESS] Successfully fetched dashboard attendance.");
        
        res.json({
            success: true,
            data: responseBody,
        });

    } catch (error) {
        const errorMessage = error.message || "An unknown error occurred while fetching dashboard attendance.";
        console.error("❌ ERROR in /get-dashboard-attendance:", errorMessage);
        res.status(500).json({ success: false, error: errorMessage });
    }
});

router.post("/get-detailed-attendance", async (req, res) => {
    try {
        const { authorization } = req.headers;
        if (!authorization) {
            return res.status(400).json({ success: false, error: "Authorization header is required" });
        }
        console.log("[INFO] Fetching detailed attendance data...");
        const attendanceUrl = "https://kiet.cybervidya.net/api/attendance/course/component/student";
        const attendanceResponse = await gotScraping({
            url: attendanceUrl,
            method: 'GET',
            headers: { 'Authorization': authorization },
            responseType: 'json',
            throwHttpErrors: false,
        });
        const responseBody = attendanceResponse.body;
        if (attendanceResponse.statusCode !== 200) {
            throw new Error(responseBody?.message || "Could not fetch detailed attendance.");
        }
        console.log("[SUCCESS] Successfully fetched detailed attendance.");
        res.json({ success: true, data: responseBody });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post("/get-lecture-wise-attendance", async (req, res) => {
    try {
        
        const {authorization} = req.headers;
        const { studentId, courseId, courseCompId } = req.body;

        if (!authorization || !studentId || !courseId || !courseCompId) {
            return res.status(400).json({
                success: false,
                error: "Authorization, studentId, courseId, and courseCompId are required",
            });
        }
        
        console.log(`[INFO] Fetching lecture-wise attendance for courseId: ${courseId}...`);

        const lectureWiseUrl = "https://kiet.cybervidya.net/api/attendance/schedule/student/course/attendance/percentage";

        const lectureResponse = await gotScraping({
            url: lectureWiseUrl,
            method: 'POST',
            headers: {
                'Authorization': authorization,
            },
            json: {
                studentId: studentId,
                sessionId: null,
                courseId: courseId,
                courseCompId: courseCompId
            },
            responseType: 'json',
            throwHttpErrors: false,
        });
        
        const responseBody = lectureResponse.body;

        if (lectureResponse.statusCode !== 200) {
            const errorMessage = responseBody?.message || "Could not fetch lecture-wise attendance.";
            console.error(`[ERROR] Error fetching lecture-wise attendance: ${errorMessage}`);
            return res.status(lectureResponse.statusCode).json({ success: false, error: errorMessage });
        }
        
        console.log("[SUCCESS] Successfully fetched lecture-wise attendance.");
        
        res.json({
            success: true,
            data: responseBody,
        });

    } catch (error) {
        const errorMessage = error.message || "An unknown error occurred while fetching lecture-wise attendance.";
        console.error("❌ ERROR in /get-lecture-wise-attendance:", errorMessage);
        res.status(500).json({ success: false, error: errorMessage });
    }
});
//here we end 
export default router;
