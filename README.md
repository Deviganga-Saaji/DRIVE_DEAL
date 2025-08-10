# DRIVE_DEAL

DriveDeal is a full-stack web application for buying and selling automobiles. It features user authentication, car listings management, favorites/wishlist functionality, and an admin dashboard.

**Features**

- **User Authentication**:
  - Secure JWT-based registration and login
  - Password hashing with bcrypt
  - Session management

- **Car Listings**:
  - Create, read, update, and delete car listings
  - Image upload for car photos
  - Detailed car information (make, model, year, price, etc.)

- **Search & Filter**:
  - Search by make/model
  - Filter by fuel type (Gasoline, Diesel, Electric)

- **User Features**:
  - Favorite listings
  - View seller contact information
  - Report suspicious listings/users

- **Admin Dashboard**:
  - Manage users (promote to admin, delete)
  - Moderate listings (activate/deactivate)
  - Handle user reports

## Technology Stack

**Frontend**:
- HTML5, CSS3, JavaScript (Vanilla)
- Responsive design with mobile-first approach

**Backend**:
- Node.js with Express.js
- SQLite database
- JWT authentication
- Multer for file uploads

**Steps to Set Up the Project**
1.	Initialize the Project: npm init -y   
2.	Install Dependencies: "npm install sqlite3 express" and "npm install jsonwebtoken express-validator"
3.	Start the Server: node server.js 

