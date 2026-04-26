# Tulona - Banking Product Comparison Platform

A comprehensive web platform for comparing banking products and services. Users can explore different banking products, view detailed comparisons, and make informed financial decisions.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Admin Panel](#admin-panel)
- [Development](#development)

## ✨ Features

### User Features
- **User Authentication**: Sign up, login, and password reset with email verification
- **Google OAuth Integration**: Seamless login with Google accounts
- **Product Comparison**: Compare banking products side-by-side
- **Product Filtering**: Filter products by category and specifications
- **Detailed Information**: View comprehensive product details and specifications
- **Audit Logs**: Track user activity and changes
- **Profile Management**: Manage user profile and account settings
- **Banking Services**: Explore various banking services (loans, deposits, credit cards, etc.)

### Admin Features
- **Data Entry Panel**: Add and manage banking products
- **Operator Management**: Manage data operators and their permissions
- **Audit Logs**: Monitor all system activities and changes
- **Product Categories**: Manage product categories
- **Draft Management**: Create and manage product drafts before publishing
- **Password Management**: Reset operator passwords

## 🛠 Tech Stack

### Backend
- **Framework**: Node.js with Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Email Service**: Nodemailer
- **API Security**: CORS, Helmet, Rate Limiting
- **Validation**: Validator.js

### Frontend
- **Framework**: React 18.2.0
- **Build Tool**: Vite 5.0.8
- **Routing**: React Router DOM 6.20.0
- **HTTP Client**: Axios
- **Authentication**: Google OAuth 2.0
- **Charts**: Chart.js with react-chartjs-2
- **Styling**: CSS

## 📁 Project Structure

```
tulona/
├── backend/                          # Express.js backend
│   ├── config/
│   │   └── database.js              # PostgreSQL configuration
│   ├── database/
│   │   ├── schema.sql               # Database schema
│   │   ├── seed.sql                 # Sample data
│   │   └── setup.js                 # Database initialization
│   ├── services/
│   │   ├── emailService.js          # Email functionality
│   │   └── aiAnswerService.js       # AI answer generation
│   ├── server.js                    # Main server file
│   └── package.json
│
├── frontend/                         # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/               # Admin-specific components
│   │   │   ├── AuthModal.jsx        # Login/Signup modal
│   │   │   ├── Navbar.jsx           # Navigation bar
│   │   │   ├── ProductsTable.jsx    # Products display
│   │   │   └── ...
│   │   ├── pages/
│   │   │   ├── HomePage.jsx         # Home page
│   │   │   ├── ProfilePage.jsx      # User profile
│   │   │   ├── AdminDataEntryPage.jsx # Admin data entry
│   │   │   └── ...
│   │   ├── context/
│   │   │   └── AuthContext.jsx      # Authentication context
│   │   ├── services/
│   │   │   ├── api.js               # API client
│   │   │   └── ...
│   │   ├── App.jsx                  # Main app component
│   │   └── main.jsx                 # Entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── admin/                            # Admin panel (separate deployment)
│   ├── backend/                     # Admin-specific backend
│   └── frontend/                    # Admin-specific frontend
│
└── README.md
```

## 📦 Prerequisites

- **Node.js** (v14 or higher)
- **npm** (v6 or higher)
- **PostgreSQL** (v12 or higher)
- **Environment Variables**: `.env` file configured (see Configuration section)

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd SPL-2
```

### 2. Install Backend Dependencies
```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

### 4. Set Up Database
```bash
cd backend
npm run setup-db
```

## ⚙️ Configuration

### Backend Configuration
Create a `.env` file in the `backend/` directory:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tulona_db
DB_USER=your_postgres_user
DB_PASSWORD=your_postgres_password

# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h

# Email Service
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_APP_PASSWORD=your-app-specific-password

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Admin
ADMIN_BACKEND_PORT=3001
ADMIN_DEFAULT_PASSWORD=admin123
```

### Frontend Configuration
Create a `.env` file in the `frontend/` directory:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

## ▶️ Running the Application

### Development Mode

**Terminal 1 - Backend Server**
```bash
cd backend
npm run dev
```
Server runs on: `http://localhost:3000`

**Terminal 2 - Frontend Server**
```bash
cd frontend
npm run dev
```
Application runs on: `http://localhost:5173`

### Production Mode

**Backend**
```bash
cd backend
npm start
```

**Frontend**
```bash
cd frontend
npm run build
npm run preview
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/google-login` - Google OAuth login
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/reset-password` - Request password reset
- `POST /api/auth/confirm-reset` - Confirm password reset

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product details
- `GET /api/products/category/:category` - Get products by category
- `POST /api/products` - Add new product (Admin only)
- `PUT /api/products/:id` - Update product (Admin only)
- `DELETE /api/products/:id` - Delete product (Admin only)

### User Profile
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/change-password` - Change password

### Admin Operations
- `GET /api/admin/operators` - Get all operators
- `POST /api/admin/operators` - Create new operator
- `PUT /api/admin/operators/:id` - Update operator
- `GET /api/admin/audit-logs` - Get audit logs
- `GET /api/admin/drafts` - Get product drafts

## 👨‍💼 Admin Panel

The admin panel is located in the `admin/` directory and provides:

- **Data Entry Interface**: Add and edit banking products
- **Operator Management**: Create and manage operator accounts
- **Audit Logs**: View all system activities
- **Draft Management**: Create and review drafts before publishing
- **Category Management**: Manage product categories

### Admin Access
- Navigate to: `http://localhost:5000` (if running separately)
- Default credentials are configured in `.env`

## 🔧 Development

### Available Scripts

**Backend**
```bash
npm start          # Run production server
npm run dev        # Run development server with auto-reload
npm run setup-db   # Initialize database
npm test           # Run tests
```

**Frontend**
```bash
npm run dev        # Run development server
npm run build      # Build for production
npm run preview    # Preview production build
```

### Database Management

**View Database Schema**
```bash
psql -U your_username -d tulona_db -f backend/database/schema.sql
```

**Reset Database**
```bash
npm run setup-db
```

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcryptjs
- CORS protection
- Helmet.js for HTTP headers
- Rate limiting on API endpoints
- Input validation with Validator.js
- SQL injection prevention with parameterized queries

## 📝 Sample Data

Sample banking products and data are included in `backend/database/seed.sql`. Run the database setup to load sample data:

```bash
npm run setup-db
```

## 📧 Email Service

The application uses Nodemailer for sending emails:
- **OTP Verification**: Sent during registration
- **Welcome Emails**: Sent after successful signup
- **Password Reset**: Password reset confirmation emails

Configure Gmail App Password in `.env` for email functionality.

## 🤝 Contributing

1. Create a new branch for your feature
2. Make your changes
3. Submit a pull request with a clear description

## 📄 License

ISC License

## 📧 Support

For issues or questions, please contact the development team or create an issue in the repository.

---


