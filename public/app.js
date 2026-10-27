let userId = null;

// Helper function to safely read API responses
async function readResponse(response) {
    try {
        return await response.json();
    } catch {
        return {};
    }
}

// Function to handle user registration
async function registerUser(event) {
    event.preventDefault();

    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const rollNumber = document.getElementById('roll-number').value.trim();
    const casualLeave = Number(document.getElementById('casual-leave').value);
    const medicalLeave = Number(document.getElementById('medical-leave').value);

    const messageElement = document.getElementById('registration-response');

    if (
        !username ||
        !email ||
        !rollNumber ||
        !Number.isInteger(casualLeave) ||
        !Number.isInteger(medicalLeave) ||
        casualLeave < 0 ||
        medicalLeave < 0
    ) {
        messageElement.innerText = 'Please enter valid registration details.';
        return;
    }

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                email,
                rollNumber,
                casualLeave,
                medicalLeave
            })
        });

        const data = await readResponse(response);

        if (response.ok) {
            messageElement.innerText =
                data.message || 'Registration successful! Please log in.';

            document.getElementById('registration-form').reset();
            document.getElementById('registration-section').style.display = 'none';
            document.getElementById('login-section').style.display = 'block';
        } else {
            messageElement.innerText =
                data.message || 'Error registering user.';
        }
    } catch (error) {
        console.error('Error registering user:', error);
        messageElement.innerText = 'Server error. Please try again.';
    }
}

// Function to handle user login
async function loginUser(event) {
    event.preventDefault();

    const email = document.getElementById('email').value.trim();
    const messageElement = document.getElementById('response-message');

    if (!email) {
        messageElement.innerText = 'Please enter your email address.';
        return;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });

        const data = await readResponse(response);

        if (response.ok) {
            if (data.userId == null) {
                messageElement.innerText = 'Invalid server response: missing user ID.';
                return;
            }

            userId = data.userId;

            document.getElementById('username-display').innerText =
                data.username ?? '';
            document.getElementById('roll-number-display').innerText =
                data.rollNumber ?? '';
            document.getElementById('casual-leave-display').innerText =
                data.casualLeave ?? 0;
            document.getElementById('medical-leave-display').innerText =
                data.medicalLeave ?? 0;

            document.getElementById('balance-section').style.display = 'block';
            document.getElementById('apply-leave-section').style.display = 'block';
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('registration-section').style.display = 'none';
            document.getElementById('logout-button').style.display = 'block';

            messageElement.innerText = data.message || 'Login successful.';
            document.getElementById('login-form').reset();
        } else {
            messageElement.innerText =
                data.message || 'Error logging in.';
        }
    } catch (error) {
        console.error('Error logging in:', error);
        messageElement.innerText = 'Server error. Please try again.';
    }
}

// Function to handle user logout
function logoutUser() {
    userId = null;

    document.getElementById('balance-section').style.display = 'none';
    document.getElementById('apply-leave-section').style.display = 'none';
    document.getElementById('logout-button').style.display = 'none';
    document.getElementById('login-section').style.display = 'block';
    document.getElementById('registration-section').style.display = 'none';

    document.getElementById('response-message').innerText = '';
    document.getElementById('registration-response').innerText = '';

    document.getElementById('username-display').innerText = '';
    document.getElementById('roll-number-display').innerText = '';
    document.getElementById('casual-leave-display').innerText = 'Loading...';
    document.getElementById('medical-leave-display').innerText = 'Loading...';

    document.getElementById('login-form').reset();
    document.getElementById('leave-form').reset();
}

// Function to refresh leave balance
async function refreshLeaveBalance() {
    if (userId == null) {
        document.getElementById('response-message').innerText =
            'Please log in first.';
        return;
    }

    try {
        const response = await fetch(
            `/api/leave-balance/${encodeURIComponent(userId)}`
        );

        const data = await readResponse(response);

        if (response.ok) {
            document.getElementById('casual-leave-display').innerText =
                data.casualLeave ?? 0;
            document.getElementById('medical-leave-display').innerText =
                data.medicalLeave ?? 0;
            document.getElementById('response-message').innerText =
                data.message || 'Leave balance updated.';
        } else {
            document.getElementById('response-message').innerText =
                data.message || 'Error fetching leave balance.';
        }
    } catch (error) {
        console.error('Error refreshing balance:', error);
        document.getElementById('response-message').innerText =
            'Server error. Please try again.';
    }
}

// Function to apply for leave
async function applyLeave(event) {
    event.preventDefault();

    if (userId == null) {
        document.getElementById('response-message').innerText =
            'Please log in before applying for leave.';
        return;
    }

    const type = document.getElementById('leave-type').value;
    const days = Number(document.getElementById('leave-days').value);
    const messageElement = document.getElementById('response-message');

    if (!type || !Number.isInteger(days) || days <= 0) {
        messageElement.innerText =
            'Please select a leave type and enter a valid number of days.';
        return;
    }

    try {
        const response = await fetch(
            `/api/apply-leave/${encodeURIComponent(userId)}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ type, days })
            }
        );

        const data = await readResponse(response);

        if (response.ok) {
            document.getElementById('casual-leave-display').innerText =
                data.casualLeave ?? 0;
            document.getElementById('medical-leave-display').innerText =
                data.medicalLeave ?? 0;

            messageElement.innerText =
                data.message || 'Leave application successful.';

            document.getElementById('leave-form').reset();
        } else {
            messageElement.innerText =
                data.message || 'Error applying for leave.';
        }
    } catch (error) {
        console.error('Error applying for leave:', error);
        messageElement.innerText = 'Server error. Please try again.';
    }
}

// Show the login section
function showLogin() {
    document.getElementById('login-section').style.display = 'block';
    document.getElementById('registration-section').style.display = 'none';
}

// Show the registration section
function showRegistration() {
    document.getElementById('registration-section').style.display = 'block';
    document.getElementById('login-section').style.display = 'none';
}

// Register event listeners after the HTML has loaded
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('registration-form')
        .addEventListener('submit', registerUser);

    document.getElementById('login-form')
        .addEventListener('submit', loginUser);

    document.getElementById('refresh-balance')
        .addEventListener('click', refreshLeaveBalance);

    document.getElementById('logout-button')
        .addEventListener('click', logoutUser);

    document.getElementById('leave-form')
        .addEventListener('submit', applyLeave);

    document.getElementById('show-login')
        .addEventListener('click', showLogin);

    document.getElementById('show-registration')
        .addEventListener('click', showRegistration);
});