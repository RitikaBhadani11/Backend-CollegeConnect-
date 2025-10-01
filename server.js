
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const http = require("http");
const socketIo = require("socket.io");

dotenv.config();

const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const announcementRoutes = require("./routes/announcementRoutes");
const achievementRoutes = require("./routes/achievementsRoutes");
const eventsRoutes = require("./routes/eventsRoutes");
const postRoutes = require("./routes/postRoutes");
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");
const jobRoutes = require("./routes/jobRoutes");
const eventRecommendationRoutes = require("./routes/eventRecommendationRoutes");
const followRoutes = require("./routes/followRoutes");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware


// Enable CORS before all routes
app.use(cors({
  origin: [
    'https://collegeconnect-frontend-y1w5.onrender.com',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Handle preflight requests
app.options('*', cors());

app.use(morgan("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// Root route
// Root route - UPDATED WITH COMPLETE ENDPOINTS
app.get("/", (req, res) => {
  res.json({
    message: "🚀 CollegeConnect Backend API is Running!",
    status: "success", 
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: "/api/auth",
      profiles: "/api/profiles",
      announcements: "/api/announcements",
      achievements: "/api/achievements",
      events: "/api/events",
      posts: "/api/posts",
      users: "/api/users",
      messages: "/api/messages",
      jobs: "/api/jobs",
      event_recommendations: "/api/event-recommendations",
      follow: "/api/users/follow",
      test: "/api/test",
      health: "/health"
    },
    total_endpoints: 12
  });
});

// Static file serving
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));
app.use("/uploads/profile", express.static(path.join(__dirname, "public", "uploads", "profile")));
app.use("/uploads/cover", express.static(path.join(__dirname, "public", "uploads", "cover")));

// MongoDB Connection
// MongoDB Connection - SINGLE CONNECTION
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000, // 30 seconds
  socketTimeoutMS: 45000, // 45 seconds
})
.then(() => console.log("✅ MongoDB Connected Successfully"))
.catch((err) => {
  console.error("❌ MongoDB connection error:", err.message);
  console.log("💡 If data is working, this might be a temporary issue");
});

// MongoDB connection event handlers
mongoose.connection.on('connected', () => {
  console.log('🟢 MongoDB connected - ready for queries');
});

mongoose.connection.on('error', (err) => {
  console.log('🔴 MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🟡 MongoDB disconnected');
});
// API Routes

app.get("/api/test", (req, res) => {
  res.json({ message: "Server is running correctly", timestamp: new Date().toISOString() });
});
// In your server.js - add this route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});
app.use("/api/auth", authRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/achievements", achievementRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/event-recommendations", eventRecommendationRoutes);
app.use("/api/users", followRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(500).json({
    success: false,
    message: "Server error",
    error: process.env.NODE_ENV === "development" ? err.message : "An unexpected error occurred",
  });
});

// Socket.io Configuration
io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("join", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their room`);
  });

  socket.on("sendMessage", async (data) => {
    try {
      const { message, conversationId, recipientId } = data;

      io.to(recipientId).emit("newMessage", {
        message,
        conversationId,
      });

      io.to(recipientId).emit("messageDelivered", {
        messageId: message._id,
      });
    } catch (error) {
      console.error("Error handling message:", error);
    }
  });

  socket.on("markAsRead", async (data) => {
    try {
      const { messageIds, senderId } = data;

      io.to(senderId).emit("messagesRead", {
        messageIds,
      });
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Start the server
const PORT = process.env.PORT || 5005;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Test endpoint: http://localhost:${PORT}/api/test`);
});
