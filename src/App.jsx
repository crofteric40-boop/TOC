import React, { useState, useEffect } from "react";
import { Trophy, Users, Plus } from "lucide-react";

function App() {
  const [players, setPlayers] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showCreateTournament, setShowCreateTournament] = useState(false);
  const [activeTab, setActiveTab] = useState("rankings");
  const [name, setName] = useState("");
  const [rating, setRating] = useState(500);

  useEffect(() => {
    const saved = localStorage.getItem("players");
    const savedTournaments = localStorage.getItem("tournaments");
    if (saved) setPlayers(JSON.parse(saved));
    if (savedTournaments) setTournaments(JSON.parse(savedTournaments));
  }, []);

  const addPlayer = () => {
    if (!name) return;
    const newPlayer = {
      id: Date.now(),
      name,
      rating: Number(rating),
      wins: 0,
      losses: 0,
    };
    const updated = [...players, newPlayer];
    setPlayers(updated);
    localStorage.setItem("players", JSON.stringify(updated));
    setName("");
    setRating(500);
    setShowAdd(false);
  };

  const createTournament = (tournamentName, gameType, format, maxPlayers) => {
    const tournament = {
      id: Date.now(),
      name: tournamentName,
      gameType,
      format,
      maxPlayers: Number(maxPlayers),
      participants: [],
      bracket: [],
      status: "registration",
    };
    const updated = [...tournaments, tournament];
    setTournaments(updated);
    localStorage.setItem("tournaments", JSON.stringify(updated));
    setShowCreateTournament(false);
  };

  const addToTournament = (tournamentId, playerId) => {
    const updated = tournaments.map((t) => {
      if (
        t.id === tournamentId &&
        t.participants.length < t.maxPlayers &&
        !t.participants.includes(playerId)
      ) {
        return { ...t, participants: [...t.participants, playerId] };
      }
      return t;
    });
    setTournaments(updated);
    localStorage.setItem("tournaments", JSON.stringify(updated));
  };

  const startTournament = (tournamentId) => {
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
          id: Date.now() + i,
          player1: shuffled[i] || null,
          player2: shuffled[i + 1] || null,
          winner: null,
          round: 1,
          bracketType: "winners",
        });
      }
    } else if (tournament.format === "Double Elimination") {
      let roundSize = Math.pow(2, Math.ceil(Math.log2(shuffled.length)));
      for (let i = 0; i < roundSize; i += 2) {
        bracket.push({
          id: Date.now() + i,
          player1: shuffled[i] || null,
          player2: shuffled[i + 1] || null,
          winner: null,
          loser: null,
          round: 1,
          bracketType: "winners",
        });
      }
    }

    const updated = tournaments.map((t) =>
      t.id === tournamentId ? { ...t, bracket, status: "in-progress" } : t
    );
    setTournaments(updated);
    localStorage.setItem("tournaments", JSON.stringify(updated));
  };

  const recordTournamentWinner = (tournamentId, matchId, winnerId) => {
    const tournament = tournaments.find((t) => t.id === tournamentId);
    const currentMatch = tournament.bracket.find((m) => m.id === matchId);
    const loserId =
      currentMatch.player1 === winnerId
        ? currentMatch.player2
        : currentMatch.player1;

    let updatedBracket = tournament.bracket.map((m) =>
      m.id === matchId ? { ...m, winner: winnerId, loser: loserId } : m
    );

    if (tournament.format === "Single Elimination") {
      const currentRound = updatedBracket.filter(
        (m) => m.round === currentMatch.round
      );
      const allComplete = currentRound.every((m) => m.winner !== null);

      if (allComplete) {
        const winners = currentRound.map((m) => m.winner);
        if (winners.length > 1) {
          const nextRound = currentMatch.round + 1;
          for (let i = 0; i < winners.length; i += 2) {
            if (winners[i + 1]) {
              updatedBracket.push({
                id: Date.now() + Math.random(),
                player1: winners[i],
                player2: winners[i + 1],
                winner: null,
                round: nextRound,
                bracketType: "winners",
              });
            }
          }
        }
      }
    } else if (tournament.format === "Double Elimination") {
      const currentRoundMatches = updatedBracket.filter(
        (m) =>
          m.round === currentMatch.round &&
          m.bracketType === currentMatch.bracketType
      );
      const allComplete = currentRoundMatches.every((m) => m.winner !== null);

      if (allComplete) {
        if (currentMatch.bracketType === "winners") {
          const winners = currentRoundMatches.map((m) => m.winner);
          const losers = currentRoundMatches.map((m) => m.loser);

          if (winners.length > 1) {
            const nextRound = currentMatch.round + 1;
            for (let i = 0; i < winners.length; i += 2) {
              if (winners[i + 1]) {
                updatedBracket.push({
                  id: Date.now() + Math.random() * 1000,
                  player1: winners[i],
                  player2: winners[i + 1],
                  winner: null,
                  loser: null,
                  round: nextRound,
                  bracketType: "winners",
                });
              }
            }
          }

          if (currentMatch.round === 1) {
            for (let i = 0; i < losers.length; i += 2) {
              if (losers[i + 1]) {
                updatedBracket.push({
                  id: Date.now() + Math.random() * 2000 + i,
                  player1: losers[i],
                  player2: losers[i + 1],
                  winner: null,
                  loser: null,
                  round: 1,
                  bracketType: "losers",
                });
              }
            }
          } else {
            for (let i = 0; i < losers.length; i += 2) {
              if (losers[i + 1]) {
                updatedBracket.push({
                  id: Date.now() + Math.random() * 3000 + i,
                  player1: losers[i],
                  player2: losers[i + 1],
                  winner: null,
                  loser: null,
                  round: (currentMatch.round - 1) * 2,
                  bracketType: "losers",
                });
              }
            }
          }
        } else if (currentMatch.bracketType === "losers") {
          const winners = currentRoundMatches.map((m) => m.winner);
          if (winners.length > 1) {
            const nextRound = currentMatch.round + 1;
            for (let i = 0; i < winners.length; i += 2) {
              if (winners[i + 1]) {
                updatedBracket.push({
                  id: Date.now() + Math.random() * 5000,
                  player1: winners[i],
                  player2: winners[i + 1],
                  winner: null,
                  loser: null,
                  round: nextRound,
                  bracketType: "losers",
                });
              }
            }
          } else if (winners.length === 1) {
            const winnersMatches = updatedBracket.filter(
              (m) => m.bracketType === "winners"
            );
            const winnersChamp =
              winnersMatches[winnersMatches.length - 1]?.winner;

            if (winnersChamp) {
              updatedBracket.push({
                id: Date.now() + Math.random() * 6000,
                player1: winnersChamp,
                player2: winners[0],
                winner: null,
                loser: null,
                round: 1,
                bracketType: "grand-final",
              });
            }
          }
        } else if (currentMatch.bracketType === "grand-final") {
          const winnersChamp = updatedBracket.filter(
            (m) => m.bracketType === "winners"
          )[
            updatedBracket.filter((m) => m.bracketType === "winners").length - 1
          ]?.winner;
          if (winnerId !== winnersChamp) {
            const existingGrandFinals = updatedBracket.filter(
              (m) => m.bracketType === "grand-final"
            );
            if (existingGrandFinals.length === 1) {
              updatedBracket.push({
                id: Date.now() + Math.random() * 7000,
                player1: currentMatch.player1,
                player2: currentMatch.player2,
                winner: null,
                loser: null,
                round: 2,
                bracketType: "grand-final",
              });
            }
          }
        }
      }
    }

    const allDone = updatedBracket.every((m) => m.winner !== null);
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
    localStorage.setItem("tournaments", JSON.stringify(updated));
  };

  const sorted = [...players].sort((a, b) => b.rating - a.rating);

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
            onClick={() => setActiveTab("tournaments")}
            style={{
              flex: 1,
              padding: "15px",
              borderRadius: "8px",
              border: "none",
              background:
                activeTab === "tournaments" ? "#10b981" : "transparent",
              color: "white",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Tournaments
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
              }}
            >
              <h2 style={{ fontSize: "24px", fontWeight: "bold" }}>
                Player Rankings
              </h2>
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
                No players yet. Click "Add Player" to get started!
              </div>
            )}
          </div>
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
                  {t.gameType} • {t.format} • {t.status}
                </p>

                {t.status === "registration" && (
                  <div>
                    <p style={{ marginBottom: "10px" }}>
                      Players: {t.participants.length}/{t.maxPlayers}
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
                    {t.participants.length < t.maxPlayers && (
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            addToTournament(t.id, Number(e.target.value));
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
                  <div>
                    {t.format === "Double Elimination" ? (
                      <div>
                        <h4
                          style={{
                            fontWeight: "bold",
                            marginBottom: "15px",
                            color: "#fbbf24",
                          }}
                        >
                          Winners Bracket
                        </h4>
                        {[
                          ...new Set(
                            t.bracket
                              .filter((m) => m.bracketType === "winners")
                              .map((m) => m.round)
                          ),
                        ].map((round) => (
                          <div key={round} style={{ marginBottom: "20px" }}>
                            <h5
                              style={{
                                color: "#9ca3af",
                                fontSize: "14px",
                                marginBottom: "10px",
                              }}
                            >
                              Winners Round {round}
                            </h5>
                            {t.bracket
                              .filter(
                                (m) =>
                                  m.round === round &&
                                  m.bracketType === "winners"
                              )
                              .map((match) => {
                                const p1 = players.find(
                                  (p) => p.id === match.player1
                                );
                                const p2 = players.find(
                                  (p) => p.id === match.player2
                                );
                                return (
                                  <div
                                    key={match.id}
                                    style={{
                                      background: "#374151",
                                      padding: "15px",
                                      borderRadius: "5px",
                                      marginBottom: "10px",
                                      borderLeft: "4px solid #fbbf24",
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
                                            fontWeight:
                                              match.winner === match.player1
                                                ? "bold"
                                                : "normal",
                                            color:
                                              match.winner === match.player1
                                                ? "#10b981"
                                                : "white",
                                          }}
                                        >
                                          {p1?.name || "BYE"}{" "}
                                          {match.winner === match.player1 &&
                                            "✓"}
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
                                            fontWeight:
                                              match.winner === match.player2
                                                ? "bold"
                                                : "normal",
                                            color:
                                              match.winner === match.player2
                                                ? "#10b981"
                                                : "white",
                                          }}
                                        >
                                          {p2?.name || "BYE"}{" "}
                                          {match.winner === match.player2 &&
                                            "✓"}
                                        </div>
                                      </div>
                                      {!match.winner &&
                                        match.player1 &&
                                        match.player2 && (
                                          <div
                                            style={{
                                              display: "flex",
                                              flexDirection: "column",
                                              gap: "5px",
                                            }}
                                          >
                                            <button
                                              onClick={() =>
                                                recordTournamentWinner(
                                                  t.id,
                                                  match.id,
                                                  match.player1
                                                )
                                              }
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
                                              onClick={() =>
                                                recordTournamentWinner(
                                                  t.id,
                                                  match.id,
                                                  match.player2
                                                )
                                              }
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
                              })}
                          </div>
                        ))}

                        {t.bracket.some((m) => m.bracketType === "losers") && (
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
                            {[
                              ...new Set(
                                t.bracket
                                  .filter((m) => m.bracketType === "losers")
                                  .map((m) => m.round)
                              ),
                            ].map((round) => (
                              <div key={round} style={{ marginBottom: "20px" }}>
                                <h5
                                  style={{
                                    color: "#9ca3af",
                                    fontSize: "14px",
                                    marginBottom: "10px",
                                  }}
                                >
                                  Losers Round {round}
                                </h5>
                                {t.bracket
                                  .filter(
                                    (m) =>
                                      m.round === round &&
                                      m.bracketType === "losers"
                                  )
                                  .map((match) => {
                                    const p1 = players.find(
                                      (p) => p.id === match.player1
                                    );
                                    const p2 = players.find(
                                      (p) => p.id === match.player2
                                    );
                                    return (
                                      <div
                                        key={match.id}
                                        style={{
                                          background: "#374151",
                                          padding: "15px",
                                          borderRadius: "5px",
                                          marginBottom: "10px",
                                          borderLeft: "4px solid #ef4444",
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
                                                fontWeight:
                                                  match.winner === match.player1
                                                    ? "bold"
                                                    : "normal",
                                                color:
                                                  match.winner === match.player1
                                                    ? "#10b981"
                                                    : "white",
                                              }}
                                            >
                                              {p1?.name || "BYE"}{" "}
                                              {match.winner === match.player1 &&
                                                "✓"}
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
                                                fontWeight:
                                                  match.winner === match.player2
                                                    ? "bold"
                                                    : "normal",
                                                color:
                                                  match.winner === match.player2
                                                    ? "#10b981"
                                                    : "white",
                                              }}
                                            >
                                              {p2?.name || "BYE"}{" "}
                                              {match.winner === match.player2 &&
                                                "✓"}
                                            </div>
                                          </div>
                                          {!match.winner &&
                                            match.player1 &&
                                            match.player2 && (
                                              <div
                                                style={{
                                                  display: "flex",
                                                  flexDirection: "column",
                                                  gap: "5px",
                                                }}
                                              >
                                                <button
                                                  onClick={() =>
                                                    recordTournamentWinner(
                                                      t.id,
                                                      match.id,
                                                      match.player1
                                                    )
                                                  }
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
                                                  onClick={() =>
                                                    recordTournamentWinner(
                                                      t.id,
                                                      match.id,
                                                      match.player2
                                                    )
                                                  }
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
                                  })}
                              </div>
                            ))}
                          </>
                        )}

                        {t.bracket.some(
                          (m) => m.bracketType === "grand-final"
                        ) && (
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
                              .filter((m) => m.bracketType === "grand-final")
                              .map((match, idx) => {
                                const p1 = players.find(
                                  (p) => p.id === match.player1
                                );
                                const p2 = players.find(
                                  (p) => p.id === match.player2
                                );
                                return (
                                  <div
                                    key={match.id}
                                    style={{ marginBottom: "10px" }}
                                  >
                                    {idx > 0 && (
                                      <p
                                        style={{
                                          fontSize: "12px",
                                          color: "#9ca3af",
                                          marginBottom: "10px",
                                        }}
                                      >
                                        (Bracket Reset - Losers bracket winner
                                        won first grand final)
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
                                              fontWeight:
                                                match.winner === match.player1
                                                  ? "bold"
                                                  : "normal",
                                              color:
                                                match.winner === match.player1
                                                  ? "#10b981"
                                                  : "white",
                                            }}
                                          >
                                            {p1?.name}{" "}
                                            {match.winner === match.player1 &&
                                              "✓ CHAMPION"}
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
                                              fontWeight:
                                                match.winner === match.player2
                                                  ? "bold"
                                                  : "normal",
                                              color:
                                                match.winner === match.player2
                                                  ? "#10b981"
                                                  : "white",
                                            }}
                                          >
                                            {p2?.name}{" "}
                                            {match.winner === match.player2 &&
                                              "✓ CHAMPION"}
                                          </div>
                                        </div>
                                        {!match.winner && (
                                          <div
                                            style={{
                                              display: "flex",
                                              flexDirection: "column",
                                              gap: "5px",
                                            }}
                                          >
                                            <button
                                              onClick={() =>
                                                recordTournamentWinner(
                                                  t.id,
                                                  match.id,
                                                  match.player1
                                                )
                                              }
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
                                              onClick={() =>
                                                recordTournamentWinner(
                                                  t.id,
                                                  match.id,
                                                  match.player2
                                                )
                                              }
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
                    ) : (
                      <div>
                        <h4
                          style={{ fontWeight: "bold", marginBottom: "10px" }}
                        >
                          Bracket
                        </h4>
                        {[...new Set(t.bracket.map((m) => m.round))].map(
                          (round) => (
                            <div key={round} style={{ marginBottom: "20px" }}>
                              <h5
                                style={{
                                  color: "#9ca3af",
                                  fontSize: "14px",
                                  marginBottom: "10px",
                                }}
                              >
                                {round ===
                                  Math.max(...t.bracket.map((m) => m.round)) &&
                                t.bracket.filter((m) => m.round === round)
                                  .length === 1
                                  ? "Finals"
                                  : `Round ${round}`}
                              </h5>
                              {t.bracket
                                .filter((m) => m.round === round)
                                .map((match) => {
                                  const p1 = players.find(
                                    (p) => p.id === match.player1
                                  );
                                  const p2 = players.find(
                                    (p) => p.id === match.player2
                                  );
                                  return (
                                    <div
                                      key={match.id}
                                      style={{
                                        background: "#374151",
                                        padding: "15px",
                                        borderRadius: "5px",
                                        marginBottom: "10px",
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
                                              fontWeight:
                                                match.winner === match.player1
                                                  ? "bold"
                                                  : "normal",
                                              color:
                                                match.winner === match.player1
                                                  ? "#10b981"
                                                  : "white",
                                            }}
                                          >
                                            {p1?.name || "BYE"}{" "}
                                            {match.winner === match.player1 &&
                                              "✓"}
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
                                              fontWeight:
                                                match.winner === match.player2
                                                  ? "bold"
                                                  : "normal",
                                              color:
                                                match.winner === match.player2
                                                  ? "#10b981"
                                                  : "white",
                                            }}
                                          >
                                            {p2?.name || "BYE"}{" "}
                                            {match.winner === match.player2 &&
                                              "✓"}
                                          </div>
                                        </div>
                                        {!match.winner &&
                                          match.player1 &&
                                          match.player2 && (
                                            <div
                                              style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: "5px",
                                              }}
                                            >
                                              <button
                                                onClick={() =>
                                                  recordTournamentWinner(
                                                    t.id,
                                                    match.id,
                                                    match.player1
                                                  )
                                                }
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
                                                onClick={() =>
                                                  recordTournamentWinner(
                                                    t.id,
                                                    match.id,
                                                    match.player2
                                                  )
                                                }
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
                                })}
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
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
                  onClick={addPlayer}
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
                  onClick={() => setShowAdd(false)}
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
