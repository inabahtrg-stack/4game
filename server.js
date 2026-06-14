const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

// ========== MOCK DATABASE ==========
const mockData = {
  tournaments: [
    {
      _id: 'trn_001',
      name: 'KL Rugby 7s 2026',
      format: '7-a-side',
      status: 'active',
      startDate: new Date('2026-06-20'),
      endDate: new Date('2026-06-21'),
      venue: 'Stadium Hang Jebat, Melaka',
      maxTeams: 16,
      bracketType: 'knockout',
      teamsRegistered: ['tm_001', 'tm_002', 'tm_003'],
      createdAt: new Date()
    }
  ],
  matches: [
    {
      _id: 'mtch_001',
      tournamentId: 'trn_001',
      homeTeamId: 'tm_001',
      awayTeamId: 'tm_002',
      homeTeamName: 'Selangor RC',
      awayTeamName: 'KL Warriors',
      homeScore: 14,
      awayScore: 7,
      status: 'live',
      startTime: new Date(),
      venue: 'Stadium Hang Jebat',
      pitch: 'Pitch 1',
      refereeId: 'ref_001',
      events: [
        { type: 'try', team: 'home', player: 'Ahmad Razif', minute: 5 },
        { type: 'conversion', team: 'home', minute: 6 }
      ],
      minute: 34,
      createdAt: new Date()
    }
  ],
  teams: [
    {
      _id: 'tm_001',
      name: 'Selangor RC',
      state: 'Selangor',
      experience: 'Advanced',
      contactPerson: 'Muhammad Azri',
      email: 'selangor@rugby.my',
      phone: '+60123456789',
      squad: [
        { playerId: 'p_001', name: 'Ahmad Razif', position: 'Wing', number: 5 },
        { playerId: 'p_002', name: 'Hassan Karim', position: 'Scrum-half', number: 9 }
      ],
      tournamentId: 'trn_001',
      registrationFee: 250,
      paymentStatus: 'paid',
      status: 'approved',
      createdAt: new Date()
    }
  ],
  weather: {
    current: {
      temp: 28,
      feelsLike: 32,
      humidity: 72,
      pressure: 1013,
      windSpeed: 12,
      windDirection: 'NW',
      rainChance: 10,
      condition: 'Partly Cloudy',
      visibility: 10,
      uvIndex: 8
    },
    forecast: [
      { time: '14:00', temp: 28, condition: '☀️', rainChance: 5 },
      { time: '15:00', temp: 27, condition: '⛅', rainChance: 10 },
      { time: '16:00', temp: 26, condition: '⛅', rainChance: 15 },
      { time: '17:00', temp: 24, condition: '🌧️', rainChance: 40 }
    ]
  }
};

// ========== SOCKET.IO REAL-TIME ==========
io.on('connection', (socket) => {
  console.log(`📡 User connected: ${socket.id}`);

  socket.on('join_match', (matchId) => {
    socket.join(`match_${matchId}`);
  });

  socket.on('score_update', (data) => {
    io.to(`match_${data.matchId}`).emit('score_updated', {
      matchId: data.matchId,
      homeScore: data.homeScore,
      awayScore: data.awayScore,
      minute: data.minute,
      timestamp: new Date()
    });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// ========== API ROUTES ==========

// Health Check
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime(),
    message: '🏉 4Game API running!'
  });
});

// TOURNAMENTS
app.get('/api/v1/tournaments', (req, res) => {
  res.json(mockData.tournaments);
});

app.get('/api/v1/tournaments/:id', (req, res) => {
  const tournament = mockData.tournaments.find(t => t._id === req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
  res.json(tournament);
});

app.post('/api/v1/tournaments', (req, res) => {
  const newTournament = {
    _id: 'trn_' + Date.now(),
    ...req.body,
    status: 'draft',
    teamsRegistered: [],
    createdAt: new Date()
  };
  mockData.tournaments.push(newTournament);
  res.status(201).json(newTournament);
});

app.put('/api/v1/tournaments/:id', (req, res) => {
  const tournament = mockData.tournaments.find(t => t._id === req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
  Object.assign(tournament, req.body);
  res.json(tournament);
});

// MATCHES
app.get('/api/v1/matches/live', (req, res) => {
  const liveMatches = mockData.matches.filter(m => m.status === 'live');
  res.json({ matches: liveMatches, total: liveMatches.length });
});

app.get('/api/v1/matches/:id', (req, res) => {
  const match = mockData.matches.find(m => m._id === req.params.id);
  if (!match) return res.status(404).json({ error: 'Match not found' });
  res.json(match);
});

app.put('/api/v1/matches/:id/score', (req, res) => {
  const match = mockData.matches.find(m => m._id === req.params.id);
  if (!match) return res.status(404).json({ error: 'Match not found' });
  
  match.homeScore = req.body.homeScore !== undefined ? req.body.homeScore : match.homeScore;
  match.awayScore = req.body.awayScore !== undefined ? req.body.awayScore : match.awayScore;
  match.minute = req.body.minute || match.minute;
  
  if (req.body.events) {
    match.events.push(...req.body.events);
  }
  
  res.json({ success: true, match });
});

// TEAMS
app.post('/api/v1/teams/register', (req, res) => {
  const newTeam = {
    _id: 'tm_' + Date.now(),
    ...req.body,
    status: 'pending',
    paymentStatus: 'pending',
    squad: [],
    createdAt: new Date()
  };
  mockData.teams.push(newTeam);
  res.status(201).json(newTeam);
});

app.get('/api/v1/tournaments/:tournamentId/teams', (req, res) => {
  const teams = mockData.teams.filter(t => t.tournamentId === req.params.tournamentId);
  res.json({ teams, total: teams.length });
});

app.get('/api/v1/teams/:id', (req, res) => {
  const team = mockData.teams.find(t => t._id === req.params.id);
  if (!team) return res.status(404).json({ error: 'Team not found' });
  res.json(team);
});

// STANDINGS
app.get('/api/v1/tournaments/:tournamentId/standings', (req, res) => {
  const standings = [
    { position: 1, teamName: 'Selangor RC', wins: 3, losses: 0, draws: 0, points: 9, for: 42, against: 14 },
    { position: 2, teamName: 'NS Rhinos', wins: 2, losses: 1, draws: 0, points: 6, for: 38, against: 28 },
    { position: 3, teamName: 'KL Warriors', wins: 1, losses: 2, draws: 0, points: 3, for: 24, against: 35 }
  ];
  res.json({ standings });
});

// WEATHER
app.get('/api/v1/weather/venue/:venueId', (req, res) => {
  res.json({
    venue: 'Stadium Hang Jebat, Melaka',
    ...mockData.weather,
    lastUpdate: new Date()
  });
});

app.get('/api/v1/weather/all-venues', (req, res) => {
  res.json([
    {
      venueId: 'venue_001',
      venueName: 'Stadium Hang Jebat, Melaka',
      ...mockData.weather
    }
  ]);
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🏉 4Game API running on port ${PORT}`);
  console.log(`📍 API URL: http://localhost:${PORT}/api/v1`);
  console.log(`✅ Server ready for production`);
  console.log(`${'='.repeat(50)}\n`);
});