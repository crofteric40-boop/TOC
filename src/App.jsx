import React, { useState, useEffect } from "react";
import { Trophy, Users, Plus, Upload } from "lucide-react";
import { supabase } from "./supabaseClient";
import ChallengeBoard from './ChallengeBoard';
import * as challengeFuncs from './challengeFunctions';

function App() {
  const [players, setPlayers] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showCreateTournament, setShowCreateTournament] = useState(false);
  const [activeTab, setActiveTab] = useState("rankings");
  const [name, setName] = useState("");
  const [rating, setRating] = useState(500);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Load players from Supabase
  useEffect(() => {
    loadPlayers();
    loadTournaments();
  }, []);

  const loadPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('rating', { ascending: false });
      
      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error('Error loading players:', error);
      alert('Error loading players: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  onst recordChallengeMatch = async (winnerId, loserId) => {
    try {
      const winner = players.find(p => p.id === winnerId);
      const loser = players.find(p => p.id === loserId);
      
      if (!winner || !loser) return;

      // Calculate Fargo-style rating changes
      const K = 20; // K-factor
      const ratingDiff = winner.rating - loser.rating;
      
      // Expected score calculation (logistic function)
      const expectedWinner = 1 / (1 + Math.pow(10, -ratingDiff / 400));
      const expectedLoser = 1 - expectedWinner;
      
      // Actual scores (winner gets 1, loser gets 0)
      const actualWinner = 1;
      const actualLoser = 0;
      
      // Rating changes
      const winnerRatingChange = K * (actualWinner - expectedWinner);
      const loserRatingChange = K * (actualLoser - expectedLoser);
      
      // New ratings (minimum 200)
      const newWinnerRating = Math.max(200, Math.round(winner.rating + winnerRatingChange));
      const newLoserRating = Math.max(200, Math.round(loser.rating + loserRatingChange));
      
      // Update wins/losses
      const winnerNewWins = winner.wins + 1;
      const loserNewLosses = loser.losses + 1;

      // Determine if rankings should swap
      const winnerCurrentRank = players.findIndex(p => p.id === winnerId);
      const loserCurrentRank = players.findIndex(p => p.id === loserId);
      const lowerRankedWon = winnerCurrentRank > loserCurrentRank;

      // Update both players in database
      await supabase
        .from('players')
        .update({ 
          rating: newWinnerRating,
          wins: winnerNewWins
        })
        .eq('id', winnerId);

      await supabase
        .from('players')
        .update({ 
          rating: newLoserRating,
          losses: loserNewLosses
        })
        .eq('id', loserId);

      // If lower-ranked player won, we need to reorder
      if (lowerRankedWon) {
        // Reload players to get fresh data with new ratings
        await loadPlayers();
      } else {
        // Just update local state
        const updated = players.map(p => {
          if (p.id === winnerId) return { ...p, rating: newWinnerRating, wins: winnerNewWins };
          if (p.id === loserId) return { ...p, rating: newLoserRating, losses: loserNewLosses };
          return p;
        });
        setPlayers(updated);
      }

      setShowRecordChallenge(false);
      
    } catch (error) {
      console.error('Error recording challenge match:', error);
      alert('Error recording challenge match: ' + error.message);
    }
  };

  const handleCreateChallenge = async (challengerId, challengedId, message) => {
    try {
      await challengeFuncs.createChallenge(supabase, challenges, challengerId, challengedId, message);
      await loadChallenges();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleAcceptChallenge = async (challengeId) => {
    try {
      await challengeFuncs.acceptChallenge(supabase, challenges, challengeId);
      await loadChallenges();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeclineChallenge = async (challengeId) => {
    try {
      const challenge = challenges.find(c => c.id === challengeId);
      const result = await challengeFuncs.declineChallenge(supabase, players, challengeId, challenge);
      
      if (result.rankSwapped) {
        alert('You declined! The challenger has taken your spot.');
        await loadPlayers();
      }
      await loadChallenges();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleRecordChallengeResult = async (challengeId, winnerId) => {
    try {
      const challenge = challenges.find(c => c.id === challengeId);
      const loserId = winnerId === challenge.challenger_id 
        ? challenge.challenged_id 
        : challenge.challenger_id;

      await recordChallengeMatch(winnerId, loserId);
      
      await challengeFuncs.recordChallengeResult(supabase, challengeId, winnerId);
      await loadChallenges();
    } catch (error) {
      alert(error.message);
    }
  };

  const getEligibleOpponents = (playerId) => {
    return challengeFuncs.getEligibleOpponents(players, challenges, playerId);
  };
```


  const loadTournaments = async () => {
    try {
      const { data: tournamentsData, error: tournamentsError } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (tournamentsError) throw tournamentsError;

      // Load participants and matches for each tournament
      const tournamentsWithDetails = await Promise.all(
        (tournamentsData || []).map(async (tournament) => {
          const { data: participants } = await supabase
            .from('tournament_participants')
            .select('player_id')
            .eq('tournament_id', tournament.id);
          
          const { data: matches } = await supabase
            .from('matches')
            .select('*')
            .eq('tournament_id', tournament.id);

          return {
            ...tournament,
            participants: participants?.map(p => p.player_id) || [],
            bracket: matches || []
          };
        })
      );

      setTournaments(tournamentsWithDetails);
    } catch (error) {
      console.error('Error loading tournaments:', error);
    }
  };

  const addPlayer = async () => {
    if (!name) return;
    
    try {
      const { data, error } = await supabase
        .from('players')
        .insert([
          {
            name,
            rating: Number(rating),
            wins: 0,
            losses: 0,
          }
        ])
        .select();
      
      if (error) throw error;
      
      setPlayers([...players, data[0]]);
      setName("");
      setRating(500);
      setShowAdd(false);
    } catch (error) {
      console.error('Error adding player:', error);
      alert('Error adding player: ' + error.message);
    }
  };

  const importPlayers = async (playerList, defaultRating) => {
    try {
      const newPlayers = playerList.map((playerName) => ({
        name: playerName.trim(),
        rating: Number(defaultRating),
        wins: 0,
        losses: 0,
      }));
      
      const { data, error } = await supabase
        .from('players')
        .insert(newPlayers)
        .select();
      
      if (error) throw error;
      
      setPlayers([...players, ...data]);
      setShowImport(false);
    } catch (error) {
      console.error('Error importing players:', error);
      alert('Error importing players: ' + error.message);
    }
  };

  const createTournament = async (tournamentName, gameType, format, maxPlayers) => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .insert([
          {
            name: tournamentName,
            game_type: gameType,
            format,
            max_players: Number(maxPlayers),
            status: 'registration',
          }
        ])
        .select();
      
      if (error) throw error;
      
      const newTournament = {
        ...data[0],
        participants: [],
        bracket: []
      };
      
      setTournaments([newTournament, ...tournaments]);
      setShowCreateTournament(false);
    } catch (error) {
      console.error('Error creating tournament:', error);
      alert('Error creating tournament: ' + error.message);
    }
  };

  const addToTournament = async (tournamentId, playerId) => {
    const tournament = tournaments.find((t) => t.id === tournamentId);
    
    if (!tournament || 
        tournament.participants.length >= tournament.max_players ||
        tournament.participants.includes(playerId)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tournament_participants')
        .insert([
          {
            tournament_id: tournamentId,
            player_id: playerId,
          }
        ]);
      
      if (error) throw error;
      
      const updated = tournaments.map((t) => {
        if (t.id === tournamentId) {
          return { ...t, participants: [...t.participants, playerId] };
        }
        return t;
      });
      
      setTournaments(updated);
    } catch (error) {
      console.error('Error adding to tournament:', error);
      alert('Error adding player to tournament: ' + error.message);
    }
  };

  const startTournament = async (tournamentId) => {
    const tournament = tournaments.find((t) => t.id === tournamentId);
    if (!tournament || tournament.participants.length < 2) return;

    const shuffled = [...tournament.participants].sort(
      () => Math.random() - 0.5
    );
    const bracket = [];

    if (tournament.format === "Single Elimination") {
      let roundSize = Math.pow(2, Math.ceil(Math.log2(shuffled.length)));
      for (let i = 0; i < roundSize; i += 2) {
        bracket.push({
          tournament_id: tournamentId,
          player1_id: shuffled[i] || null,
          player2_id: shuffled[i + 1] || null,
          winner_id: null,
          round: 1,
          bracket_type: "winners",
        });
      }
    } else if (tournament.format === "Double Elimination") {
      let roundSize = Math.pow(2, Math.ceil(Math.log2(shuffled.length)));
      for (let i = 0; i < roundSize; i += 2) {
        bracket.push({
          tournament_id: tournamentId,
          player1_id: shuffled[i] || null,
          player2_id: shuffled[i + 1] || null,
          winner_id: null,
          loser_id: null,
          round: 1,
          bracket_type: "winners",
        });
      }
    }

    try {
      // Insert all matches
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .insert(bracket)
        .select();
      
      if (matchesError) throw matchesError;

      // Update tournament status
      const { error: updateError } = await supabase
        .from('tournaments')
        .update({ status: 'in-progress' })
        .eq('id', tournamentId);
      
      if (updateError) throw updateError;

      const updated = tournaments.map((t) =>
        t.id === tournamentId 
          ? { ...t, bracket: matchesData, status: "in-progress" } 
          : t
      );
      
      setTournaments(updated);
    } catch (error) {
      console.error('Error starting tournament:', error);
      alert('Error starting tournament: ' + error.message);
    }
  };

  const recordTournamentWinner = async (tournamentId, matchId, winnerId) => {
    const tournament = tournaments.find((t) => t.id === tournamentId);
    const currentMatch = tournament.bracket.find((m) => m.id === matchId);
    const loserId =
      currentMatch.player1_id === winnerId
        ? currentMatch.player2_id
        : currentMatch.player1_id;

    try {
      // Update the current match
      const { error: updateError } = await supabase
        .from('matches')
        .update({ 
          winner_id: winnerId, 
          loser_id: loserId,
          completed_at: new Date().toISOString()
        })
        .eq('id', matchId);
      
      if (updateError) throw updateError;

      // Reload the bracket from database to get fresh data
      const { data: freshBracket, error: bracketError } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', tournamentId);
      
      if (bracketError) throw bracketError;

      let updatedBracket = freshBracket;

      // Single Elimination logic
      if (tournament.format === "Single Elimination") {
        const currentRound = updatedBracket.filter(
          (m) => m.round === currentMatch.round
        );
        // Check if all matches with BOTH players are complete (ignore BYE matches)
        const allComplete = currentRound.every((m) => 
          m.winner_id !== null || m.player2_id === null
        );

        if (allComplete) {
          // Get winners from each match (including BYE auto-wins)
          const winners = currentRound.map((m) => {
            // If there's a BYE (no player2), player1 automatically wins
            if (m.player2_id === null) return m.player1_id;
            // Otherwise return the recorded winner
            return m.winner_id;
          }).filter(w => w !== null);
          
          if (winners.length > 1) {
            const nextRound = currentMatch.round + 1;
            const newMatches = [];
            
            for (let i = 0; i < winners.length; i += 2) {
              if (winners[i + 1]) {
                newMatches.push({
                  tournament_id: tournamentId,
                  player1_id: winners[i],
                  player2_id: winners[i + 1],
                  winner_id: null,
                  round: nextRound,
                  bracket_type: "winners",
                });
              }
            }

            if (newMatches.length > 0) {
              const { data: newMatchesData, error: insertError } = await supabase
                .from('matches')
                .insert(newMatches)
                .select();
              
              if (insertError) throw insertError;
              updatedBracket = [...updatedBracket, ...newMatchesData];
            }
          }
        }
      } 
      // Double Elimination logic
      else if (tournament.format === "Double Elimination") {
        const currentRoundMatches = updatedBracket.filter(
          (m) =>
            m.round === currentMatch.round &&
            m.bracket_type === currentMatch.bracket_type
        );
        const allComplete = currentRoundMatches.every((m) => 
          m.winner_id !== null || m.player2_id === null
        );

        if (allComplete) {
          const newMatches = [];
          
          if (currentMatch.bracket_type === "winners") {
            // Get winners (including BYE auto-wins)
            const winners = currentRoundMatches.map((m) => {
              if (m.player2_id === null) return m.player1_id;
              return m.winner_id;
            }).filter(w => w !== null);
            
            // Get losers (only from actual matches, not BYEs)
            const losers = currentRoundMatches
              .filter(m => m.player2_id !== null)
              .map((m) => m.loser_id)
              .filter(l => l !== null);

            // Create next winners bracket matches if more than one winner
            if (winners.length > 1) {
              const nextRound = currentMatch.round + 1;
              for (let i = 0; i < winners.length; i += 2) {
                if (winners[i + 1]) {
                  newMatches.push({
                    tournament_id: tournamentId,
                    player1_id: winners[i],
                    player2_id: winners[i + 1],
                    winner_id: null,
                    loser_id: null,
                    round: nextRound,
                    bracket_type: "winners",
                  });
                }
              }
            }

            // Handle losers bracket
            if (currentMatch.round === 1) {
              // Round 1: Just put losers into losers bracket
              for (let i = 0; i < losers.length; i += 2) {
                if (losers[i + 1]) {
                  newMatches.push({
                    tournament_id: tournamentId,
                    player1_id: losers[i],
                    player2_id: losers[i + 1],
                    winner_id: null,
                    loser_id: null,
                    round: 1,
                    bracket_type: "losers",
                  });
                }
              }
            } else {
              // Round 2+: Need to merge with winners from previous losers round
              // Calculate which losers round should feed into the next one
              const targetLosersRound = (currentMatch.round - 1) * 2;
              
              // Get the losers bracket round that should be complete
              const losersBracketRound = updatedBracket.filter(
                (m) => m.bracket_type === "losers" && m.round === targetLosersRound
              );
              
              // Check if that losers round is complete
              const losersRoundComplete = losersBracketRound.length > 0 && 
                losersBracketRound.every((m) => m.winner_id !== null || m.player2_id === null);
              
              if (losersRoundComplete) {
                // Get winners from that losers round
                const losersBracketWinners = losersBracketRound.map((m) => {
                  if (m.player2_id === null) return m.player1_id;
                  return m.winner_id;
                }).filter(w => w !== null);
                
                // Interleave: losers from winners bracket with winners from losers bracket
                const combined = [];
                const maxLength = Math.max(losers.length, losersBracketWinners.length);
                
                for (let i = 0; i < maxLength; i++) {
                  if (i < losers.length) combined.push(losers[i]);
                  if (i < losersBracketWinners.length) combined.push(losersBracketWinners[i]);
                }
                
                // Create next losers round matches
                const nextLosersRound = targetLosersRound + 1;
                for (let i = 0; i < combined.length; i += 2) {
                  if (combined[i + 1]) {
                    newMatches.push({
                      tournament_id: tournamentId,
                      player1_id: combined[i],
                      player2_id: combined[i + 1],
                      winner_id: null,
                      loser_id: null,
                      round: nextLosersRound,
                      bracket_type: "losers",
                    });
                  }
                }
              }
            }
          } else if (currentMatch.bracket_type === "losers") {
            // Get winners from losers bracket (including BYE auto-wins)
            const winners = currentRoundMatches.map((m) => {
              if (m.player2_id === null) return m.player1_id;
              return m.winner_id;
            }).filter(w => w !== null);
            
            if (winners.length > 1) {
              // Continue losers bracket
              const nextRound = currentMatch.round + 1;
              for (let i = 0; i < winners.length; i += 2) {
                if (winners[i + 1]) {
                  newMatches.push({
                    tournament_id: tournamentId,
                    player1_id: winners[i],
                    player2_id: winners[i + 1],
                    winner_id: null,
                    loser_id: null,
                    round: nextRound,
                    bracket_type: "losers",
                  });
                }
              }
            } else if (winners.length === 1) {
              // Losers bracket complete - create grand finals
              // Get the winner from winners bracket
              const winnersBracketMatches = updatedBracket.filter(
                (m) => m.bracket_type === "winners" && m.winner_id !== null
              );
              
              // Sort by round descending to get the latest winner
              winnersBracketMatches.sort((a, b) => b.round - a.round);
              const winnersChamp = winnersBracketMatches[0]?.winner_id;

              if (winnersChamp) {
                newMatches.push({
                  tournament_id: tournamentId,
                  player1_id: winnersChamp,
                  player2_id: winners[0],
                  winner_id: null,
                  loser_id: null,
                  round: 1,
                  bracket_type: "grand-final",
                });
              }
            }
          } else if (currentMatch.bracket_type === "grand-final") {
            // Grand finals bracket reset logic
            const winnersBracketMatches = updatedBracket.filter(
              (m) => m.bracket_type === "winners" && m.winner_id !== null
            );
            winnersBracketMatches.sort((a, b) => b.round - a.round);
            const winnersChamp = winnersBracketMatches[0]?.winner_id;
            
            // If losers bracket winner wins, need bracket reset
            if (winnerId !== winnersChamp) {
              const existingGrandFinals = updatedBracket.filter(
                (m) => m.bracket_type === "grand-final"
              );
              if (existingGrandFinals.length === 1) {
                // Create bracket reset match
                newMatches.push({
                  tournament_id: tournamentId,
                  player1_id: currentMatch.player1_id,
                  player2_id: currentMatch.player2_id,
                  winner_id: null,
                  loser_id: null,
                  round: 2,
                  bracket_type: "grand-final",
                });
              }
            }
          }

          if (newMatches.length > 0) {
            const { data: newMatchesData, error: insertError } = await supabase
              .from('matches')
              .insert(newMatches)
              .select();
            
            if (insertError) throw insertError;
            updatedBracket = [...updatedBracket, ...newMatchesData];
          }
        }
      }

      const allDone = updatedBracket.every((m) => m.winner_id !== null);
      
      if (allDone) {
        await supabase
          .from('tournaments')
          .update({ status: 'completed' })
          .eq('id', tournamentId);
      }

      const updated = tournaments.map((t) =>
        t.id === tournamentId
          ? {
              ...t,
              bracket: updatedBracket,
              status: allDone ? "completed" : "in-progress",
            }
          : t
      );
      
      setTournaments(updated);
    } catch (error) {
      console.error('Error recording winner:', error);
      alert('Error recording winner: ' + error.message);
    }
  };

  const sorted = [...players].sort((a, b) => b.rating - a.rating);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(to bottom right, #064e3b, #1f2937, #000)",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <Trophy size={48} color="#fbbf24" style={{ margin: "0 auto 20px" }} />
          <h2>Loading Billiard League...</h2>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom right, #064e3b, #1f2937, #000)",
        color: "white",
        padding: "20px",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", padding: "30px 0" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
            }}
          >
            <Trophy size={40} color="#fbbf24" />
            <h1 style={{ fontSize: "36px", fontWeight: "bold" }}>
              Billiard League
            </h1>
          </div>
          <p style={{ color: "#9ca3af" }}>8-Ball • 9-Ball • 10-Ball</p>
        </div>
        {/* Player Selection */}
        {players.length > 0 && (
          <div style={{ 
            marginBottom: '20px', 
            background: '#1f2937', 
            padding: '15px', 
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <label style={{ color: '#9ca3af' }}>Playing as:</label>
            <select
              value={currentUserId || ''}
              onChange={(e) => setCurrentUserId(e.target.value)}
              style={{
                background: '#374151',
                border: 'none',
                borderRadius: '5px',
                padding: '8px 12px',
                color: 'white',
                fontSize: '14px',
              }}
            >
              <option value="">Select your player...</option>
              {sorted.map((p, i) => (
                <option key={p.id} value={p.id}>
                  #{i + 1} {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
<div
  style={{
    display: "flex",
    gap: "10px",
    marginBottom: "30px",
    background: "#1f2937",
    borderRadius: "10px",
    padding: "5px",
  }}
>
  <button
    onClick={() => setActiveTab("rankings")}
    style={{
      flex: 1,
      padding: "15px",
      borderRadius: "8px",
      border: "none",
      background: activeTab === "rankings" ? "#10b981" : "transparent",
      color: "white",
      cursor: "pointer",
      fontWeight: "bold",
    }}
  >
    Rankings
  </button>
  <button
    onClick={() => setActiveTab("challenges")}
    style={{
      flex: 1,
      padding: "15px",
      borderRadius: "8px",
      border: "none",
      background: activeTab === "challenges" ? "#10b981" : "transparent",
      color: "white",
      cursor: "pointer",
      fontWeight: "bold",
    }}
  >
    Challenges
  </button>
  <button
    onClick={() => setActiveTab("tournaments")}
    style={{
      flex: 1,
      padding: "15px",
      borderRadius: "8px",
      border: "none",
      background: activeTab === "tournaments" ? "#10b981" : "transparent",
      color: "white",
      cursor: "pointer",
      fontWeight: "bold",
    }}
  >
    Tournaments
  </button>
</div>
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "30px",
            background: "#1f2937",
            borderRadius: "10px",
            padding: "5px",
          }}
        >
          <button
            onClick={() => setActiveTab("rankings")}
            style={{
              flex: 1,
              padding: "15px",
              borderRadius: "8px",
              border: "none",
              background: activeTab === "rankings" ? "#10b981" : "transparent",
              color: "white",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Rankings
          </button>
          <button
            onClick={() => setActiveTab("challenges")}
            style={{
              flex: 1,
              padding: "15px",
              borderRadius: "8px",
              border: "none",
              background: activeTab === "challenges" ? "#10b981" : "transparent",
              color: "white",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Challenges
          </button>
        </div>

        {activeTab === "rankings" && (
          <div
            style={{
              background: "#1f2937",
              borderRadius: "10px",
              padding: "30px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "20px",
                gap: "10px",
              }}
            >
              <h2 style={{ fontSize: "24px", fontWeight: "bold" }}>
                Player Rankings
              </h2>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => setShowImport(true)}
                  style={{
                    background: "#3b82f6",
                    padding: "10px 20px",
                    borderRadius: "8px",
                    border: "none",
                    color: "white",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <Upload size={20} />
                  Import Players
                </button>
                <button
                  onClick={() => setShowAdd(true)}
                  style={{
                    background: "#10b981",
                    padding: "10px 20px",
                    borderRadius: "8px",
                    border: "none",
                    color: "white",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <Plus size={20} />
                  Add Player
                </button>
              </div>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #374151" }}>
                  <th style={{ textAlign: "left", padding: "10px" }}>Rank</th>
                  <th style={{ textAlign: "left", padding: "10px" }}>Player</th>
                  <th style={{ textAlign: "center", padding: "10px" }}>
                    Rating
                  </th>
                  <th style={{ textAlign: "center", padding: "10px" }}>
                    Record
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid #374151" }}>
                    <td style={{ padding: "15px" }}>
                      {i === 0 && (
                        <Trophy
                          size={20}
                          color="#fbbf24"
                          style={{ display: "inline", marginRight: "5px" }}
                        />
                      )}
                      {i + 1}
                    </td>
                    <td style={{ padding: "15px", fontWeight: "bold" }}>
                      {p.name}
                    </td>
                    <td style={{ textAlign: "center", padding: "15px" }}>
                      <span
                        style={{
                          background: "#10b981",
                          padding: "5px 15px",
                          borderRadius: "20px",
                          fontWeight: "bold",
                        }}
                      >
                        {p.rating}
                      </span>
                    </td>
                    <td style={{ textAlign: "center", padding: "15px" }}>
                      {p.wins}W - {p.losses}L
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {players.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px",
                  color: "#9ca3af",
                }}
              >
                No players yet. Click "Add Player" or "Import Players" to get started!
              </div>
            )}
          </div>
        )}
{activeTab === "challenges" && (
          currentUserId ? (
            <ChallengeBoard
              players={sorted}
              challenges={challenges}
              currentPlayerId={currentUserId}
              onCreateChallenge={handleCreateChallenge}
              onAcceptChallenge={handleAcceptChallenge}
              onDeclineChallenge={handleDeclineChallenge}
              onRecordResult={handleRecordChallengeResult}
              getEligibleOpponents={getEligibleOpponents}
            />
          ) : (
            <div style={{ background: '#1f2937', borderRadius: '10px', padding: '60px', textAlign: 'center', color: '#9ca3af' }}>
              <p style={{ fontSize: '18px', marginBottom: '10px' }}>Please select your player above to access the Challenge Board</p>
            </div>
          )
        )}
        {activeTab === "tournaments" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "20px",
              }}
            >
              <h2 style={{ fontSize: "24px", fontWeight: "bold" }}>
                Tournaments
              </h2>
              <button
                onClick={() => setShowCreateTournament(true)}
                style={{
                  background: "#10b981",
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                <Plus
                  size={20}
                  style={{ display: "inline", marginRight: "5px" }}
                />
                Create Tournament
              </button>
            </div>

            {tournaments.map((t) => (
              <div
                key={t.id}
                style={{
                  background: "#1f2937",
                  borderRadius: "10px",
                  padding: "20px",
                  marginBottom: "20px",
                }}
              >
                <h3
                  style={{
                    fontSize: "20px",
                    fontWeight: "bold",
                    marginBottom: "10px",
                  }}
                >
                  {t.name}
                </h3>
                <p style={{ color: "#9ca3af", marginBottom: "15px" }}>
                  {t.game_type} • {t.format} • {t.status}
                </p>

                {t.status === "registration" && (
                  <div>
                    <p style={{ marginBottom: "10px" }}>
                      Players: {t.participants.length}/{t.max_players}
                    </p>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: "10px",
                        marginBottom: "15px",
                      }}
                    >
                      {t.participants.map((pid) => {
                        const player = players.find((p) => p.id === pid);
                        return (
                          <div
                            key={pid}
                            style={{
                              background: "#374151",
                              padding: "10px",
                              borderRadius: "5px",
                            }}
                          >
                            {player?.name}
                          </div>
                        );
                      })}
                    </div>
                    {t.participants.length < t.max_players && (
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            addToTournament(t.id, e.target.value);
                            e.target.value = "";
                          }
                        }}
                        style={{
                          width: "100%",
                          background: "#374151",
                          border: "none",
                          borderRadius: "5px",
                          padding: "10px",
                          color: "white",
                          marginBottom: "10px",
                        }}
                      >
                        <option value="">+ Add Player</option>
                        {players
                          .filter((p) => !t.participants.includes(p.id))
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.rating})
                            </option>
                          ))}
                      </select>
                    )}
                    <button
                      onClick={() => startTournament(t.id)}
                      disabled={t.participants.length < 2}
                      style={{
                        background:
                          t.participants.length >= 2 ? "#3b82f6" : "#4b5563",
                        padding: "10px 20px",
                        borderRadius: "5px",
                        border: "none",
                        color: "white",
                        cursor:
                          t.participants.length >= 2
                            ? "pointer"
                            : "not-allowed",
                      }}
                    >
                      Start Tournament
                    </button>
                  </div>
                )}

                {(t.status === "in-progress" || t.status === "completed") && (
                  <TournamentBracket 
                    tournament={t} 
                    players={players}
                    onRecordWinner={recordTournamentWinner}
                  />
                )}
              </div>
            ))}

            {tournaments.length === 0 && (
              <div
                style={{
                  background: "#1f2937",
                  borderRadius: "10px",
                  padding: "60px",
                  textAlign: "center",
                  color: "#9ca3af",
                }}
              >
                <Trophy
                  size={48}
                  style={{ margin: "0 auto 15px", opacity: 0.5 }}
                />
                <p>No tournaments yet. Create one to get started!</p>
              </div>
            )}
          </div>
        )}

        {showAdd && (
          <AddPlayerModal
            name={name}
            setName={setName}
            rating={rating}
            setRating={setRating}
            onAdd={addPlayer}
            onCancel={() => setShowAdd(false)}
          />
        )}

        {showImport && (
          <PlayerImportModal
            onImport={importPlayers}
            onCancel={() => setShowImport(false)}
          />
        )}

        {showCreateTournament && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
          >
            <div
              style={{
                background: "#1f2937",
                borderRadius: "10px",
                padding: "30px",
                width: "400px",
              }}
            >
              <h3
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                  marginBottom: "20px",
                }}
              >
                Create Tournament
              </h3>
              <TournamentForm
                onCreate={createTournament}
                onCancel={() => setShowCreateTournament(false)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Extracted AddPlayerModal component
function AddPlayerModal({ name, setName, rating, setRating, onAdd, onCancel }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "#1f2937",
          borderRadius: "10px",
          padding: "30px",
          width: "400px",
        }}
      >
        <h3
          style={{
            fontSize: "20px",
            fontWeight: "bold",
            marginBottom: "20px",
          }}
        >
          Add New Player
        </h3>

        <div style={{ marginBottom: "15px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontSize: "14px",
            }}
          >
            Player Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: "100%",
              background: "#374151",
              border: "none",
              borderRadius: "5px",
              padding: "10px",
              color: "white",
              fontSize: "16px",
            }}
            placeholder="Enter name"
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontSize: "14px",
            }}
          >
            Initial Rating
          </label>
          <input
            type="number"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            style={{
              width: "100%",
              background: "#374151",
              border: "none",
              borderRadius: "5px",
              padding: "10px",
              color: "white",
              fontSize: "16px",
            }}
          />
          <p
            style={{
              fontSize: "12px",
              color: "#9ca3af",
              marginTop: "5px",
            }}
          >
            400=C Player, 500=B Player, 600=A Player, 700+=Pro
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={onAdd}
            style={{
              flex: 1,
              background: "#10b981",
              padding: "10px",
              borderRadius: "5px",
              border: "none",
              color: "white",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Add Player
          </button>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              background: "#4b5563",
              padding: "10px",
              borderRadius: "5px",
              border: "none",
              color: "white",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function PlayerImportModal({ onImport, onCancel }) {
  const [importMethod, setImportMethod] = useState("paste");
  const [textInput, setTextInput] = useState("");
  const [defaultRating, setDefaultRating] = useState(500);
  const [previewPlayers, setPreviewPlayers] = useState([]);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split(/\r?\n/).filter((line) => line.trim());
      setPreviewPlayers(lines);
    };
    reader.readAsText(file);
  };

  const handleTextChange = (text) => {
    setTextInput(text);
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    setPreviewPlayers(lines);
  };

  const handleImport = () => {
    if (previewPlayers.length > 0) {
      onImport(previewPlayers, defaultRating);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "#1f2937",
          borderRadius: "10px",
          padding: "30px",
          width: "500px",
          maxHeight: "80vh",
          overflow: "auto",
        }}
      >
        <h3
          style={{
            fontSize: "20px",
            fontWeight: "bold",
            marginBottom: "20px",
          }}
        >
          Import Players
        </h3>

        <div style={{ marginBottom: "20px" }}>
          <div
            style={{
              display: "flex",
              gap: "10px",
              marginBottom: "15px",
              background: "#374151",
              borderRadius: "8px",
              padding: "5px",
            }}
          >
            <button
              onClick={() => setImportMethod("paste")}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "5px",
                border: "none",
                background: importMethod === "paste" ? "#10b981" : "transparent",
                color: "white",
                cursor: "pointer",
              }}
            >
              Paste Names
            </button>
            <button
              onClick={() => setImportMethod("file")}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "5px",
                border: "none",
                background: importMethod === "file" ? "#10b981" : "transparent",
                color: "white",
                cursor: "pointer",
              }}
            >
              Upload File
            </button>
          </div>

          {importMethod === "paste" && (
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "5px",
                  fontSize: "14px",
                }}
              >
                Player Names (one per line)
              </label>
              <textarea
                value={textInput}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="John Smith&#10;Jane Doe&#10;Mike Johnson&#10;Sarah Williams"
                style={{
                  width: "100%",
                  background: "#374151",
                  border: "none",
                  borderRadius: "5px",
                  padding: "10px",
                  color: "white",
                  fontSize: "14px",
                  minHeight: "150px",
                  resize: "vertical",
                }}
              />
            </div>
          )}

          {importMethod === "file" && (
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "10px",
                  fontSize: "14px",
                }}
              >
                Upload CSV or TXT file
              </label>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                style={{
                  width: "100%",
                  padding: "10px",
                  background: "#374151",
                  border: "none",
                  borderRadius: "5px",
                  color: "white",
                  cursor: "pointer",
                }}
              />
              <p
                style={{
                  fontSize: "12px",
                  color: "#9ca3af",
                  marginTop: "5px",
                }}
              >
                File should contain one player name per line
              </p>
            </div>
          )}
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontSize: "14px",
            }}
          >
            Default Rating for All Players
          </label>
          <input
            type="number"
            value={defaultRating}
            onChange={(e) => setDefaultRating(e.target.value)}
            style={{
              width: "100%",
              background: "#374151",
              border: "none",
              borderRadius: "5px",
              padding: "10px",
              color: "white",
              fontSize: "16px",
            }}
          />
          <p
            style={{
              fontSize: "12px",
              color: "#9ca3af",
              marginTop: "5px",
            }}
          >
            400=C Player, 500=B Player, 600=A Player, 700+=Pro
          </p>
        </div>

        {previewPlayers.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "10px",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              Preview ({previewPlayers.length} players)
            </label>
            <div
              style={{
                background: "#374151",
                borderRadius: "5px",
                padding: "10px",
                maxHeight: "150px",
                overflow: "auto",
              }}
            >
              {previewPlayers.map((name, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "5px 0",
                    borderBottom:
                      idx < previewPlayers.length - 1
                        ? "1px solid #4b5563"
                        : "none",
                    fontSize: "14px",
                  }}
                >
                  {name}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={handleImport}
            disabled={previewPlayers.length === 0}
            style={{
              flex: 1,
              background: previewPlayers.length > 0 ? "#10b981" : "#4b5563",
              padding: "10px",
              borderRadius: "5px",
              border: "none",
              color: "white",
              cursor: previewPlayers.length > 0 ? "pointer" : "not-allowed",
              fontWeight: "bold",
            }}
          >
            Import {previewPlayers.length} Players
          </button>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              background: "#4b5563",
              padding: "10px",
              borderRadius: "5px",
              border: "none",
              color: "white",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Tournament bracket display component
function TournamentBracket({ tournament, players, onRecordWinner }) {
  const t = tournament;
  
  // Helper function to render a single match
  const renderMatch = (match, borderColor = "#10b981") => {
    const p1 = players.find((p) => p.id === match.player1_id);
    const p2 = players.find((p) => p.id === match.player2_id);
    
    // Auto-win for BYE matches
    const isAutoWin = !match.player2_id;
    const displayWinner = isAutoWin ? match.player1_id : match.winner_id;
    
    return (
      <div
        key={match.id}
        style={{
          background: "#374151",
          padding: "15px",
          borderRadius: "5px",
          marginBottom: "10px",
          borderLeft: `4px solid ${borderColor}`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontWeight: displayWinner === match.player1_id ? "bold" : "normal",
                color: displayWinner === match.player1_id ? "#10b981" : "white",
              }}
            >
              {p1?.name || "BYE"}{" "}
              {displayWinner === match.player1_id && "✓"}
              {isAutoWin && " (Auto-Win)"}
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "#9ca3af",
                margin: "5px 0",
              }}
            >
              vs
            </div>
            <div
              style={{
                fontWeight: displayWinner === match.player2_id ? "bold" : "normal",
                color: displayWinner === match.player2_id ? "#10b981" : "white",
              }}
            >
              {p2?.name || "BYE"}{" "}
              {displayWinner === match.player2_id && "✓"}
            </div>
          </div>
          {!match.winner_id && match.player1_id && match.player2_id && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "5px",
              }}
            >
              <button
                onClick={() => onRecordWinner(t.id, match.id, match.player1_id)}
                style={{
                  background: "#10b981",
                  padding: "5px 15px",
                  borderRadius: "5px",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                {p1?.name} Wins
              </button>
              <button
                onClick={() => onRecordWinner(t.id, match.id, match.player2_id)}
                style={{
                  background: "#10b981",
                  padding: "5px 15px",
                  borderRadius: "5px",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                {p2?.name} Wins
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  if (t.format === "Double Elimination") {
    return (
      <div>
        <h4 style={{ fontWeight: "bold", marginBottom: "15px", color: "#fbbf24" }}>
          Winners Bracket
        </h4>
        {[...new Set(t.bracket.filter((m) => m.bracket_type === "winners").map((m) => m.round))].map((round) => (
          <div key={round} style={{ marginBottom: "20px" }}>
            <h5 style={{ color: "#9ca3af", fontSize: "14px", marginBottom: "10px" }}>
              Winners Round {round}
            </h5>
            {t.bracket
              .filter((m) => m.round === round && m.bracket_type === "winners")
              .map((match) => renderMatch(match, "#fbbf24"))}
          </div>
        ))}

        {t.bracket.some((m) => m.bracket_type === "losers") && (
          <>
            <h4
              style={{
                fontWeight: "bold",
                marginBottom: "15px",
                color: "#ef4444",
                marginTop: "30px",
              }}
            >
              Losers Bracket
            </h4>
            {[...new Set(t.bracket.filter((m) => m.bracket_type === "losers").map((m) => m.round))].map((round) => (
              <div key={round} style={{ marginBottom: "20px" }}>
                <h5 style={{ color: "#9ca3af", fontSize: "14px", marginBottom: "10px" }}>
                  Losers Round {round}
                </h5>
                {t.bracket
                  .filter((m) => m.round === round && m.bracket_type === "losers")
                  .map((match) => renderMatch(match, "#ef4444"))}
              </div>
            ))}
          </>
        )}

        {t.bracket.some((m) => m.bracket_type === "grand-final") && (
          <>
            <h4
              style={{
                fontWeight: "bold",
                marginBottom: "15px",
                color: "#a855f7",
                marginTop: "30px",
              }}
            >
              Grand Finals
            </h4>
            {t.bracket
              .filter((m) => m.bracket_type === "grand-final")
              .map((match, idx) => {
                const p1 = players.find((p) => p.id === match.player1_id);
                const p2 = players.find((p) => p.id === match.player2_id);
                return (
                  <div key={match.id} style={{ marginBottom: "10px" }}>
                    {idx > 0 && (
                      <p style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "10px" }}>
                        (Bracket Reset - Losers bracket winner won first grand final)
                      </p>
                    )}
                    <div
                      style={{
                        background: "#374151",
                        padding: "15px",
                        borderRadius: "5px",
                        borderLeft: "4px solid #a855f7",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontWeight: match.winner_id === match.player1_id ? "bold" : "normal",
                              color: match.winner_id === match.player1_id ? "#10b981" : "white",
                            }}
                          >
                            {p1?.name}{" "}
                            {match.winner_id === match.player1_id && "✓ CHAMPION"}
                          </div>
                          <div style={{ fontSize: "12px", color: "#9ca3af", margin: "5px 0" }}>
                            vs
                          </div>
                          <div
                            style={{
                              fontWeight: match.winner_id === match.player2_id ? "bold" : "normal",
                              color: match.winner_id === match.player2_id ? "#10b981" : "white",
                            }}
                          >
                            {p2?.name}{" "}
                            {match.winner_id === match.player2_id && "✓ CHAMPION"}
                          </div>
                        </div>
                        {!match.winner_id && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                            <button
                              onClick={() => onRecordWinner(t.id, match.id, match.player1_id)}
                              style={{
                                background: "#10b981",
                                padding: "5px 15px",
                                borderRadius: "5px",
                                border: "none",
                                color: "white",
                                cursor: "pointer",
                                fontSize: "12px",
                              }}
                            >
                              {p1?.name} Wins
                            </button>
                            <button
                              onClick={() => onRecordWinner(t.id, match.id, match.player2_id)}
                              style={{
                                background: "#10b981",
                                padding: "5px 15px",
                                borderRadius: "5px",
                                border: "none",
                                color: "white",
                                cursor: "pointer",
                                fontSize: "12px",
                              }}
                            >
                              {p2?.name} Wins
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </>
        )}
      </div>
    );
  }
  
  // Single Elimination rendering
  return (
    <div>
      <h4 style={{ fontWeight: "bold", marginBottom: "10px" }}>Bracket</h4>
      {[...new Set(t.bracket.map((m) => m.round))].map((round) => (
        <div key={round} style={{ marginBottom: "20px" }}>
          <h5 style={{ color: "#9ca3af", fontSize: "14px", marginBottom: "10px" }}>
            {round === Math.max(...t.bracket.map((m) => m.round)) &&
            t.bracket.filter((m) => m.round === round).length === 1
              ? "Finals"
              : `Round ${round}`}
          </h5>
          {t.bracket.filter((m) => m.round === round).map((match) => renderMatch(match))}
        </div>
      ))}
    </div>
  );
}

function TournamentForm({ onCreate, onCancel }) {
  const [name, setName] = useState("");
  const [gameType, setGameType] = useState("8-Ball");
  const [format, setFormat] = useState("Single Elimination");
  const [maxPlayers, setMaxPlayers] = useState("8");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Tournament Name"
        style={{
          background: "#374151",
          border: "none",
          borderRadius: "5px",
          padding: "10px",
          color: "white",
        }}
      />
      <select
        value={gameType}
        onChange={(e) => setGameType(e.target.value)}
        style={{
          background: "#374151",
          border: "none",
          borderRadius: "5px",
          padding: "10px",
          color: "white",
        }}
      >
        <option>8-Ball</option>
        <option>9-Ball</option>
        <option>10-Ball</option>
      </select>
      <select
        value={format}
        onChange={(e) => setFormat(e.target.value)}
        style={{
          background: "#374151",
          border: "none",
          borderRadius: "5px",
          padding: "10px",
          color: "white",
        }}
      >
        <option>Single Elimination</option>
        <option>Double Elimination</option>
      </select>
      <select
        value={maxPlayers}
        onChange={(e) => setMaxPlayers(e.target.value)}
        style={{
          background: "#374151",
          border: "none",
          borderRadius: "5px",
          padding: "10px",
          color: "white",
        }}
      >
        <option value="4">4 Players</option>
        <option value="8">8 Players</option>
        <option value="16">16 Players</option>
      </select>
      <div style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={() => name && onCreate(name, gameType, format, maxPlayers)}
          style={{
            flex: 1,
            background: "#10b981",
            padding: "10px",
            borderRadius: "5px",
            border: "none",
            color: "white",
            cursor: "pointer",
          }}
        >
          Create
        </button>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            background: "#4b5563",
            padding: "10px",
            borderRadius: "5px",
            border: "none",
            color: "white",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default App;
