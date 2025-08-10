require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Database setup
const db = new sqlite3.Database('./database.db');

// Create tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        phone TEXT,
        is_admin BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS listings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        make TEXT NOT NULL,
        model TEXT NOT NULL,
        year INTEGER NOT NULL,
        price REAL NOT NULL,
        mileage INTEGER,
        fuel_type TEXT,
        transmission TEXT,
        color TEXT,
        description TEXT,
        image_url TEXT,
        user_id INTEGER NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS favorites (
        user_id INTEGER NOT NULL,
        listing_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, listing_id),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(listing_id) REFERENCES listings(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reporter_id INTEGER NOT NULL,
        reported_user_id INTEGER NOT NULL,
        listing_id INTEGER,
        reason TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(reporter_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(reported_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(listing_id) REFERENCES listings(id) ON DELETE CASCADE
    )`);

    // Create admin user if not exists
    db.get("SELECT id FROM users WHERE email = 'admin@drivedeal.com'", (err, row) => {
        if (!row) {
            bcrypt.hash('admin123', 10, (err, hash) => {
                db.run(
                    "INSERT INTO users (username, email, password, is_admin) VALUES (?, ?, ?, ?)",
                    ['Admin', 'admin@drivedeal.com', hash, 1]
                );
            });
        }
    });
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-here',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Image upload setup
const upload = multer({
    dest: 'public/uploads/',
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Auth Endpoints
app.post('/api/register', async (req, res) => {
    const { username, email, password, phone } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email and password are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run(
            "INSERT INTO users (username, email, password, phone) VALUES (?, ?, ?, ?)",
            [username, email, hashedPassword, phone],
            function (err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(400).json({ error: 'Email already exists' });
                    }
                    return res.status(500).json({ error: 'Registration failed' });
                }
                res.json({ success: true });
            }
        );
    } catch (err) {
        res.status(500).json({ error: 'Server error during registration' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
        if (err || !user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            phone: user.phone,
            is_admin: user.is_admin
        };

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                is_admin: user.is_admin
            }
        });
    });
});

app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

app.get('/api/me', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    res.json(req.session.user);
});

// Listing Endpoints
app.get('/api/listings', (req, res) => {
    const { search, minYear, maxPrice, fuelType, limit } = req.query;
    let query = `SELECT l.*, u.username, u.phone FROM listings l 
                JOIN users u ON l.user_id = u.id 
                WHERE l.is_active = 1`;
    const params = [];

    if (search) {
        query += ` AND (make LIKE ? OR model LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
    }
    if (minYear) {
        query += ` AND year >= ?`;
        params.push(minYear);
    }
    if (maxPrice) {
        query += ` AND price <= ?`;
        params.push(maxPrice);
    }
    if (fuelType) {
        query += ` AND fuel_type = ?`;
        params.push(fuelType);
    }
    query += ` ORDER BY l.created_at DESC`;
    if (limit) {
        query += ` LIMIT ?`;
        params.push(limit);
    }

    db.all(query, params, (err, listings) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch listings' });
        res.json(listings);
    });
});

app.get('/api/listings/:id', (req, res) => {
    db.get(
        `SELECT l.*, u.username, u.phone, u.email FROM listings l 
        JOIN users u ON l.user_id = u.id 
        WHERE l.id = ?`,
        [req.params.id],
        (err, listing) => {
            if (err || !listing) {
                return res.status(404).json({ error: 'Listing not found' });
            }
            res.json(listing);
        }
    );
});

app.post('/api/listings', upload.single('image'), (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const { make, model, year, price, mileage, fuel_type, transmission, color, description } = req.body;

    if (!make || !model || !year || !price) {
        return res.status(400).json({ error: 'Required fields are missing' });
    }

    const listing = {
        user_id: req.session.user.id,
        make,
        model,
        year,
        price,
        mileage,
        fuel_type,
        transmission,
        color,
        description,
        image_url: imageUrl
    };

    db.run(
        `INSERT INTO listings 
        (user_id, make, model, year, price, mileage, fuel_type, transmission, color, description, image_url) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        Object.values(listing),
        function (err) {
            if (err) return res.status(500).json({ error: 'Failed to create listing' });
            res.json({ id: this.lastID, ...listing });
        }
    );
});

app.put('/api/listings/:id', upload.single('image'), (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : req.body.image_url;
    const { make, model, year, price, mileage, fuel_type, transmission, color, description } = req.body;

    if (!make || !model || !year || !price) {
        return res.status(400).json({ error: 'Required fields are missing' });
    }

    const listing = {
        make,
        model,
        year,
        price,
        mileage,
        fuel_type,
        transmission,
        color,
        description,
        image_url: imageUrl
    };

    db.run(
        `UPDATE listings SET 
        make = ?, model = ?, year = ?, price = ?, mileage = ?, 
        fuel_type = ?, transmission = ?, color = ?, description = ?, image_url = ?
        WHERE id = ? AND user_id = ?`,
        [...Object.values(listing), req.params.id, req.session.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: 'Failed to update listing' });
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Listing not found or not authorized' });
            }
            res.json({ success: true, ...listing });
        }
    );
});

app.delete('/api/listings/:id', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });

    db.run(
        'DELETE FROM listings WHERE id = ? AND user_id = ?',
        [req.params.id, req.session.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: 'Failed to delete listing' });
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Listing not found or not authorized' });
            }
            res.json({ success: true });
        }
    );
});

// Favorites Endpoints
app.get('/api/favorites', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });

    db.all(
        `SELECT l.*, u.username FROM listings l 
        JOIN favorites f ON l.id = f.listing_id
        JOIN users u ON l.user_id = u.id
        WHERE f.user_id = ?`,
        [req.session.user.id],
        (err, listings) => {
            if (err) return res.status(500).json({ error: 'Failed to fetch favorites' });
            res.json(listings);
        }
    );
});

app.post('/api/favorites', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });

    const { listing_id } = req.body;
    if (!listing_id) return res.status(400).json({ error: 'Listing ID is required' });

    db.run(
        'INSERT OR IGNORE INTO favorites (user_id, listing_id) VALUES (?, ?)',
        [req.session.user.id, listing_id],
        function (err) {
            if (err) return res.status(500).json({ error: 'Failed to add favorite' });
            res.json({ success: true });
        }
    );
});

app.delete('/api/favorites/:listingId', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });

    db.run(
        'DELETE FROM favorites WHERE user_id = ? AND listing_id = ?',
        [req.session.user.id, req.params.listingId],
        function (err) {
            if (err) return res.status(500).json({ error: 'Failed to remove favorite' });
            res.json({ success: true });
        }
    );
});

// Report Endpoints
app.post('/api/reports', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });

    const { reported_user_id, listing_id, reason } = req.body;
    if (!reported_user_id || !reason) {
        return res.status(400).json({ error: 'Reported user ID and reason are required' });
    }

    db.run(
        "INSERT INTO reports (reporter_id, reported_user_id, listing_id, reason) VALUES (?, ?, ?, ?)",
        [req.session.user.id, reported_user_id, listing_id || null, reason],
        function (err) {
            if (err) return res.status(500).json({ error: 'Failed to submit report' });
            res.json({ success: true });
        }
    );
});

// Admin Endpoints
app.get('/api/admin/users', (req, res) => {
    if (!req.session.user?.is_admin) return res.status(403).json({ error: 'Forbidden' });

    db.all('SELECT id, username, email, phone, is_admin FROM users', [], (err, users) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch users' });
        res.json(users);
    });
});

app.get('/api/admin/reports', (req, res) => {
    if (!req.session.user?.is_admin) return res.status(403).json({ error: 'Forbidden' });

    db.all(
        `SELECT r.*, 
         reporter.username as reporter_name,
         reported.username as reported_user_name,
         l.make as listing_make,
         l.model as listing_model
         FROM reports r
         JOIN users reporter ON r.reporter_id = reporter.id
         JOIN users reported ON r.reported_user_id = reported.id
         LEFT JOIN listings l ON r.listing_id = l.id
         ORDER BY r.created_at DESC`,
        [],
        (err, reports) => {
            if (err) return res.status(500).json({ error: 'Failed to fetch reports' });
            res.json(reports);
        }
    );
});

app.post('/api/admin/users/:id/toggle-admin', (req, res) => {
    if (!req.session.user?.is_admin) return res.status(403).json({ error: 'Forbidden' });

    db.run(
        'UPDATE users SET is_admin = NOT is_admin WHERE id = ? AND id != ?',
        [req.params.id, req.session.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: 'Failed to update user' });
            if (this.changes === 0) {
                return res.status(400).json({ error: 'Cannot modify your own admin status' });
            }
            res.json({ success: true });
        }
    );
});

app.delete('/api/admin/users/:id', (req, res) => {
    if (!req.session.user?.is_admin) return res.status(403).json({ error: 'Forbidden' });

    db.run(
        'DELETE FROM users WHERE id = ? AND id != ?',
        [req.params.id, req.session.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: 'Failed to delete user' });
            if (this.changes === 0) {
                return res.status(400).json({ error: 'Cannot delete yourself' });
            }
            res.json({ success: true });
        }
    );
});

app.post('/api/admin/listings/:id/toggle-active', (req, res) => {
    if (!req.session.user?.is_admin) return res.status(403).json({ error: 'Forbidden' });

    db.run(
        'UPDATE listings SET is_active = NOT is_active WHERE id = ?',
        [req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: 'Failed to update listing' });
            res.json({ success: true });
        }
    );
});

app.post('/api/admin/reports/:id/resolve', (req, res) => {
    if (!req.session.user?.is_admin) return res.status(403).json({ error: 'Forbidden' });

    db.run(
        "UPDATE reports SET status = 'resolved' WHERE id = ?",
        [req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: 'Failed to resolve report' });
            res.json({ success: true });
        }
    );
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);

    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: 'File upload error: ' + err.message });
    } else if (err) {
        return res.status(500).json({ error: 'Something went wrong!' });
    }

    next();
});

// Start server
app.listen(PORT, () => {
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync('public/uploads')) {
        fs.mkdirSync('public/uploads', { recursive: true });
    }
    console.log(`Server running on http://localhost:${PORT}`);
});