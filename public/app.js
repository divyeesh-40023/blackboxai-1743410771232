require('dotenv').config();
const { getDb } = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const db = getDb();

// Secure authentication tokens
const generateToken = (user) => {
    return jwt.sign(
        { id: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
};

const verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};

async function connectDB() {
    try {
        await client.connect();
        db = client.db(dbName);
        console.log("Connected to MongoDB");
        
        // Initialize collections if they don't exist
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        
        if (!collectionNames.includes('students')) {
            await db.createCollection('students');
            await db.collection('students').insertMany([
                { id: 'S1001', name: 'John Doe', course: 'Computer Science' },
                { id: 'S1002', name: 'Jane Smith', course: 'Mathematics' },
                { id: 'S1003', name: 'Robert Johnson', course: 'Physics' },
                { id: 'S1004', name: 'Emily Davis', course: 'Chemistry' },
                { id: 'S1005', name: 'Michael Wilson', course: 'Biology' }
            ]);
        }
        
        if (!collectionNames.includes('attendance')) {
            await db.createCollection('attendance');
            const today = new Date().toISOString().split('T')[0];
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            
            await db.collection('attendance').insertMany([
                { date: today, studentId: 'S1001', status: 'present' },
                { date: today, studentId: 'S1002', status: 'present' },
                { date: today, studentId: 'S1003', status: 'absent' },
                { date: yesterdayStr, studentId: 'S1001', status: 'present' },
                { date: yesterdayStr, studentId: 'S1002', status: 'absent' },
                { date: yesterdayStr, studentId: 'S1004', status: 'present' }
            ]);
        }
    } catch (err) {
        console.error("MongoDB connection error:", err);
    }
}

// Initialize database connection
connectDB();

// Secure user storage in MongoDB
async function getUsers() {
    try {
        return await db.collection('users').find().toArray();
    } catch (err) {
        console.error("Error getting users:", err);
        throw err;
    }
}

async function createUser(user) {
    try {
        const hashedPassword = await bcrypt.hash(
            user.password, 
            parseInt(process.env.PASSWORD_SALT_ROUNDS)
        );
        await db.collection('users').insertOne({
            ...user,
            password: hashedPassword,
            createdAt: new Date()
        });
    } catch (err) {
        console.error("Error creating user:", err);
        throw err;
    }
}

// Initialize secure users
async function initUsers() {
    const users = await getUsers();
    if (users.length === 0) {
        await createUser({
            username: 'admin',
            password: 'admin123', // Will be hashed
            role: 'admin',
            name: 'System Admin'
        });
        // Add other default users...
    }
}

// Face recognition setup
async function setupFaceRecognition() {
    // Load face-api.js models
    await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
    await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
}

// Geographic verification
function verifyLocation(callback) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const allowedLat = 40.7128; // Example: New York
                const allowedLng = -74.0060;
                const distance = calculateDistance(
                    position.coords.latitude,
                    position.coords.longitude,
                    allowedLat,
                    allowedLng
                );
                callback(distance < 1000); // Allow 1km radius
            },
            error => callback(false)
        );
    } else {
        callback(false);
    }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    // Haversine formula implementation
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Authentication functions
async function checkLogin() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                
                const user = (await getUsers()).find(u => u.username === username);
                if (!user || !(await bcrypt.compare(password, user.password))) {
                    throw new Error('Invalid credentials');
                }

                const token = generateToken(user);
                localStorage.setItem('authToken', token);
                localStorage.setItem('userRole', user.role);
                localStorage.setItem('userName', user.name);
                
                // Redirect based on role
                if (user.role === 'admin') {
                    window.location.href = 'admin-dashboard.html';
                } else if (user.role === 'teacher') {
                    window.location.href = 'teacher-dashboard.html';
                } else {
                    window.location.href = 'student-dashboard.html';
                }
            } catch (err) {
                const errorElement = document.getElementById('error');
                if (errorElement) {
                    errorElement.textContent = 'Invalid username or password';
                    errorElement.classList.remove('hidden');
                }
                console.error("Login error:", err);
            }
        });
    }
}

function checkAuth() {
    if (window.location.pathname !== '/index.html' && 
        window.location.pathname !== '/' && 
        localStorage.getItem('isAuthenticated') !== 'true') {
        window.location.href = 'index.html';
    }
}

function logout() {
    localStorage.removeItem('isAuthenticated');
    window.location.href = 'index.html';
}

// Student management functions
async function addStudent(student) {
    try {
        await db.collection('students').insertOne(student);
    } catch (err) {
        console.error("Error adding student:", err);
        throw err;
    }
}

async function getStudents() {
    try {
        return await db.collection('students').find().toArray();
    } catch (err) {
        console.error("Error getting students:", err);
        throw err;
    }
}

// Attendance functions
async function markAttendance(date, studentId, status) {
    try {
        await db.collection('attendance').updateOne(
            { date, studentId },
            { $set: { status } },
            { upsert: true }
        );
    } catch (err) {
        console.error("Error marking attendance:", err);
        throw err;
    }
}

async function getAttendanceByDate(date) {
    try {
        return await db.collection('attendance').find({ date }).toArray();
    } catch (err) {
        console.error("Error getting attendance by date:", err);
        throw err;
    }
}

async function getAttendanceByStudent(studentId) {
    try {
        return await db.collection('attendance').find({ studentId }).toArray();
    } catch (err) {
        console.error("Error getting attendance by student:", err);
        throw err;
    }
}

// Dashboard functions
async function updateDashboardStats() {
    try {
        const students = await getStudents();
        const today = new Date().toISOString().split('T')[0];
        const todayAttendance = await getAttendanceByDate(today);
        
        document.getElementById('totalStudents').textContent = students.length;
        document.getElementById('presentToday').textContent = 
            todayAttendance.filter(a => a.status === 'present').length;
        document.getElementById('absentToday').textContent = 
            todayAttendance.filter(a => a.status === 'absent').length;
    } catch (err) {
        console.error("Error updating dashboard stats:", err);
    }
}

// Report functions
async function generateReport(fromDate, toDate) {
    try {
        const [attendance, students] = await Promise.all([
            db.collection('attendance').find().toArray(),
            getStudents()
        ]);

        return attendance
            .filter(record => {
                const recordDate = new Date(record.date);
                return (!fromDate || recordDate >= new Date(fromDate)) && 
                       (!toDate || recordDate <= new Date(toDate));
            })
            .map(record => {
                const student = students.find(s => s.id === record.studentId);
                return {
                    date: record.date,
                    studentId: record.studentId,
                    name: student ? student.name : 'Unknown',
                    status: record.status
                };
            });
    } catch (err) {
        console.error("Error generating report:", err);
        throw err;
    }
}

// Initialize page-specific functionality
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    checkLogin();
    
    // Set username in all dashboards
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = localStorage.getItem('userName') || 'User';
    }
    
    if (window.location.pathname.includes('admin-dashboard.html')) {
        // Admin specific initialization
    } else if (window.location.pathname.includes('teacher-dashboard.html')) {
        // Teacher specific initialization
    } else if (window.location.pathname.includes('student-dashboard.html')) {
        // Student specific initialization
    }
    
    if (window.location.pathname.includes('attendance.html')) {
        // Initialize date picker with today's date
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('attendanceDate').value = today;
    }
    
    if (window.location.pathname.includes('reports.html')) {
        // Initialize date pickers with default range (last 7 days)
        const today = new Date();
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);
        
        document.getElementById('fromDate').value = lastWeek.toISOString().split('T')[0];
        document.getElementById('toDate').value = today.toISOString().split('T')[0];
    }
});