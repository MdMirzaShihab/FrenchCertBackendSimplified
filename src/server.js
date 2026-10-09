// server.js

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { MONGO_URI } = require('./config/secret');
const app = require('./app');

// Load environment variables
dotenv.config();

// Connect to MongoDB Atlas
mongoose.connect(MONGO_URI)
.then(() => console.log('MongoDB Connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
