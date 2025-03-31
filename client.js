// Authentication functions
function checkLogin() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                
                if (!response.ok) throw new Error('Login failed');
                
                const data = await response.json();
                localStorage.setItem('isAuthenticated', 'true');
                localStorage.setItem('token', data.token);
                
                // Decode token to get user info
                const payload = JSON.parse(atob(data.token.split('.')[1]));
                localStorage.setItem('userRole', payload.role);
                
                // Redirect based on role from token
                window.location.href = data.redirect || `${payload.role}-dashboard.html`;
            } catch (err) {
                showError('Invalid username or password');
            }
        });
    }
}

// Dashboard functions
async function updateDashboardStats() {
    try {
        const [studentsRes, attendanceRes] = await Promise.all([
            fetch('/api/students'),
            fetch(`/api/attendance/date/${new Date().toISOString().split('T')[0]}`)
        ]);
        
        if (!studentsRes.ok || !attendanceRes.ok) throw new Error('Data fetch failed');
        
        const [students, todayAttendance] = await Promise.all([
            studentsRes.json(),
            attendanceRes.json()
        ]);
        
        document.getElementById('totalStudents').textContent = students.length;
        document.getElementById('presentToday').textContent = 
            todayAttendance.filter(a => a.status === 'present').length;
        document.getElementById('absentToday').textContent = 
            todayAttendance.filter(a => a.status === 'absent').length;
    } catch (err) {
        console.error("Error updating dashboard:", err);
    }
}

// Attendance functions
async function markAttendance(date, studentId, status) {
    try {
        const response = await fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, studentId, status })
        });
        
        if (!response.ok) throw new Error('Attendance update failed');
        return await response.json();
    } catch (err) {
        console.error("Error marking attendance:", err);
        throw err;
    }
}

// Helper functions
function showError(message) {
    const errorElement = document.getElementById('error');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
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

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    checkLogin();
    
    // Set username in dashboards
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = localStorage.getItem('userName') || 'User';
    }
    
    // Initialize logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Page-specific initializations
    if (window.location.pathname.includes('dashboard')) {
        updateDashboardStats();
    }
});