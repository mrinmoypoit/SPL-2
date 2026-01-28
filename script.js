let isLoggedIn = false;

// Show auth modal
function showAuth() {
    if (isLoggedIn) {
        showMessage('You are already logged in!', 'success');
        return;
    }
    document.getElementById('authModal').classList.add('active');
    showAuthChoice();
}

// Close modal
function closeModal() {
    document.getElementById('authModal').classList.remove('active');
}

// Show auth choice
function showAuthChoice() {
    hideAllSteps();
    document.getElementById('authChoice').classList.add('active');
    document.getElementById('authTitle').textContent = 'Welcome to TULONA';
}

// Show login
function showLogin() {
    hideAllSteps();
    document.getElementById('loginForm').classList.add('active');
    document.getElementById('authTitle').textContent = 'Login to TULONA';
}

// Show signup
function showSignup() {
    hideAllSteps();
    document.getElementById('signupForm').classList.add('active');
    document.getElementById('authTitle').textContent = 'Create Account';
}

// Hide all steps
function hideAllSteps() {
    document.querySelectorAll('.auth-step').forEach(step => {
        step.classList.remove('active');
    });
}

// Handle login
function handleLogin(e) {
    e.preventDefault();
    isLoggedIn = true;
    localStorage.setItem('tulonaUser', JSON.stringify({ loggedIn: true }));
    closeModal();
    updateUI();
    showMessage('Welcome back! Login successful.', 'success');
}

// Handle signup
function handleSignup(e) {
    e.preventDefault();
    isLoggedIn = true;
    localStorage.setItem('tulonaUser', JSON.stringify({ loggedIn: true }));
    closeModal();
    updateUI();
    showMessage('Account created successfully! Welcome to TULONA.', 'success');
}

// Google login
function googleLogin() {
    isLoggedIn = true;
    localStorage.setItem('tulonaUser', JSON.stringify({ loggedIn: true }));
    closeModal();
    updateUI();
    showMessage('Logged in with Google successfully!', 'success');
}

// Update UI
function updateUI() {
    if (isLoggedIn) {
        document.getElementById('notificationBtn').style.display = 'flex';
        document.getElementById('profileBtn').innerHTML = '<i class="fas fa-user"></i>';
        document.getElementById('profileBtn').onclick = logout;
    }
}

// Logout
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        isLoggedIn = false;
        localStorage.removeItem('tulonaUser');
        document.getElementById('notificationBtn').style.display = 'none';
        document.getElementById('profileBtn').innerHTML = '<i class="fas fa-user-circle"></i>';
        document.getElementById('profileBtn').onclick = showAuth;
        showMessage('Logged out successfully!', 'success');
    }
}

// Show toast message
function showMessage(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Check login status on load
window.addEventListener('load', () => {
    const user = localStorage.getItem('tulonaUser');
    if (user) {
        isLoggedIn = true;
        updateUI();
    }
});

// Close modal on outside click
document.getElementById('authModal').addEventListener('click', (e) => {
    if (e.target.id === 'authModal') {
        closeModal();
    }
});
