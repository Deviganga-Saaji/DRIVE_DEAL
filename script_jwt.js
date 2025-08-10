// DOM Elements
const pages = document.querySelectorAll('.page');
const navLinks = document.querySelectorAll('[data-page]');
const welcomeUser = document.getElementById('welcome-user');
const loginLink = document.getElementById('login-link');
const registerLink = document.getElementById('register-link');
const logoutBtn = document.getElementById('logout-btn');
const adminLink = document.getElementById('admin-link');

// Current user state
let currentUser = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupFormValidations(); // Initialize form validations
    checkAuthStatus().then(() => {
        if (window.location.hash) {
            const pageId = window.location.hash.substring(1);
            showPage(pageId);
        } else {
            showPage('home');
        }
    });
});

// Validation utility functions
const validators = {
    email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    password: (value) => value.length >= 8,
    username: (value) => value.length >= 3,
    phone: (value) => !value || /^[\d\s\-()+]+$/.test(value),
    required: (value) => value.trim() !== '',
    year: (value, min = 1900) => {
        const currentYear = new Date().getFullYear();
        const yearNum = parseInt(value);
        return !isNaN(yearNum) && yearNum >= min && yearNum <= currentYear + 1;
    },
    price: (value) => parseFloat(value) > 0,
    text: (value, minLength = 1) => value.trim().length >= minLength
};

// Setup form validations
function setupFormValidations() {
    // Login form validation
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value.trim();
            const errorElement = document.getElementById('login-error');

            // Validate
            if (!validators.required(email)) {
                showError('login-email', 'Email is required');
                return;
            }

            if (!validators.email(email)) {
                showError('login-email', 'Please enter a valid email');
                return;
            }

            if (!validators.required(password)) {
                showError('login-password', 'Password is required');
                return;
            }

            if (!validators.password(password)) {
                showError('login-password', 'Password must be at least 8 characters');
                return;
            }

            // Clear errors
            clearErrors(['login-email', 'login-password']);

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Login failed');
                }

                const data = await response.json();
                localStorage.setItem('jwtToken', data.token);
                currentUser = data.user;
                updateAuthUI();
                showPage('home');
            } catch (error) {
                errorElement.textContent = error.message;
            }
        });

        // Add real-time validation
        document.getElementById('login-email').addEventListener('blur', (e) => {
            const value = e.target.value.trim();
            if (!validators.email(value)) {
                showError('login-email', 'Please enter a valid email');
            } else {
                clearError('login-email');
            }
        });

        document.getElementById('login-password').addEventListener('blur', (e) => {
            const value = e.target.value.trim();
            if (!validators.password(value)) {
                showError('login-password', 'Password must be at least 8 characters');
            } else {
                clearError('login-password');
            }
        });
    }

    // Registration form validation
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.getElementById('register-username').value.trim();
            const email = document.getElementById('register-email').value.trim();
            const password = document.getElementById('register-password').value.trim();
            const phone = document.getElementById('register-phone').value.trim();
            const errorElement = document.getElementById('register-error');

            // Validate
            if (!validators.required(username)) {
                showError('register-username', 'Username is required');
                return;
            }

            if (!validators.username(username)) {
                showError('register-username', 'Username must be at least 3 characters');
                return;
            }

            if (!validators.required(email)) {
                showError('register-email', 'Email is required');
                return;
            }

            if (!validators.email(email)) {
                showError('register-email', 'Please enter a valid email');
                return;
            }

            if (!validators.required(password)) {
                showError('register-password', 'Password is required');
                return;
            }

            if (!validators.password(password)) {
                showError('register-password', 'Password must be at least 8 characters');
                return;
            }

            if (phone && !validators.phone(phone)) {
                showError('register-phone', 'Please enter a valid phone number');
                return;
            }

            // Clear errors
            clearErrors(['register-username', 'register-email', 'register-password', 'register-phone']);

            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password, phone })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Registration failed');
                }

                showPage('login');
                document.getElementById('register-error').textContent = '';
            } catch (error) {
                errorElement.textContent = error.message;
            }
        });
    }

    // Listing form validation
    const listingForm = document.getElementById('listing-form');
    if (listingForm) {
        listingForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const make = document.getElementById('make').value.trim();
            const model = document.getElementById('model').value.trim();
            const year = document.getElementById('year').value;
            const price = document.getElementById('price').value;
            const fuelType = document.getElementById('fuel-type').value;
            const transmission = document.getElementById('transmission').value;

            // Validate
            if (!validators.required(make)) {
                showError('make', 'Make is required');
                return;
            }

            if (!validators.required(model)) {
                showError('model', 'Model is required');
                return;
            }

            if (!validators.required(year)) {
                showError('year', 'Year is required');
                return;
            }

            if (!validators.year(year)) {
                showError('year', 'Please enter a valid year (1900-current)');
                return;
            }

            if (!validators.required(price)) {
                showError('price', 'Price is required');
                return;
            }

            if (!validators.price(price)) {
                showError('price', 'Price must be greater than 0');
                return;
            }

            if (!validators.required(fuelType)) {
                showError('fuel-type', 'Fuel type is required');
                return;
            }

            if (!validators.required(transmission)) {
                showError('transmission', 'Transmission is required');
                return;
            }

            // Clear errors
            clearErrors(['make', 'model', 'year', 'price', 'fuel-type', 'transmission']);

            // Rest of your listing form submission logic...
            const formData = new FormData();
            const listingId = document.getElementById('listing-id').value;

            formData.append('make', make);
            formData.append('model', model);
            formData.append('year', year);
            formData.append('price', price);
            formData.append('fuel_type', fuelType);
            formData.append('transmission', transmission);

            // Add optional fields
            const mileage = document.getElementById('mileage').value;
            const color = document.getElementById('color').value;
            const description = document.getElementById('description').value;

            if (mileage) formData.append('mileage', mileage);
            if (color) formData.append('color', color);
            if (description) formData.append('description', description);

            // Add image if selected
            const imageInput = document.getElementById('image');
            if (imageInput.files[0]) {
                formData.append('image', imageInput.files[0]);
            }

            try {
                let response;
                if (listingId) {
                    response = await fetchWithAuth(`/api/listings/${listingId}`, {
                        method: 'PUT',
                        body: formData
                    });
                } else {
                    response = await fetchWithAuth('/api/listings', {
                        method: 'POST',
                        body: formData
                    });
                }

                if (response.ok) {
                    showPage('listings');
                    loadListings();
                } else {
                    const error = await response.json();
                    alert(error.error || 'Failed to save listing');
                }
            } catch (error) {
                console.error('Error saving listing:', error);
                alert('An error occurred while saving the listing');
            }
        });
    }

    // Report form validation
    const reportForm = document.getElementById('report-form');
    if (reportForm) {
        reportForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const reason = document.getElementById('report-reason').value.trim();

            if (!validators.required(reason)) {
                showError('report-reason', 'Reason is required');
                return;
            }

            if (!validators.text(reason, 10)) {
                showError('report-reason', 'Please provide more details (min 10 chars)');
                return;
            }

            clearError('report-reason');

            // Rest of your report submission logic...
            const reportedUserId = document.getElementById('reported-user-id').value;
            const listingId = document.getElementById('reported-listing-id').value;

            try {
                const response = await fetchWithAuth('/api/reports', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        reported_user_id: reportedUserId,
                        listing_id: listingId || null,
                        reason: reason
                    })
                });

                if (response.ok) {
                    closeReportModal();
                    alert('Report submitted successfully');
                } else {
                    const error = await response.json();
                    alert(error.error || 'Failed to submit report');
                }
            } catch (error) {
                console.error('Error submitting report:', error);
                alert('An error occurred while submitting the report');
            }
        });
    }
}

// Helper functions for validation UI
function showError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    field.classList.add('input-error');

    let errorElement = field.nextElementSibling;
    if (!errorElement || !errorElement.classList.contains('error-message')) {
        errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        field.parentNode.insertBefore(errorElement, field.nextSibling);
    }

    errorElement.textContent = message;
}

function clearError(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    field.classList.remove('input-error');

    const errorElement = field.nextElementSibling;
    if (errorElement && errorElement.classList.contains('error-message')) {
        errorElement.textContent = '';
    }
}

function clearErrors(fieldIds) {
    fieldIds.forEach(id => clearError(id));
}

// Navigation setup
function setupNavigation() {
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = link.getAttribute('data-page');
            showPage(pageId);
            window.location.hash = pageId;
        });
    });
}

// Show a specific page
function showPage(pageId) {
    pages.forEach(page => {
        page.classList.remove('active');
        if (page.id === `${pageId}-page`) {
            page.classList.add('active');
        }
    });

    // Load page-specific content
    switch (pageId) {
        case 'home':
            loadFeaturedListings();
            break;
        case 'listings':
            loadListings();
            break;
        case 'favorites':
            loadFavorites();
            break;
        case 'admin':
            if (currentUser?.is_admin) {
                loadAdminData();
            } else {
                showPage('home');
            }
            break;
        case 'login':
        case 'register':
            // Reset forms when showing auth pages
            document.getElementById(`${pageId}-form`)?.reset();
            document.getElementById(`${pageId}-error`).textContent = '';
            break;
    }

    window.scrollTo(0, 0);
}

// Enhanced fetch with authentication
async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('jwtToken');

    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    };

    try {
        const response = await fetch(url, {
            ...options,
            headers
        });

        if (response.status === 401) {
            localStorage.removeItem('jwtToken');
            currentUser = null;
            updateAuthUI();
            showPage('login');
            throw new Error('Session expired. Please login again.');
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Request failed');
        }

        return response;
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Check authentication status
async function checkAuthStatus() {
    const token = localStorage.getItem('jwtToken');

    if (!token) {
        currentUser = null;
        updateAuthUI();
        return;
    }

    try {
        const response = await fetchWithAuth('/api/me');
        const user = await response.json();
        currentUser = user;
        updateAuthUI();
    } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('jwtToken');
        currentUser = null;
        updateAuthUI();
    }
}

// Update UI based on auth status
function updateAuthUI() {
    if (currentUser) {
        welcomeUser.textContent = `Welcome, ${currentUser.username}`;
        loginLink.classList.add('hidden');
        registerLink.classList.add('hidden');
        logoutBtn.classList.remove('hidden');

        if (currentUser.is_admin) {
            adminLink.classList.remove('hidden');
        } else {
            adminLink.classList.add('hidden');
        }

        document.getElementById('add-listing-btn')?.classList.remove('hidden');
    } else {
        welcomeUser.textContent = '';
        loginLink.classList.remove('hidden');
        registerLink.classList.remove('hidden');
        logoutBtn.classList.add('hidden');
        adminLink.classList.add('hidden');
        document.getElementById('add-listing-btn')?.classList.add('hidden');
    }
}

// Logout functionality
logoutBtn?.addEventListener('click', () => {
    localStorage.removeItem('jwtToken');
    currentUser = null;
    updateAuthUI();
    showPage('home');
});

// Load featured listings
async function loadFeaturedListings() {
    try {
        const response = await fetchWithAuth('/api/listings?limit=4');
        const listings = await response.json();

        const container = document.getElementById('featured-listings-container');
        if (container) {
            container.innerHTML = listings.map(createListingCard).join('');
            addFavoriteEventListeners();
            addReportEventListeners();
        }
    } catch (error) {
        console.error('Error loading featured listings:', error);
    }
}

// Load all listings
async function loadListings() {
    try {
        const search = document.getElementById('search-input').value;
        const fuelType = document.getElementById('fuel-type-filter').value;

        let url = '/api/listings?';
        if (search) url += `search=${encodeURIComponent(search)}&`;
        if (fuelType) url += `fuelType=${encodeURIComponent(fuelType)}`;

        const response = await fetchWithAuth(url);
        const listings = await response.json();

        const container = document.getElementById('listings-container');
        if (container) {
            container.innerHTML = listings.map(createListingCard).join('');
            addFavoriteEventListeners();
            addReportEventListeners();
        }
    } catch (error) {
        console.error('Error loading listings:', error);
    }
}

// Create listing card HTML
function createListingCard(listing) {
    const isOwner = currentUser && currentUser.id === listing.user_id;

    return `
        <div class="listing-card">
            <img src="${listing.image_url || 'https://via.placeholder.com/300x200?text=No+Image'}" alt="${listing.make} ${listing.model}">
            <h3>${listing.make} ${listing.model}</h3>
            <p>Year: ${listing.year}</p>
            <p>Price: €${listing.price.toLocaleString()}</p>
            <p>Mileage: ${listing.mileage ? listing.mileage.toLocaleString() + ' km' : 'N/A'}</p>
            <p>Seller: ${listing.username}</p>
            <div class="listing-actions">
                <button class="btn btn-secondary" onclick="viewListingDetails(${listing.id})">View Details</button>
                <button class="favorite-btn" data-listing-id="${listing.id}">❤</button>
                ${isOwner ? `<button class="btn delete-btn" onclick="deleteListing(${listing.id}, event)">Delete</button>` : ''}
            </div>
            ${!isOwner ? `<button class="report-btn" onclick="showReportModal(${listing.user_id}, ${listing.id})">Report Seller</button>` : ''}
        </div>
    `;
}

// View listing details
function viewListingDetails(id) {
    fetchWithAuth(`/api/listings/${id}`)
        .then(response => response.json())
        .then(listing => {
            const isOwner = currentUser && currentUser.id === listing.user_id;
            const container = document.getElementById('listing-details-container');
            container.innerHTML = `
                <div class="listing-details">
                    <img src="${listing.image_url || 'https://via.placeholder.com/600x400?text=No+Image'}" alt="${listing.make} ${listing.model}">
                    <h2>${listing.make} ${listing.model}</h2>
                    <p><strong>Year:</strong> ${listing.year}</p>
                    <p><strong>Price:</strong> €${listing.price.toLocaleString()}</p>
                    <p><strong>Mileage:</strong> ${listing.mileage ? listing.mileage.toLocaleString() + ' km' : 'N/A'}</p>
                    <p><strong>Fuel Type:</strong> ${listing.fuel_type || 'N/A'}</p>
                    <p><strong>Transmission:</strong> ${listing.transmission || 'N/A'}</p>
                    <p><strong>Color:</strong> ${listing.color || 'N/A'}</p>
                    <p><strong>Description:</strong> ${listing.description || 'No description provided'}</p>
                    <div class="seller-info">
                        <h3>Seller Information</h3>
                        <p><strong>Name:</strong> ${listing.username}</p>
                        <p><strong>Phone:</strong> ${listing.phone || 'Not provided'}</p>
                        <p><strong>Email:</strong> ${listing.email}</p>
                    </div>
                    <div class="listing-actions">
                        <button class="btn btn-primary" onclick="showPage('listings')">Back to Listings</button>
                        <button class="favorite-btn" data-listing-id="${listing.id}">❤</button>
                        ${isOwner ? `
                            <button class="btn btn-secondary" onclick="showEditListingForm(${listing.id})">Edit</button>
                            <button class="btn delete-btn" onclick="deleteListing(${listing.id}, event)">Delete</button>
                        ` : ''}
                    </div>
                </div>
            `;
            addFavoriteEventListeners();
            showPage('listing-details');
        })
        .catch(error => {
            console.error('Error loading listing details:', error);
            alert('Failed to load listing details');
        });
}

// Add favorite event listeners
function addFavoriteEventListeners() {
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (!currentUser) {
                showPage('login');
                return;
            }

            const listingId = e.target.getAttribute('data-listing-id');
            const isFavorited = e.target.classList.contains('favorited');

            try {
                let response;
                if (isFavorited) {
                    response = await fetchWithAuth(`/api/favorites/${listingId}`, {
                        method: 'DELETE'
                    });
                } else {
                    response = await fetchWithAuth('/api/favorites', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ listing_id: listingId })
                    });
                }

                if (response.ok) {
                    e.target.classList.toggle('favorited');
                    if (document.querySelector('.page.active').id === 'favorites-page') {
                        loadFavorites();
                    }
                }
            } catch (error) {
                console.error('Error toggling favorite:', error);
            }
        });
    });
}

// Load favorites
async function loadFavorites() {
    if (!currentUser) {
        showPage('login');
        return;
    }

    try {
        const response = await fetchWithAuth('/api/favorites');
        const favorites = await response.json();

        const container = document.getElementById('favorites-container');
        if (container) {
            if (favorites.length === 0) {
                container.innerHTML = '<p>You have no favorites yet. Browse cars to add some!</p>';
            } else {
                container.innerHTML = favorites.map(createListingCard).join('');
                addFavoriteEventListeners();
                addReportEventListeners();

                // Mark all favorite buttons as favorited
                document.querySelectorAll('.favorite-btn').forEach(btn => {
                    btn.classList.add('favorited');
                });
            }
        }
    } catch (error) {
        console.error('Error loading favorites:', error);
    }
}

// Load admin data
async function loadAdminData() {
    try {
        const [usersResponse, listingsResponse, reportsResponse] = await Promise.all([
            fetchWithAuth('/api/admin/users'),
            fetchWithAuth('/api/listings'),
            fetchWithAuth('/api/admin/reports')
        ]);

        const users = await usersResponse.json();
        const listings = await listingsResponse.json();
        const reports = await reportsResponse.json();

        const usersContainer = document.getElementById('users-container');
        const listingsContainer = document.getElementById('admin-listings-container');
        const reportsContainer = document.getElementById('admin-reports-container');

        if (usersContainer) {
            usersContainer.innerHTML = `
                <table>
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Admin</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(user => `
                            <tr>
                                <td>${user.username}</td>
                                <td>${user.email}</td>
                                <td>${user.is_admin ? 'Yes' : 'No'}</td>
                                <td class="actions">
                                    <button class="btn btn-secondary" onclick="toggleAdminStatus(${user.id})">
                                        ${user.is_admin ? 'Remove Admin' : 'Make Admin'}
                                    </button>
                                    <button class="btn delete-btn" onclick="deleteUser(${user.id})">Delete</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

        if (listingsContainer) {
            listingsContainer.innerHTML = `
                <table>
                    <thead>
                        <tr>
                            <th>Make/Model</th>
                            <th>Year</th>
                            <th>Price</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${listings.map(listing => `
                            <tr>
                                <td>${listing.make} ${listing.model}</td>
                                <td>${listing.year}</td>
                                <td>€${listing.price.toLocaleString()}</td>
                                <td>${listing.is_active ? 'Active' : 'Inactive'}</td>
                                <td class="actions">
                                    <button class="btn btn-secondary" onclick="toggleListingStatus(${listing.id})">
                                        ${listing.is_active ? 'Deactivate' : 'Activate'}
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

        if (reportsContainer) {
            reportsContainer.innerHTML = `
                <table>
                    <thead>
                        <tr>
                            <th>Reporter</th>
                            <th>Reported User</th>
                            <th>Listing</th>
                            <th>Reason</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reports.map(report => `
                            <tr>
                                <td>${report.reporter_name}</td>
                                <td>${report.reported_user_name}</td>
                                <td>${report.listing_make ? `${report.listing_make} ${report.listing_model}` : 'N/A'}</td>
                                <td>${report.reason}</td>
                                <td>
                                    <span class="report-status ${report.status}">
                                        ${report.status}
                                    </span>
                                </td>
                                <td class="actions">
                                    ${report.status === 'pending' ? `
                                        <button class="btn btn-primary" onclick="resolveReport(${report.id})">Resolve</button>
                                    ` : ''}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
    } catch (error) {
        console.error('Error loading admin data:', error);
    }
}

// Admin functions
async function toggleAdminStatus(userId) {
    try {
        const response = await fetchWithAuth(`/api/admin/users/${userId}/toggle-admin`, {
            method: 'POST'
        });

        if (response.ok) {
            loadAdminData();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to update admin status');
        }
    } catch (error) {
        console.error('Error toggling admin status:', error);
        alert('An error occurred while updating admin status');
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    try {
        const response = await fetchWithAuth(`/api/admin/users/${userId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadAdminData();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to delete user');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('An error occurred while deleting the user');
    }
}

async function toggleListingStatus(listingId) {
    try {
        const response = await fetchWithAuth(`/api/admin/listings/${listingId}/toggle-active`, {
            method: 'POST'
        });

        if (response.ok) {
            loadAdminData();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to update listing status');
        }
    } catch (error) {
        console.error('Error toggling listing status:', error);
        alert('An error occurred while updating listing status');
    }
}

async function resolveReport(reportId) {
    try {
        const response = await fetchWithAuth(`/api/admin/reports/${reportId}/resolve`, {
            method: 'POST'
        });

        if (response.ok) {
            loadAdminData();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to resolve report');
        }
    } catch (error) {
        console.error('Error resolving report:', error);
        alert('An error occurred while resolving the report');
    }
}

// Add listing button
document.getElementById('add-listing-btn')?.addEventListener('click', () => {
    showPage('edit-listing');
    document.getElementById('edit-listing-title').textContent = 'Add New Listing';
    document.getElementById('listing-form').reset();
    document.getElementById('listing-id').value = '';
    document.getElementById('image-preview').style.display = 'none';
});

// Cancel edit button
document.getElementById('cancel-edit')?.addEventListener('click', () => {
    showPage('listings');
});

// Listing form submission
document.getElementById('listing-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentUser) {
        showPage('login');
        return;
    }

    const formData = new FormData();
    const listingId = document.getElementById('listing-id').value;

    // Add all form fields to FormData
    formData.append('make', document.getElementById('make').value);
    formData.append('model', document.getElementById('model').value);
    formData.append('year', document.getElementById('year').value);
    formData.append('price', document.getElementById('price').value);
    formData.append('mileage', document.getElementById('mileage').value);
    formData.append('fuel_type', document.getElementById('fuel-type').value);
    formData.append('transmission', document.getElementById('transmission').value);
    formData.append('color', document.getElementById('color').value);
    formData.append('description', document.getElementById('description').value);

    // Add image file if selected
    const imageInput = document.getElementById('image');
    if (imageInput.files[0]) {
        formData.append('image', imageInput.files[0]);
    }

    try {
        let response;
        if (listingId) {
            // Update existing listing
            response = await fetchWithAuth(`/api/listings/${listingId}`, {
                method: 'PUT',
                body: formData
            });
        } else {
            // Create new listing
            response = await fetchWithAuth('/api/listings', {
                method: 'POST',
                body: formData
            });
        }

        if (response.ok) {
            showPage('listings');
            loadListings();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to save listing');
        }
    } catch (error) {
        console.error('Error saving listing:', error);
        alert('An error occurred while saving the listing');
    }
});

// Image preview
document.getElementById('image')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const preview = document.getElementById('image-preview');
            preview.src = event.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
});

// Search functionality
document.getElementById('search-btn')?.addEventListener('click', loadListings);

// Report functionality
function showReportModal(userId, listingId = null) {
    if (!currentUser) {
        showPage('login');
        return;
    }

    document.getElementById('reported-user-id').value = userId;
    document.getElementById('reported-listing-id').value = listingId || '';
    document.getElementById('report-modal').classList.remove('hidden');
}

function closeReportModal() {
    document.getElementById('report-modal').classList.add('hidden');
}

// Delete listing
async function deleteListing(listingId, event) {
    event.stopPropagation();

    if (!confirm('Are you sure you want to delete this listing? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetchWithAuth(`/api/listings/${listingId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('Listing deleted successfully');
            const activePage = document.querySelector('.page.active').id;
            if (activePage === 'listings-page') {
                loadListings();
            } else if (activePage === 'favorites-page') {
                loadFavorites();
            } else if (activePage === 'listing-details-page') {
                showPage('listings');
            }
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to delete listing');
        }
    } catch (error) {
        console.error('Error deleting listing:', error);
        alert('An error occurred while deleting the listing');
    }
}

// Show edit listing form
async function showEditListingForm(listingId) {
    try {
        const response = await fetchWithAuth(`/api/listings/${listingId}`);
        const listing = await response.json();

        if (response.ok) {
            document.getElementById('edit-listing-title').textContent = 'Edit Listing';
            document.getElementById('listing-id').value = listing.id;
            document.getElementById('make').value = listing.make;
            document.getElementById('model').value = listing.model;
            document.getElementById('year').value = listing.year;
            document.getElementById('price').value = listing.price;
            document.getElementById('mileage').value = listing.mileage || '';
            document.getElementById('fuel-type').value = listing.fuel_type || '';
            document.getElementById('transmission').value = listing.transmission || '';
            document.getElementById('color').value = listing.color || '';
            document.getElementById('description').value = listing.description || '';

            const imagePreview = document.getElementById('image-preview');
            if (listing.image_url) {
                imagePreview.src = listing.image_url;
                imagePreview.style.display = 'block';
            } else {
                imagePreview.style.display = 'none';
            }

            showPage('edit-listing');
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to load listing for editing');
        }
    } catch (error) {
        console.error('Error loading listing for editing:', error);
        alert('An error occurred while loading the listing for editing');
    }
}

// Submit report
document.getElementById('report-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const reportedUserId = document.getElementById('reported-user-id').value;
    const listingId = document.getElementById('reported-listing-id').value;
    const reason = document.getElementById('report-reason').value;

    try {
        const response = await fetchWithAuth('/api/reports', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reported_user_id: reportedUserId,
                listing_id: listingId || null,
                reason: reason
            })
        });

        if (response.ok) {
            closeReportModal();
            alert('Report submitted successfully. Thank you for helping us keep the platform safe.');
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to submit report');
        }
    } catch (error) {
        console.error('Error submitting report:', error);
        alert('An error occurred while submitting the report');
    }
});

// Close modal
document.querySelector('.close-modal')?.addEventListener('click', closeReportModal);

window.addEventListener('click', (e) => {
    if (e.target === document.getElementById('report-modal')) {
        closeReportModal();
    }
});