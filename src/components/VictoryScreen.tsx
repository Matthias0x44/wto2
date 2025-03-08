import React, { useEffect } from 'react';
import styled from 'styled-components';
import { usePeer } from '../contexts/PeerContext';
import { FACTION_INFO } from '../types';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background-color: #282c34;
  color: white;
  min-height: 100vh;
  text-align: center;
`;

const Title = styled.h1`
  font-size: 3rem;
  margin-bottom: 1rem;
  color: #ffd700;
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
  animation: pulse 2s infinite;

  @keyframes pulse {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
    100% {
      transform: scale(1);
    }
  }
`;

const WinnerCard = styled.div`
  background-color: #3a3f4b;
  border-radius: 8px;
  padding: 2rem;
  width: 100%;
  max-width: 600px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
  margin-bottom: 2rem;
`;

const WinnerName = styled.h2`
  font-size: 2rem;
  margin-bottom: 0.5rem;
`;

const FactionName = styled.h3<{ color: string }>`
  font-size: 1.5rem;
  color: ${props => props.color};
  margin-bottom: 2rem;
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div`
  background-color: #444a57;
  border-radius: 4px;
  padding: 1rem;
`;

const StatTitle = styled.div`
  font-size: 0.8rem;
  opacity: 0.7;
  margin-bottom: 0.5rem;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
`;

const Button = styled.button`
  padding: 0.75rem 2rem;
  font-size: 1.25rem;
  background-color: #61dafb;
  color: #282c34;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  
  &:hover {
    background-color: #4fa8d1;
  }
  
  transition: all 0.2s ease;
`;

const VictoryScreen: React.FC = () => {
  const { 
    gameState, 
    resetGame 
  } = usePeer();
  
  useEffect(() => {
    // Auto-reset after 10 seconds
    const timer = setTimeout(() => {
      resetGame();
    }, 10000);
    
    return () => clearTimeout(timer);
  }, [resetGame]);
  
  if (!gameState || !gameState.winner) {
    return null;
  }
  
  const winner = gameState.players[gameState.winner];
  const totalTiles = winner.tiles.length;
  
  return (
    <Container>
      <Title>Victory!</Title>
      
      <WinnerCard>
        <WinnerName>{winner.name}</WinnerName>
        <FactionName color={FACTION_INFO[winner.faction].baseColor}>
          {FACTION_INFO[winner.faction].name}
        </FactionName>
        
        <StatGrid>
          <StatCard>
            <StatTitle>Tiles Captured</StatTitle>
            <StatValue>{totalTiles}</StatValue>
          </StatCard>
          <StatCard>
            <StatTitle>Gold Collected</StatTitle>
            <StatValue>{winner.gold.toFixed(0)}</StatValue>
          </StatCard>
          <StatCard>
            <StatTitle>Units Built</StatTitle>
            <StatValue>{winner.units.toFixed(0)}</StatValue>
          </StatCard>
          <StatCard>
            <StatTitle>Constructs Built</StatTitle>
            <StatValue>{winner.tiles.length}</StatValue> {/* simplification */}
          </StatCard>
        </StatGrid>
        
        <Button onClick={resetGame}>
          Return to Lobby
        </Button>
      </WinnerCard>
    </Container>
  );
};

export default VictoryScreen; 