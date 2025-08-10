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
    checkAuthStatus().then(() => {
        // Set home as default page
        if (window.location.hash) {
            const pageId = window.location.hash.substring(1);
            showPage(pageId);
        } else {
            showPage('home');
        }
    });
});

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

    // Scroll to top when changing pages
    window.scrollTo(0, 0);
}

// Check authentication status
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/me');
        if (response.ok) {
            const user = await response.json();
            currentUser = user;
            updateAuthUI();
        } else {
            currentUser = null;
            updateAuthUI();
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
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

        // Show admin link if user is admin
        if (currentUser.is_admin) {
            adminLink.classList.remove('hidden');
        } else {
            adminLink.classList.add('hidden');
        }

        // Show add listing button
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

// Login functionality
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            currentUser = data.user;
            updateAuthUI();
            showPage('home');
        } else {
            document.getElementById('login-error').textContent = data.error || 'Login failed';
        }
    } catch (error) {
        console.error('Login error:', error);
        document.getElementById('login-error').textContent = 'An error occurred during login';
    }
});

// Register functionality
document.getElementById('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const phone = document.getElementById('register-phone').value;

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password, phone })
        });

        const data = await response.json();

        if (response.ok) {
            showPage('login');
            document.getElementById('register-error').textContent = '';
        } else {
            document.getElementById('register-error').textContent = data.error || 'Registration failed';
        }
    } catch (error) {
        console.error('Registration error:', error);
        document.getElementById('register-error').textContent = 'An error occurred during registration';
    }
});

// Logout functionality
logoutBtn?.addEventListener('click', async () => {
    try {
        await fetch('/api/logout');
        currentUser = null;
        updateAuthUI();
        showPage('home');
    } catch (error) {
        console.error('Logout error:', error);
    }
});

// Load featured listings
async function loadFeaturedListings() {
    try {
        const response = await fetch('/api/listings?limit=4');
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

        const response = await fetch(url);
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
            </div>
            <button class="report-btn" onclick="showReportModal(${listing.user_id}, ${listing.id})">Report Seller</button>
        </div>
    `;
}

// View listing details
function viewListingDetails(id) {
    fetch(`/api/listings/${id}`)
        .then(response => response.json())
        .then(listing => {
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
                    response = await fetch(`/api/favorites/${listingId}`, {
                        method: 'DELETE'
                    });
                } else {
                    response = await fetch('/api/favorites', {
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
        const response = await fetch('/api/favorites');
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
            fetch('/api/admin/users'),
            fetch('/api/listings'),
            fetch('/api/admin/reports')
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
        const response = await fetch(`/api/admin/users/${userId}/toggle-admin`, {
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
        const response = await fetch(`/api/admin/users/${userId}`, {
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
        const response = await fetch(`/api/admin/listings/${listingId}/toggle-active`, {
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
        const response = await fetch(`/api/admin/reports/${reportId}/resolve`, {
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
            response = await fetch(`/api/listings/${listingId}`, {
                method: 'PUT',
                body: formData
            });
        } else {
            // Create new listing
            response = await fetch('/api/listings', {
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

// Update the createListingCard function in script.js
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

// Add this function to script.js
async function deleteListing(listingId, event) {
    event.stopPropagation(); // Prevent any parent click events

    if (!confirm('Are you sure you want to delete this listing? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`/api/listings/${listingId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            // Show success message
            alert('Listing deleted successfully');

            // Reload the current page
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

// Update the viewListingDetails function in script.js
function viewListingDetails(id) {
    fetch(`/api/listings/${id}`)
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

// Add this function to script.js
async function showEditListingForm(listingId) {
    try {
        const response = await fetch(`/api/listings/${listingId}`);
        const listing = await response.json();

        if (response.ok) {
            // Populate the form with listing data
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

            // Show image preview if exists
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



document.getElementById('report-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const reportedUserId = document.getElementById('reported-user-id').value;
    const listingId = document.getElementById('reported-listing-id').value;
    const reason = document.getElementById('report-reason').value;

    try {
        const response = await fetch('/api/reports', {
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

document.querySelector('.close-modal')?.addEventListener('click', closeReportModal);

window.addEventListener('click', (e) => {
    if (e.target === document.getElementById('report-modal')) {
        closeReportModal();
    }
});