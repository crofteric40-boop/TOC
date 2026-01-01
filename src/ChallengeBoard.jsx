import React, { useState } from 'react';
import { Trophy, Clock, CheckCircle, XCircle, Swords } from 'lucide-react';

function ChallengeBoard({ 
  players, 
  challenges, 
  currentPlayerId, 
  onCreateChallenge,
  onAcceptChallenge,
  onDeclineChallenge,
  onRecordResult,
  getEligibleOpponents 
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState(null);

  // Get player by ID
  const getPlayer = (id) => players.find(p => p.id === id);
  const getPlayerRank = (id) => players.findIndex(p => p.id === id) + 1;

  // Filter challenges
  const myChallenges = challenges.filter(c => c.challenger_id === currentPlayerId && c.status === 'pending');
  const challengesToMe = challenges.filter(c => c.challenged_id === currentPlayerId && c.status === 'pending');
  const activeMatches = challenges.filter(c => 
    (c.challenger_id === currentPlayerId || c.challenged_id === currentPlayerId) && 
    c.status === 'accepted'
  );
  const recentResults = challenges.filter(c => c.status === 'completed').slice(0, 5);

  // Check if challenge is expired
  const isExpired = (challenge) => {
    return new Date(challenge.expires_at) < new Date();
  };

  // Format time remaining
  const getTimeRemaining = (expiresAt) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires - now;
    
    if (diff < 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  return (
    <div style={{ background: '#1f2937', borderRadius: '10px', padding: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Challenge Board</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            background: '#10b981',
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <Swords size={20} />
          Create Challenge
        </button>
      </div>

      {/* Rules Section */}
      <div style={{ background: '#374151', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>Challenge Rules</h3>
        <ul style={{ color: '#9ca3af', fontSize: '14px', lineHeight: '1.8' }}>
          <li>New players (0 wins): Can challenge up to 10 spots above</li>
          <li>Established players (1+ wins): Can challenge 5 spots up or down</li>
          <li>Challenges expire in 3 days if not accepted</li>
          <li>If higher-ranked player declines: Lower player takes their spot!</li>
          <li>Only 1 active match per player at a time</li>
        </ul>
      </div>

      {/* Challenges I've Sent */}
      {myChallenges.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px', color: '#fbbf24' }}>
            My Challenges ({myChallenges.length})
          </h3>
          {myChallenges.map((challenge) => {
            const opponent = getPlayer(challenge.challenged_id);
            const expired = isExpired(challenge);
            
            return (
              <div
                key={challenge.id}
                style={{
                  background: '#374151',
                  padding: '15px',
                  borderRadius: '8px',
                  marginBottom: '10px',
                  borderLeft: expired ? '4px solid #ef4444' : '4px solid #fbbf24',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                      Challenge to #{getPlayerRank(challenge.challenged_id)} {opponent?.name}
                    </div>
                    <div style={{ fontSize: '14px', color: '#9ca3af' }}>
                      <Clock size={14} style={{ display: 'inline', marginRight: '5px' }} />
                      {expired ? 'Expired' : `Expires in ${getTimeRemaining(challenge.expires_at)}`}
                    </div>
                    {challenge.message && (
                      <div style={{ fontSize: '14px', color: '#9ca3af', marginTop: '5px', fontStyle: 'italic' }}>
                        "{challenge.message}"
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '14px', color: '#9ca3af' }}>
                    Waiting for response...
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Challenges to Me */}
      {challengesToMe.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px', color: '#3b82f6' }}>
            Challenges to Me ({challengesToMe.length})
          </h3>
          {challengesToMe.map((challenge) => {
            const challenger = getPlayer(challenge.challenger_id);
            const expired = isExpired(challenge);
            
            return (
              <div
                key={challenge.id}
                style={{
                  background: '#374151',
                  padding: '15px',
                  borderRadius: '8px',
                  marginBottom: '10px',
                  borderLeft: expired ? '4px solid #ef4444' : '4px solid #3b82f6',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                      Challenge from #{getPlayerRank(challenge.challenger_id)} {challenger?.name}
                    </div>
                    <div style={{ fontSize: '14px', color: '#9ca3af' }}>
                      <Clock size={14} style={{ display: 'inline', marginRight: '5px' }} />
                      {expired ? 'Expired' : `Expires in ${getTimeRemaining(challenge.expires_at)}`}
                    </div>
                    {challenge.message && (
                      <div style={{ fontSize: '14px', color: '#9ca3af', marginTop: '5px', fontStyle: 'italic' }}>
                        "{challenge.message}"
                      </div>
                    )}
                  </div>
                  {!expired && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => onAcceptChallenge(challenge.id)}
                        style={{
                          background: '#10b981',
                          padding: '8px 16px',
                          borderRadius: '5px',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '14px',
                        }}
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => onDeclineChallenge(challenge.id)}
                        style={{
                          background: '#ef4444',
                          padding: '8px 16px',
                          borderRadius: '5px',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '14px',
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Active Matches */}
      {activeMatches.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px', color: '#10b981' }}>
            Active Matches ({activeMatches.length})
          </h3>
          {activeMatches.map((challenge) => {
            const opponent = getPlayer(
              challenge.challenger_id === currentPlayerId 
                ? challenge.challenged_id 
                : challenge.challenger_id
            );
            const isChallenger = challenge.challenger_id === currentPlayerId;
            
            return (
              <div
                key={challenge.id}
                style={{
                  background: '#374151',
                  padding: '15px',
                  borderRadius: '8px',
                  marginBottom: '10px',
                  borderLeft: '4px solid #10b981',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                      Match vs #{getPlayerRank(opponent.id)} {opponent?.name}
                    </div>
                    <div style={{ fontSize: '14px', color: '#9ca3af' }}>
                      {isChallenger ? 'You challenged' : 'They challenged you'}
                    </div>
                    {challenge.message && (
                      <div style={{ fontSize: '14px', color: '#9ca3af', marginTop: '5px', fontStyle: 'italic' }}>
                        "{challenge.message}"
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => setSelectedChallenge(challenge)}
                      style={{
                        background: '#10b981',
                        padding: '8px 16px',
                        borderRadius: '5px',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      Record Result
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent Results */}
      {recentResults.length > 0 && (
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px', color: '#9ca3af' }}>
            Recent Results
          </h3>
          {recentResults.map((challenge) => {
            const challenger = getPlayer(challenge.challenger_id);
            const challenged = getPlayer(challenge.challenged_id);
            const winner = getPlayer(challenge.result_winner_id);
            
            return (
              <div
                key={challenge.id}
                style={{
                  background: '#374151',
                  padding: '15px',
                  borderRadius: '8px',
                  marginBottom: '10px',
                  opacity: 0.7,
                }}
              >
                <div style={{ fontSize: '14px' }}>
                  <span style={{ fontWeight: 'bold', color: '#10b981' }}>
                    {winner?.name}
                  </span>
                  {' defeated '}
                  <span>
                    {winner?.id === challenge.challenger_id ? challenged?.name : challenger?.name}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '5px' }}>
                  {new Date(challenge.completed_at).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {myChallenges.length === 0 && challengesToMe.length === 0 && activeMatches.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
          <Swords size={48} style={{ margin: '0 auto 20px', opacity: 0.5 }} />
          <p>No active challenges. Create a challenge to get started!</p>
        </div>
      )}

      {/* Create Challenge Modal */}
      {showCreateModal && (
        <CreateChallengeModal
          players={players}
          currentPlayerId={currentPlayerId}
          getEligibleOpponents={getEligibleOpponents}
          onCreate={onCreateChallenge}
          onCancel={() => setShowCreateModal(false)}
        />
      )}

      {/* Record Result Modal */}
      {selectedChallenge && (
        <RecordResultModal
          challenge={selectedChallenge}
          players={players}
          onRecord={(winnerId) => {
            onRecordResult(selectedChallenge.id, winnerId);
            setSelectedChallenge(null);
          }}
          onCancel={() => setSelectedChallenge(null)}
        />
      )}
    </div>
  );
}

function CreateChallengeModal({ players, currentPlayerId, getEligibleOpponents, onCreate, onCancel }) {
  const [challengedId, setChallengedId] = useState('');
  const [message, setMessage] = useState('');

  const eligibleOpponents = getEligibleOpponents(currentPlayerId);
  const getPlayerRank = (id) => players.findIndex(p => p.id === id) + 1;

  const handleCreate = () => {
    if (!challengedId) {
      alert('Please select an opponent');
      return;
    }
    onCreate(currentPlayerId, challengedId, message);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: '#1f2937',
          borderRadius: '10px',
          padding: '30px',
          width: '500px',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
      >
        <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>
          Create Challenge
        </h3>

        {eligibleOpponents.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>
            <p style={{ marginBottom: '10px' }}>You cannot create a challenge right now because:</p>
            <ul style={{ textAlign: 'left', lineHeight: '1.8' }}>
              <li>You may already have an active match, or</li>
              <li>There are no eligible opponents in your range</li>
            </ul>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                Challenge Opponent
              </label>
              <select
                value={challengedId}
                onChange={(e) => setChallengedId(e.target.value)}
                style={{
                  width: '100%',
                  background: '#374151',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '10px',
                  color: 'white',
                  fontSize: '16px',
                }}
              >
                <option value="">Select opponent...</option>
                {eligibleOpponents.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{getPlayerRank(p.id)} {p.name} ({p.rating})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                Message (Optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a message..."
                style={{
                  width: '100%',
                  background: '#374151',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '10px',
                  color: 'white',
                  fontSize: '14px',
                  minHeight: '80px',
                  resize: 'vertical',
                }}
                maxLength={200}
              />
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '5px' }}>
                {message.length}/200
              </div>
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          {eligibleOpponents.length > 0 && (
            <button
              onClick={handleCreate}
              style={{
                flex: 1,
                background: '#10b981',
                padding: '10px',
                borderRadius: '5px',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Send Challenge
            </button>
          )}
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              background: '#4b5563',
              padding: '10px',
              borderRadius: '5px',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function RecordResultModal({ challenge, players, onRecord, onCancel }) {
  const challenger = players.find(p => p.id === challenge.challenger_id);
  const challenged = players.find(p => p.id === challenge.challenged_id);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: '#1f2937',
          borderRadius: '10px',
          padding: '30px',
          width: '400px',
        }}
      >
        <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>
          Record Match Result
        </h3>

        <div style={{ marginBottom: '20px' }}>
          <p style={{ color: '#9ca3af', marginBottom: '15px' }}>Who won the match?</p>
          
          <button
            onClick={() => onRecord(challenge.challenger_id)}
            style={{
              width: '100%',
              background: '#10b981',
              padding: '15px',
              borderRadius: '5px',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 'bold',
              marginBottom: '10px',
              fontSize: '16px',
            }}
          >
            {challenger?.name} Won
          </button>

          <button
            onClick={() => onRecord(challenge.challenged_id)}
            style={{
              width: '100%',
              background: '#10b981',
              padding: '15px',
              borderRadius: '5px',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '16px',
            }}
          >
            {challenged?.name} Won
          </button>
        </div>

        <button
          onClick={onCancel}
          style={{
            width: '100%',
            background: '#4b5563',
            padding: '10px',
            borderRadius: '5px',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default ChallengeBoard;
