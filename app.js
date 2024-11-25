const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3001",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors({
    origin: "http://localhost:3001",
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Store data in memory (in a production app, this would be in a database)
const messages = new Map();
const onlineUsers = new Map(); // Maps socket ID to username
const userSockets = new Map(); // Maps username to socket ID
const users = new Map(); // Store user credentials (in production, use a database)

// Authentication routes
app.post('/api/auth/register', async (req, res) => {
    console.log('Registration request received:', req.body);
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            console.log('Missing username or password');
            return res.status(400).json({ message: 'Username and password are required' });
        }

        if (users.has(username)) {
            console.log('Username already exists:', username);
            return res.status(400).json({ message: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        users.set(username, hashedPassword);
        console.log('User registered successfully:', username);

        const token = jwt.sign({ username }, process.env.JWT_SECRET || 'your-secret-key');
        res.status(201).json({ token, message: 'Registration successful' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Error creating user' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = users.get(username);

        if (!hashedPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isValid = await bcrypt.compare(password, hashedPassword);
        if (!isValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ username }, process.env.JWT_SECRET || 'your-secret-key');
        res.json({ token });
    } catch (error) {
        res.status(500).json({ message: 'Error logging in' });
    }
});

// Basic route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the Messenger API' });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('A user connected');

    // Handle user login
    socket.on('user_connected', (username) => {
        onlineUsers.set(socket.id, username);
        userSockets.set(username, socket.id);
        
        // Broadcast user's online status to friends
        socket.broadcast.emit('friend-status-update', {
            handle: username,
            online: true,
            lastActive: new Date()
        });
        
        // Send the current online users to the newly connected user
        const onlineFriends = Array.from(onlineUsers.values());
        socket.emit('online-friends', onlineFriends);
    });

    socket.on('message', (data) => {
        // Generate a unique ID for the message
        const messageId = Date.now().toString();
        const messageData = {
            ...data,
            id: messageId,
            timestamp: new Date(),
            edited: false
        };
        
        // Store the message
        messages.set(messageId, messageData);
        
        // Broadcast the message to all connected clients
        io.emit('message', messageData);
    });

    socket.on('editMessage', (data) => {
        const { messageId, newContent } = data;
        const message = messages.get(messageId);
        
        if (message) {
            message.content = newContent;
            message.edited = true;
            message.editedAt = new Date();
            messages.set(messageId, message);
            
            // Broadcast the edited message
            io.emit('messageEdited', message);
        }
    });

    socket.on('deleteMessage', (messageId) => {
        if (messages.has(messageId)) {
            messages.delete(messageId);
            // Broadcast the deletion
            io.emit('messageDeleted', messageId);
        }
    });

    socket.on('typing', (username) => {
        socket.broadcast.emit('typing', username);
    });

    socket.on('stopTyping', (username) => {
        socket.broadcast.emit('stopTyping', username);
    });

    socket.on('disconnect', () => {
        const username = onlineUsers.get(socket.id);
        if (username) {
            // Broadcast user's offline status to friends
            socket.broadcast.emit('friend-status-update', {
                handle: username,
                online: false,
                lastActive: new Date()
            });
            
            onlineUsers.delete(socket.id);
            userSockets.delete(username);
        }
        console.log('User disconnected');
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`WebSocket server is ready for connections`);
});

module.exports = { app, io };