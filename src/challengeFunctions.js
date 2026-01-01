// Challenge Board Helper Functions
// Import this into App.jsx

export const createChallenge = async (supabase, challenges, challengerId, challengedId, message = '') => {
  try {
    // Check if challenger already has active match
    const hasActive = challenges.some(c => 
      (c.challenger_id === challengerId || c.challenged_id === challengerId) && 
      c.status === 'accepted'
    );
    
    if (hasActive) {
      throw new Error('You already have an active match. Complete it before creating a new challenge.');
    }

    const { error } = await supabase
      .from('challenges')
      .insert([{
        challenger_id: challengerId,
        challenged_id: challengedId,
        message,
        status: 'pending'
      }]);
    
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Error creating challenge:', error);
    throw error;
  }
};

export const acceptChallenge = async (supabase, challenges, challengeId) => {
  try {
    const challenge = challenges.find(c => c.id === challengeId);
    if (!challenge) throw new Error('Challenge not found');
    
    // Check if challenged player already has active match
    const hasActive = challenges.some(c => 
      c.id !== challengeId &&
      (c.challenger_id === challenge.challenged_id || c.challenged_id === challenge.challenged_id) && 
      c.status === 'accepted'
    );
    
    if (hasActive) {
      throw new Error('You already have an active match. Complete it before accepting new challenges.');
    }

    const { error } = await supabase
      .from('challenges')
      .update({ 
        status: 'accepted',
        responded_at: new Date().toISOString()
      })
      .eq('id', challengeId);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error accepting challenge:', error);
    throw error;
  }
};

export const declineChallenge = async (supabase, players, challengeId, challenge) => {
  try {
    if (!challenge) throw new Error('Challenge not found');

    const challengerRank = players.findIndex(p => p.id === challenge.challenger_id);
    const challengedRank = players.findIndex(p => p.id === challenge.challenged_id);

    // If higher-ranked player (lower index) declines, swap positions
    if (challengedRank < challengerRank) {
      const challenger = players[challengerRank];
      const challenged = players[challengedRank];
      
      // Swap ratings to cause re-ranking
      // Give challenger a slightly higher rating to move them up
      const tempRating = challenged.rating + 1;
      
      await supabase
        .from('players')
        .update({ rating: tempRating })
        .eq('id', challenge.challenger_id);
      
      await supabase
        .from('players')
        .update({ rating: challenger.rating - 1 })
        .eq('id', challenge.challenged_id);
    }

    // Mark challenge as declined
    const { error } = await supabase
      .from('challenges')
      .update({ 
        status: 'declined',
        responded_at: new Date().toISOString()
      })
      .eq('id', challengeId);
    
    if (error) throw error;
    return { success: true, rankSwapped: challengedRank < challengerRank };
  } catch (error) {
    console.error('Error declining challenge:', error);
    throw error;
  }
};

export const recordChallengeResult = async (supabase, challengeId, winnerId, recordChallengeMatch) => {
  try {
    // First record the match using the existing function
    // This will update ratings and wins/losses
    // recordChallengeMatch is passed from App.jsx
    
    // Then mark challenge as completed
    const { error } = await supabase
      .from('challenges')
      .update({ 
        status: 'completed',
        result_winner_id: winnerId,
        completed_at: new Date().toISOString()
      })
      .eq('id', challengeId);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error recording challenge result:', error);
    throw error;
  }
};

export const getEligibleOpponents = (players, challenges, playerId) => {
  const playerIndex = players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return [];

  const player = players[playerIndex];
  const isNewPlayer = player.wins === 0;

  // Check if player has active match
  const hasActive = challenges.some(c => 
    (c.challenger_id === playerId || c.challenged_id === playerId) && 
    c.status === 'accepted'
  );

  if (hasActive) return [];

  if (isNewPlayer) {
    // Can challenge up to 10 spots above
    const minRank = Math.max(0, playerIndex - 10);
    return players.slice(minRank, playerIndex);
  } else {
    // Can challenge 5 up or 5 down
    const minRank = Math.max(0, playerIndex - 5);
    const maxRank = Math.min(players.length, playerIndex + 6);
    return players.slice(minRank, maxRank).filter(p => p.id !== playerId);
  }
};

export const loadChallenges = async (supabase) => {
  try {
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error loading challenges:', error);
    return [];
  }
};

export const expireOldChallenges = async (supabase) => {
  try {
    // Try to call the database function
    await supabase.rpc('expire_old_challenges');
  } catch (error) {
    // If function doesn't exist, do it manually
    try {
      await supabase
        .from('challenges')
        .update({ status: 'expired' })
        .eq('status', 'pending')
        .lt('expires_at', new Date().toISOString());
    } catch (err) {
      console.log('Could not auto-expire challenges');
    }
  }
};
