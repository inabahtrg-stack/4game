import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const App = () => {
  const [tournaments, setTournaments] = useState([]);
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [formData, setFormData] = useState({});

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

  // useCallback to memoize fetchData function
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tournamentsRes, matchesRes] = await Promise.all([
        axios.get(`${API_URL}/api/v1/tournaments`),
        axios.get(`${API_URL}/api/v1/matches/live`)
      ]);

      setTournaments(tournamentsRes.data);
      setMatches(matchesRes.data.matches || []);
      
      if (selectedTournament) {
        const teamsRes = await axios.get(
          `${API_URL}/api/v1/tournaments/${selectedTournament}/teams`
        );
        setTeams(teamsRes.data.teams || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [API_URL, selectedTournament]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const createTournament = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/v1/tournaments`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFormData({});
      fetchData();
      alert('Tournament created successfully!');
    } catch (error) {
      alert('Error creating tournament: ' + error.message);
    }
  };

  const updateMatchScore = async (matchId) => {
    try {
      const homeScore = prompt('Home team score:');
      const awayScore = prompt('Away team score:');
      
      if (homeScore !== null && awayScore !== null) {
        await axios.put(`${API_URL}/api/v1/matches/${matchId}/score`, {
          homeScore: parseInt(homeScore),
          awayScore: parseInt(awayScore)
        });
        fetchData();
        alert('Score updated!');
      }
    } catch (error) {
      alert('Error updating score: ' + error.message);
    }
  };

  const stats = [
    { label: 'Total Tournaments', value: tournaments.length, icon: '🏆' },
    { label: 'Live Matches', value: matches.length, icon: '🔴' },
    { label: 'Total Teams', value: teams.length, icon: '👥' }
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #10b981 0%, #0891b2 100%)',
        color: 'white',
        padding: '25px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: '0 0 5px 0', fontSize: '28px' }}>🏉 4Game Admin</h1>
        <p style={{ margin: 0, opacity: 0.9 }}>Production Dashboard</p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '10px',
        padding: '20px',
        borderBottom: '2px solid #e0e0e0',
        backgroundColor: 'white',
        flexWrap: 'wrap'
      }}>
        {['overview', 'tournaments', 'matches', 'teams'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderBottom: activeTab === tab ? '3px solid #10b981' : 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontWeight: activeTab === tab ? 'bold' : 'normal',
              color: activeTab === tab ? '#10b981' : '#666'
            }}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        {loading && <p style={{ textAlign: 'center', color: '#999' }}>Loading...</p>}

        {/* OVERVIEW */}
        {activeTab === 'overview' && !loading && (
          <div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              marginBottom: '30px'
            }}>
              {stats.map((stat, i) => (
                <div key={i} style={{
                  background: 'white',
                  padding: '20px',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '30px', marginBottom: '10px' }}>{stat.icon}</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
                    {stat.value}
                  </div>
                  <div style={{ color: '#999', fontSize: '12px', marginTop: '5px' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px'
            }}>
              {/* Live Matches */}
              <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ marginBottom: '15px' }}>🔴 Live Matches</h3>
                {matches.length > 0 ? (
                  matches.map(m => (
                    <div key={m._id} style={{
                      padding: '12px',
                      borderBottom: '1px solid #eee',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: 'bold' }}>
                          {m.homeTeamName} vs {m.awayTeamName}
                        </div>
                        <div style={{ color: '#999', fontSize: '12px' }}>
                          {m.pitch}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>
                          {m.homeScore}—{m.awayScore}
                        </div>
                        <div style={{ color: '#ef4444', fontSize: '11px' }}>
                          {m.minute}'
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#999' }}>No live matches</p>
                )}
              </div>

              {/* Recent Tournaments */}
              <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ marginBottom: '15px' }}>🏆 Tournaments</h3>
                {tournaments.slice(0, 5).map(t => (
                  <div key={t._id} style={{
                    padding: '12px',
                    borderBottom: '1px solid #eee',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{t.name}</div>
                      <div style={{ color: '#999', fontSize: '12px' }}>
                        {t.teamsRegistered.length} teams
                      </div>
                    </div>
                    <span style={{
                      background: '#10b981',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '4px',
                      fontSize: '11px'
                    }}>
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TOURNAMENTS */}
        {activeTab === 'tournaments' && !loading && (
          <div>
            <div style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h3 style={{ marginBottom: '15px' }}>Create Tournament</h3>
              <form onSubmit={createTournament}>
                <div style={{ marginBottom: '10px' }}>
                  <input
                    type="text"
                    placeholder="Tournament Name"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '4px',
                      border: '1px solid #ddd',
                      marginBottom: '10px'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Venue"
                    value={formData.venue || ''}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '4px',
                      border: '1px solid #ddd',
                      marginBottom: '10px'
                    }}
                  />
                  <select
                    value={formData.format || ''}
                    onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '4px',
                      border: '1px solid #ddd',
                      marginBottom: '10px'
                    }}
                  >
                    <option value="">Select Format</option>
                    <option value="7-a-side">7-a-Side</option>
                    <option value="10-a-side">10-a-Side</option>
                    <option value="15-a-side">15-a-Side</option>
                  </select>
                  <button
                    type="submit"
                    style={{
                      background: '#10b981',
                      color: 'white',
                      padding: '10px 20px',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    Create Tournament
                  </button>
                </div>
              </form>
            </div>

            <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
              {tournaments.map(t => (
                <div key={t._id} style={{
                  padding: '15px',
                  borderBottom: '1px solid #eee',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{t.name}</div>
                    <div style={{ color: '#999', fontSize: '12px' }}>
                      {t.teamsRegistered.length} teams • {t.format} • {t.venue}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedTournament(t._id)}
                    style={{
                      background: '#2979ff',
                      color: 'white',
                      padding: '6px 12px',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MATCHES */}
        {activeTab === 'matches' && !loading && (
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '15px' }}>All Matches</h3>
            {matches.map(m => (
              <div key={m._id} style={{
                padding: '15px',
                borderBottom: '1px solid #eee'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <strong>{m.homeTeamName} vs {m.awayTeamName}</strong>
                  <span style={{
                    background: '#ef4444',
                    color: 'white',
                    padding: '3px 8px',
                    borderRadius: '3px',
                    fontSize: '11px'
                  }}>
                    {m.status}
                  </span>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981', marginBottom: '8px' }}>
                  {m.homeScore}—{m.awayScore}
                </div>
                <div style={{ color: '#999', fontSize: '12px', marginBottom: '10px' }}>
                  {m.venue} • {m.pitch} • {m.minute}'
                </div>
                <button
                  onClick={() => updateMatchScore(m._id)}
                  style={{
                    background: '#2979ff',
                    color: 'white',
                    padding: '6px 12px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}
                >
                  Update Score
                </button>
              </div>
            ))}
          </div>
        )}

        {/* TEAMS */}
        {activeTab === 'teams' && !loading && selectedTournament && (
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '15px' }}>Teams ({teams.length})</h3>
            {teams.map(t => (
              <div key={t._id} style={{
                padding: '15px',
                borderBottom: '1px solid #eee'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{t.name}</div>
                <div style={{ color: '#999', fontSize: '12px' }}>
                  {t.squad.length} players • {t.state} • {t.experience}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;