import React, { useState, useEffect } from 'react';
import axios from 'axios';

const App = () => {
  const [tournaments, setTournaments] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
      
      const [tournamentsRes, matchesRes] = await Promise.all([
        axios.get(`${API_URL}/api/v1/tournaments`),
        axios.get(`${API_URL}/api/v1/matches/live`)
      ]);

      setTournaments(tournamentsRes.data);
      setMatches(matchesRes.data.matches || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { label: 'Active Tournaments', value: tournaments.filter(t => t.status === 'active').length, icon: '🏆' },
    { label: 'Live Matches', value: matches.length, icon: '🔴' },
    { label: 'Total Teams', value: 24, icon: '👥' },
    { label: 'Monthly Revenue', value: 'RM 6,240', icon: '💰' }
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #10b981 0%, #0891b2 100%)',
        color: 'white',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '28px' }}>🏉 4Game Admin Dashboard</h1>
        <p style={{ margin: 0, opacity: 0.9 }}>Tournament Management Platform</p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '10px',
        padding: '20px',
        borderBottom: '2px solid #e0e0e0',
        backgroundColor: 'white'
      }}>
        {['overview', 'tournaments', 'matches'].map(tab => (
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
              color: activeTab === tab ? '#10b981' : '#666',
              fontSize: '14px'
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '20px' }}>
        {loading && <p style={{ textAlign: 'center', color: '#999' }}>Loading...</p>}

        {/* Overview Tab */}
        {activeTab === 'overview' && !loading && (
          <div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
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
                <h3 style={{ marginBottom: '15px', color: '#333' }}>🔴 Live Now</h3>
                {matches.length > 0 ? (
                  matches.map(match => (
                    <div key={match._id} style={{
                      padding: '12px',
                      borderBottom: '1px solid #eee',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                          {match.homeTeamName} vs {match.awayTeamName}
                        </div>
                        <div style={{ color: '#999', fontSize: '12px' }}>
                          {match.pitch}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>
                          {match.homeScore}—{match.awayScore}
                        </div>
                        <div style={{ color: '#ef4444', fontSize: '12px', fontWeight: 'bold' }}>
                          ● {match.minute}'
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
                <h3 style={{ marginBottom: '15px', color: '#333' }}>🏆 Recent Tournaments</h3>
                {tournaments.slice(0, 5).map(t => (
                  <div key={t._id} style={{
                    padding: '12px',
                    borderBottom: '1px solid #eee',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                        {t.name}
                      </div>
                      <div style={{ color: '#999', fontSize: '12px' }}>
                        {t.teamsRegistered.length} teams
                      </div>
                    </div>
                    <span style={{
                      background: '#10b981',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 'bold'
                    }}>
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tournaments Tab */}
        {activeTab === 'tournaments' && !loading && (
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '20px' }}>All Tournaments</h3>
            {tournaments.map(t => (
              <div key={t._id} style={{
                padding: '15px',
                borderBottom: '1px solid #eee',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{t.name}</div>
                  <div style={{ color: '#999', fontSize: '12px' }}>
                    {t.teamsRegistered.length} teams • {t.format} • {t.venue}
                  </div>
                </div>
                <span style={{
                  background: '#10b981',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}>
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Matches Tab */}
        {activeTab === 'matches' && !loading && (
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '20px' }}>Live & Recent Matches</h3>
            {matches.map(m => (
              <div key={m._id} style={{
                padding: '15px',
                borderBottom: '1px solid #eee'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <strong>{m.homeTeamName} vs {m.awayTeamName}</strong>
                  <span style={{
                    background: m.status === 'live' ? '#ef4444' : '#2979ff',
                    color: 'white',
                    padding: '3px 8px',
                    borderRadius: '3px',
                    fontSize: '11px'
                  }}>
                    {m.status}
                  </span>
                </div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#10b981',
                  marginBottom: '8px'
                }}>
                  {m.homeScore}—{m.awayScore}
                </div>
                <div style={{ color: '#999', fontSize: '12px' }}>
                  {m.venue} • {m.pitch} • {m.minute}'
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