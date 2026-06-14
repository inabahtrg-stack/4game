const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const http = require('http');
const socketIo = require('socket.io');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
});

app.use(cors());
app.use(express.json());

// ========== DATABASE CONNECTION ==========
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ MongoDB connected successfully');
}).catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
});

// ========== SCHEMAS ==========
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: String,
  role: { type: String, enum: ['player', 'referee', 'organizer', 'admin'], default: 'player' },
  phone: String,
  createdAt: { type: Date, default: Date.now }
});

const tournamentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  format: String,
  description: String,
  status: { type: String, enum: ['draft', 'registration', 'active', 'completed'], default: 'draft' },
  startDate: Date,
  endDate: Date,
  venue: String,
  maxTeams: Number,
  bracketType: String,
  teamsRegistered: [mongoose.Schema.Types.ObjectId],
  createdBy: mongoose.Schema.Types.ObjectId,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const matchSchema = new mongoose.Schema({
  tournamentId: mongoose.Schema.Types.ObjectId,
  homeTeamId: mongoose.Schema.Types.ObjectId,
  awayTeamId: mongoose.Schema.Types.ObjectId,
  homeTeamName: String,
  awayTeamName: String,
  homeScore: { type: Number, default: 0 },
  awayScore: { type: Number, default: 0 },
  status: { type: String, enum: ['scheduled', 'live', 'completed'], default: 'scheduled' },
  startTime: Date,
  venue: String,
  pitch: String,
  refereeId: mongoose.Schema.Types.ObjectId,
  events: [{
    type: { type: String, enum: ['try', 'conversion', 'penalty', 'drop-goal', 'yellow-card', 'red-card'] },
    team: String,
    player: String,
    minute: Number,
    timestamp: { type: Date, default: Date.now }
  }],
  minute: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  state: String,
  experience: String,
  contactPerson: String,
  email: String,
  phone: String,
  squad: [{
    playerId: mongoose.Schema.Types.ObjectId,
    name: String,
    position: String,
    number: Number
  }],
  tournamentId: mongoose.Schema.Types.ObjectId,
  registrationFee: Number,
  paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const weatherSchema = new mongoose.Schema({
  venueId: String,
  venueName: String,
  latitude: Number,
  longitude: Number,
  current: {
    temp: Number,
    feelsLike: Number,
    humidity: Number,
    pressure: Number,
    windSpeed: Number,
    windDirection: String,
    rainChance: Number,
    condition: String,
    visibility: Number,
    uvIndex: Number
  },
  forecast: [{
    time: String,
    temp: Number,
    condition: String,
    rainChance: Number
  }],
  lastUpdate: { type: Date, default: Date.now }
});

// ========== MODELS ==========
const User = mongoose.model('User', userSchema);
const Tournament = mongoose.model('Tournament', tournamentSchema);
const Match = mongoose.model('Match', matchSchema);
const Team = mongoose.model('Team', teamSchema);
const Weather = mongoose.model('Weather', weatherSchema);

// ========== MIDDLEWARE ==========
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// ========== AUTHENTICATION ROUTES ==========

// Register
app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({
      email,
      password: hashedPassword,
      name,
      role: role || 'player'
    });
    
    await user.save();
    
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: user._id, email: user.email, name: user.name, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'User not found' });
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Invalid password' });
    
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, email: user.email, name: user.name, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== TOURNAMENT ROUTES ==========

// Get all tournaments
app.get('/api/v1/tournaments', async (req, res) => {
  try {
    const tournaments = await Tournament.find().populate('createdBy', 'name email');
    res.json(tournaments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single tournament
app.get('/api/v1/tournaments/:id', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('teamsRegistered');
    
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
    res.json(tournament);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create tournament
app.post('/api/v1/tournaments', authenticateToken, async (req, res) => {
  try {
    const tournament = new Tournament({
      ...req.body,
      createdBy: req.user.userId,
      status: 'draft'
    });
    
    await tournament.save();
    res.status(201).json(tournament);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update tournament
app.put('/api/v1/tournaments/:id', authenticateToken, async (req, res) => {
  try {
    const tournament = await Tournament.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
    res.json(tournament);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get standings
app.get('/api/v1/tournaments/:tournamentId/standings', async (req, res) => {
  try {
    const matches = await Match.find({
      tournamentId: req.params.tournamentId,
      status: 'completed'
    });
    
    const standings = {};
    
    matches.forEach(match => {
      if (!standings[match.homeTeamName]) {
        standings[match.homeTeamName] = { teamName: match.homeTeamName, wins: 0, losses: 0, points: 0, for: 0, against: 0 };
      }
      if (!standings[match.awayTeamName]) {
        standings[match.awayTeamName] = { teamName: match.awayTeamName, wins: 0, losses: 0, points: 0, for: 0, against: 0 };
      }
      
      standings[match.homeTeamName].for += match.homeScore;
      standings[match.homeTeamName].against += match.awayScore;
      standings[match.awayTeamName].for += match.awayScore;
      standings[match.awayTeamName].against += match.homeScore;
      
      if (match.homeScore > match.awayScore) {
        standings[match.homeTeamName].wins++;
        standings[match.homeTeamName].points += 3;
        standings[match.awayTeamName].losses++;
      } else if (match.awayScore > match.homeScore) {
        standings[match.awayTeamName].wins++;
        standings[match.awayTeamName].points += 3;
        standings[match.homeTeamName].losses++;
      }
    });
    
    const sorted = Object.values(standings)
      .sort((a, b) => b.points - a.points)
      .map((team, index) => ({ ...team, position: index + 1 }));
    
    res.json({ standings: sorted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== MATCH ROUTES ==========

// Get live matches
app.get('/api/v1/matches/live', async (req, res) => {
  try {
    const matches = await Match.find({ status: 'live' });
    res.json({ matches, total: matches.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all matches for tournament
app.get('/api/v1/tournaments/:tournamentId/matches', async (req, res) => {
  try {
    const matches = await Match.find({ tournamentId: req.params.tournamentId });
    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single match
app.get('/api/v1/matches/:id', async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    res.json(match);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create match
app.post('/api/v1/matches', authenticateToken, async (req, res) => {
  try {
    const match = new Match(req.body);
    await match.save();
    res.status(201).json(match);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update match score (Referee)
app.put('/api/v1/matches/:id/score', async (req, res) => {
  try {
    const match = await Match.findByIdAndUpdate(
      req.params.id,
      {
        homeScore: req.body.homeScore,
        awayScore: req.body.awayScore,
        minute: req.body.minute,
        $push: { events: req.body.events || [] }
      },
      { new: true }
    );
    
    if (!match) return res.status(404).json({ error: 'Match not found' });
    
    // Broadcast via Socket.IO
    io.emit('match_updated', match);
    
    res.json({ success: true, match });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// End match
app.post('/api/v1/matches/:id/end', async (req, res) => {
  try {
    const match = await Match.findByIdAndUpdate(
      req.params.id,
      { status: 'completed' },
      { new: true }
    );
    
    if (!match) return res.status(404).json({ error: 'Match not found' });
    
    io.emit('match_completed', match);
    
    res.json({ success: true, match });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== TEAM ROUTES ==========

// Register team
app.post('/api/v1/teams/register', async (req, res) => {
  try {
    const team = new Team(req.body);
    await team.save();
    
    // Add team to tournament
    if (req.body.tournamentId) {
      await Tournament.findByIdAndUpdate(
        req.body.tournamentId,
        { $push: { teamsRegistered: team._id } }
      );
    }
    
    res.status(201).json(team);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get teams for tournament
app.get('/api/v1/tournaments/:tournamentId/teams', async (req, res) => {
  try {
    const teams = await Team.find({ tournamentId: req.params.tournamentId });
    res.json({ teams, total: teams.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single team
app.get('/api/v1/teams/:id', async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ error: 'Team not found' });
    res.json(team);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update team
app.put('/api/v1/teams/:id', async (req, res) => {
  try {
    const team = await Team.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    if (!team) return res.status(404).json({ error: 'Team not found' });
    res.json(team);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== WEATHER ROUTES ==========

app.get('/api/v1/weather/venue/:venueId', async (req, res) => {
  try {
    const weather = await Weather.findOne({ venueId: req.params.venueId });
    
    if (!weather) {
      return res.json({
        venue: 'Stadium Hang Jebat, Melaka',
        current: {
          temp: 28,
          feelsLike: 32,
          humidity: 72,
          windSpeed: 12,
          rainChance: 10,
          condition: 'Partly Cloudy'
        },
        forecast: []
      });
    }
    
    res.json(weather);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== SOCKET.IO EVENTS ==========

io.on('connection', (socket) => {
  console.log(`📡 User connected: ${socket.id}`);

  socket.on('join_match', (matchId) => {
    socket.join(`match_${matchId}`);
  });

  socket.on('score_update', (data) => {
    io.to(`match_${data.matchId}`).emit('score_updated', {
      ...data,
      timestamp: new Date()
    });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// ========== HEALTH CHECK ==========

app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// ========== ERROR HANDLING ==========

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ========== START SERVER ==========

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🏉 4Game API running on port ${PORT}`);
  console.log(`📍 API URL: http://localhost:${PORT}/api/v1`);
  console.log(`✅ Server ready for production`);
  console.log(`${'='.repeat(60)}\n`);
});

module.exports = app;