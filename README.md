# Real-Time Messenger Application

A real-time messaging application built with Express.js and Socket.IO.

## Features

- Real-time messaging using Socket.IO
- User authentication (coming soon)
- Message history (coming soon)
- Group chat support (coming soon)

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/messenger
   JWT_SECRET=your_jwt_secret_key
   ```

## Running the Application

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Endpoints

- `GET /`: Welcome message
- More endpoints coming soon...
