// Initialize localStorage with sample data if not exists
if (!localStorage.getItem('students')) {
    const sampleStudents = [
        { id: 'S1001', name: 'John Doe', course: 'Computer Science' },
        { id: 'S1002', name: 'Jane Smith', course: 'Mathematics' },
        { id: 'S1003', name: 'Robert Johnson', course: 'Physics' },
        { id: 'S1004', name: 'Emily Davis', course: 'Chemistry' },
        { id: 'S1005', name: 'Michael Wilson', course: 'Biology' }
    ];
    localStorage.setItem('students', JSON.stringify(sampleStudents));
}

if (!localStorage.getItem('attendance')) {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const sampleAttendance = [
        { date: today, studentId: 'S1001', status: 'present' },
        { date: today, studentId: 'S1002', status: 'present' },
        { date: today, studentId: 'S1003', status: 'absent' },
        { date: yesterdayStr, studentId: 'S1001', status: 'present' },
        { date: yesterdayStr, studentId: 'S1002', status: 'absent' },
        { date: yesterdayStr, studentId: 'S1004', status: 'present' }
    ];
    localStorage.setItem('attendance', JSON.stringify(sampleAttendance));
}

// User accounts (for demo)
const users = [
    { username: 'admin', password: 'admin123', role: 'admin', name: 'System Admin' },
    { username: 'teacher1', password: 'teacher123', role: 'teacher', name: 'John Smith' },
    { username: 'student1', password: 'student123', role: 'student', name: 'Alice Johnson' }
];

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
function checkLogin() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            const user = users.find(u => u.username === username && u.password === password);
            if (user) {
                localStorage.setItem('isAuthenticated', 'true');
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
            } else {
                const errorElement = document.getElementById('error');
                errorElement.textContent = 'Invalid username or password';
                errorElement.classList.remove('hidden');
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
function addStudent(student) {
    const students = JSON.parse(localStorage.getItem('students'));
    students.push(student);
    localStorage.setItem('students', JSON.stringify(students));
}

function getStudents() {
    return JSON.parse(localStorage.getItem('students'));
}

// Attendance functions
function markAttendance(date, studentId, status) {
    const attendance = JSON.parse(localStorage.getItem('attendance'));
    const existingRecordIndex = attendance.findIndex(record => 
        record.date === date && record.studentId === studentId
    );

    if (existingRecordIndex !== -1) {
        attendance[existingRecordIndex].status = status;
    } else {
        attendance.push({ date, studentId, status });
    }

    localStorage.setItem('attendance', JSON.stringify(attendance));
}

function getAttendanceByDate(date) {
    return JSON.parse(localStorage.getItem('attendance'))
        .filter(record => record.date === date);
}

function getAttendanceByStudent(studentId) {
    return JSON.parse(localStorage.getItem('attendance'))
        .filter(record => record.studentId === studentId);
}

// Dashboard functions
function updateDashboardStats() {
    const students = getStudents();
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = getAttendanceByDate(today);
    
    document.getElementById('totalStudents').textContent = students.length;
    document.getElementById('presentToday').textContent = 
        todayAttendance.filter(a => a.status === 'present').length;
    document.getElementById('absentToday').textContent = 
        todayAttendance.filter(a => a.status === 'absent').length;
}

// Report functions
function generateReport(fromDate, toDate) {
    const attendance = JSON.parse(localStorage.getItem('attendance'));
    const students = getStudents();
    
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