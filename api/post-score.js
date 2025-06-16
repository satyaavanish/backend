import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
};

const ScoreSchema = new mongoose.Schema({
  player: { type: String, required: true, unique: true },
  highScore: { type: Number, default: 0 },
});

const Score = mongoose.models.Score || mongoose.model('Score', ScoreSchema);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  try {
    await connectDB();
    const { player, score } = req.body;

    if (!player || score === undefined) {
      return res.status(400).json({ error: 'Player name and score required' });
    }

    const existing = await Score.findOne({ player });
    if (!existing) {
      await new Score({ player, highScore: score }).save();
    } else if (score > existing.highScore) {
      existing.highScore = score;
      await existing.save();
    }

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
