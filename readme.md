# 🎓 CampusConnect

CampusConnect is a **full-stack mobile application** designed to solve everyday problems on a college campus by combining a **Lost & Found system** with a **Campus Event Board**.

Built with **React Native (Expo Router)** for the frontend and **Node.js, Express, and MongoDB** for the backend, CampusConnect provides students with a secure platform to report lost or found items, discover campus events, and connect with other verified students.

---

## 📱 Features

### 🔍 Lost & Found System

Students can:

* Report lost items
* Report found items
* Add item descriptions and details
* Upload photo evidence using the device camera
* Select the location where the item was lost or found
* Use GPS to capture their current location
* Convert coordinates into readable addresses using reverse geocoding
* View lost and found reports
* Contact the finder or owner
* Update or delete their own reports

---

### 📸 Camera Integration

CampusConnect uses the device camera to allow users to:

* Capture photos of lost items
* Capture photos of found items
* Preview captured images
* Attach images to reports

This provides visual evidence and makes identifying items easier.

---

### 📍 Location Integration

The application uses location services to:

* Get the user's current location
* Capture latitude and longitude
* Tag the location where an item was lost or found
* Convert coordinates into readable addresses using reverse geocoding

---

### 🤝 Smart Match Suggestions

CampusConnect includes a smart match-suggestion system.

When a student creates a lost or found report, the system can identify potentially related reports based on relevant item information.

For example:

```text
Lost Report:
Black Wallet near Library

        ↓

Possible Match

        ↓

Found Report:
Black Wallet found near Library
```

This helps students recover lost items faster.

---

## 📅 Campus Event Board

Students can browse upcoming campus events.

Features include:

* View upcoming events
* View event details
* RSVP for events
* See live attendee counts
* Track campus activities in one place

---

## 🔐 Authentication & Security

CampusConnect includes authentication and authorization features such as:

* Student registration
* Login and authentication
* JWT-based authentication
* Protected routes
* Authorization for user-specific actions
* College email verification
* Restricted access for verified campus members
* Basic student ID verification workflow

The goal is to keep the platform exclusive to genuine college students.

---

## 👥 Contact Features

Users can connect with the finder or owner of an item through in-app contact options.

This helps students communicate directly when a potential match is found.

---

## 🛠️ Tech Stack

### Frontend

* React Native
* Expo
* Expo Router
* JavaScript / TypeScript
* Axios

### Backend

* Node.js
* Express.js
* MongoDB
* Mongoose

### Authentication

* JWT
* Password hashing

### Device APIs

* Camera
* Location
* Reverse Geocoding
* Contacts

---

## 🏗️ Project Architecture

```text
CampusConnect/
│
├── frontend/
│   │
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login
│   │   │   └── register
│   │   │
│   │   ├── (tabs)/
│   │   │   ├── home
│   │   │   ├── lost-found
│   │   │   ├── events
│   │   │   └── profile
│   │   │
│   │   └── item/
│   │
│   ├── components/
│   │
│   ├── services/
│   │
│   ├── hooks/
│   │
│   └── context/
│
└── backend/
    │
    ├── src/
    │   ├── controllers/
    │   ├── models/
    │   ├── routes/
    │   ├── middleware/
    │   ├── services/
    │   └── config/
    │
    └── server.js
```

---

# 🔄 Application Flow

## Lost & Found Flow

```text
Student Login
      ↓
Create Lost/Found Report
      ↓
Add Item Details
      ↓
Capture Photo
      ↓
Add Location
      ↓
Submit Report
      ↓
Store Data in Database
      ↓
Smart Match Suggestions
      ↓
Connect Owner and Finder
```

---

## Event Flow

```text
Student Login
      ↓
Browse Events
      ↓
Select Event
      ↓
View Event Details
      ↓
RSVP
      ↓
Attendee Count Updates
```

---

# 🔌 REST API Features

The backend provides RESTful APIs for:

### Authentication

```text
POST   /api/auth/register
POST   /api/auth/login
```

### Lost & Found

```text
GET    /api/items
POST   /api/items
GET    /api/items/:id
PUT    /api/items/:id
DELETE /api/items/:id
```

### Events

```text
GET    /api/events
POST   /api/events
GET    /api/events/:id
PUT    /api/events/:id
DELETE /api/events/:id
```

### RSVP

```text
POST   /api/events/:id/rsvp
```

---

# ⚙️ Installation

## 1. Clone the Repository

```bash
git clone https://github.com/Chiragprajapat003/CampusConnect.git
```

Move into the project directory:

```bash
cd CampusConnect
```

---

## 2. Install Frontend Dependencies

```bash
cd frontend
npm install
```

Start the Expo application:

```bash
npx expo start
```

---

## 3. Install Backend Dependencies

Open another terminal:

```bash
cd backend
npm install
```

Start the backend server:

```bash
npm run dev
```

---

# 🔐 Environment Variables

Create a `.env` file inside the backend directory.

Example:

```env
PORT=5000

MONGODB_URI=your_mongodb_connection_string

JWT_SECRET=your_secret_key
```

⚠️ Never upload your `.env` file to GitHub.

Add it to `.gitignore`:

```text
.env
```

---

# 📱 Key Concepts Demonstrated

This project demonstrates practical implementation of:

* Full-stack mobile development
* Authentication and authorization
* JWT authentication
* RESTful API development
* MongoDB database integration
* CRUD operations
* Camera integration
* Image uploads
* Location services
* Reverse geocoding
* Contact integration
* File handling
* Protected routes
* Smart match suggestions
* Event RSVP system
* State management
* Loading states
* Error handling
* Empty states
* Real-world mobile UI/UX

---

# 🎯 Project Goal

CampusConnect is designed to be more than a generic CRUD application.

It solves real problems that students face on a college campus:

* Losing personal belongings
* Finding owners of lost items
* Discovering campus events
* Connecting with other verified students

The project combines multiple real-world mobile development concepts into one practical application.

---

# 🚀 Future Improvements

Possible future features include:

* Push notifications
* Real-time chat between students
* AI-powered item matching
* Image-based item recognition
* Advanced event filtering
* Event reminders
* Admin dashboard
* Report moderation
* QR-based student verification
* Real-time notifications using Socket.io
* Dark mode
* Offline support

---

# 👨‍💻 Author

**Chirag Prajapat**

GitHub: https://github.com/Chiragprajapat003

---

## ⭐ Support

If you found this project useful, consider giving the repository a **star** on GitHub.
