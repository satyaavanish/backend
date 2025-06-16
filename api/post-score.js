import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('MongoDB connected');
    }
  } catch (err) {
    console.error('MongoDB connection error:', err);
    throw err;
  }
};

const ScoreSchema = new mongoose.Schema({
  player: { type: String, required: true, unique: true },
  highScore: { type: Number, default: 0, min: 0 },
});

const Score = mongoose.models.Score || mongoose.model('Score', ScoreSchema);

// Allowed origins for CORS
const allowedOrigins = [
  'https://new-game-7g95qeu1x-avanishs-projects-3608432a.vercel.app',
  'https://new-game-dusky.vercel.app',
  'http://localhost:3000' // for development
];

export default async function handler(req, res) {
  // Set CORS headers dynamically
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed',
      message: 'Only POST requests are accepted' 
    });
  }

  try {
    // Validate Content-Type
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid content type',
        message: 'Content-Type must be application/json'
      });
    }

    await connectDB();
    
    // Validate request body
    const { player, score } = req.body;
    
    if (!player || typeof player !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid player name',
        message: 'Player name must be a non-empty string'
      });
    }

    if (typeof score !== 'number' || score < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid score',
        message: 'Score must be a positive number'
      });
    }

    // Process score update
    const existingScore = await Score.findOne({ player });
    
    if (!existingScore) {
      // New player record
      await Score.create({ player, highScore: score });
      console.log(`Created new record for player: ${player}`);
    } else if (score > existingScore.highScore) {
      // Update existing record
      existingScore.highScore = score;
      await existingScore.save();
      console.log(`Updated high score for player: ${player}`);
    }

    return res.status(200).json({ 
      success: true,
      message: 'Score processed successfully',
      updated: !!existingScore,
      highScore: Math.max(score, existingScore?.highScore || 0)
    });

  } catch (err) {
    console.error('Error in /api/post-score:', err);
    
    // Handle duplicate key errors (unique player constraint)
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Duplicate player',
        message: 'Player already exists'
      });
    }

    // Handle mongoose validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: err.message
      });
    }

    // Generic error response
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
    });
  }
}
