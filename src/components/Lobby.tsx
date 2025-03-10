import React, { useState } from 'react';
import styled from 'styled-components';
import { usePeer } from '../contexts/PeerContext';
import { MAX_PLAYERS, Faction, FACTION_INFO } from '../types';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  background-color: #282c34;
  color: white;
  min-height: 100vh;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: #61dafb;
`;

const LobbyCode = styled.div`
  padding: 0.75rem 1.5rem;
  background-color: #3a3f4b;
  border-radius: 4px;
  margin-bottom: 2rem;
  font-size: 1.25rem;
  
  span {
    font-weight: bold;
    color: #61dafb;
    margin-left: 0.5rem;
  }
`;

const Card = styled.div`
  background-color: #3a3f4b;
  border-radius: 8px;
  padding: 2rem;
  width: 100%;
  max-width: 600px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
`;

const PlayerList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
`;

const PlayerItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: #444a57;
  border-radius: 4px;
`;

const PlayerName = styled.div<{ color: string }>`
  display: flex;
  align-items: center;
  
  &::before {
    content: '';
    display: inline-block;
    width: 1rem;
    height: 1rem;
    border-radius: 50%;
    background-color: ${props => props.color};
    margin-right: 0.75rem;
  }
`;

const PlayerDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const FactionName = styled.div`
  font-size: 0.8rem;
  opacity: 0.8;
`;

const HostBadge = styled.span`
  background-color: #ffd700;
  color: #282c34;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: bold;
  margin-left: 0.75rem;
`;

const ReadyStatus = styled.div<{ isReady: boolean }>`
  color: ${props => props.isReady ? '#4ade80' : '#f87171'};
  font-weight: ${props => props.isReady ? 'bold' : 'normal'};
`;

const WaitingMessage = styled.div`
  padding: 1rem;
  background-color: #444a57;
  border-radius: 4px;
  text-align: center;
  margin-bottom: 1.5rem;
  font-style: italic;
`;

const Button = styled.button<{ primary?: boolean }>`
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  background-color: ${props => props.primary ? '#61dafb' : '#4a5568'};
  color: ${props => props.primary ? '#282c34' : 'white'};
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  
  &:hover {
    background-color: ${props => props.primary ? '#4fa8d1' : '#3e4451'};
  }
  
  &:disabled {
    background-color: #4a5568;
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  &:not(:last-child) {
    margin-bottom: 1rem;
  }
`;

const FactionSelectionContainer = styled.div`
  margin-bottom: 2rem;
`;

const FactionSelectionTitle = styled.h3`
  margin-bottom: 1rem;
`;

const FactionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const FactionCard = styled.div<{ selected: boolean, color: string }>`
  background-color: #444a57;
  border: 2px solid ${props => props.selected ? props.color : 'transparent'};
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  }
`;

const FactionHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const FactionIcon = styled.div<{ color: string }>`
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  background-color: ${props => props.color};
  margin-right: 0.75rem;
`;

const FactionTitle = styled.h4`
  margin: 0;
`;

const FactionDescription = styled.p`
  font-size: 0.8rem;
  margin: 0.5rem 0 0;
  opacity: 0.8;
`;

const ConstructsList = styled.div`
  font-size: 0.8rem;
  margin-top: 0.5rem;
`;

const Construct = styled.div`
  display: flex;
  justify-content: space-between;
  opacity: 0.8;
`;

const Lobby: React.FC = () => {
  const { 
    myId, 
    lobbyState, 
    toggleReady,
    changeFaction,
    startGame,
    resetGame
  } = usePeer();
  
  const [selectedFaction, setSelectedFaction] = useState<Faction | null>(null);
  
  if (!lobbyState) {
    return <div>Loading...</div>;
  }
  
  const isHost = myId === lobbyState.host;
  const players = Object.values(lobbyState.players);
  const myPlayer = lobbyState.players[myId];
  const allPlayersReady = players.every(player => player.isReady);
  const canStartGame = allPlayersReady && players.length >= 2;
  
  const handleFactionSelect = (faction: Faction) => {
    if (myPlayer.isReady) return; // Can't change faction when ready
    
    setSelectedFaction(faction);
    changeFaction(faction);
  };
  
  return (
    <Container>
      <Title>Wartiles Online - Lobby</Title>
      
      <LobbyCode>
        Lobby Code: <span>{lobbyState.lobbyId}</span>
      </LobbyCode>
      
      <Card>
        <h2>Players ({players.length}/{MAX_PLAYERS})</h2>
        
        <PlayerList>
          {players.map(player => (
            <PlayerItem key={player.id}>
              <PlayerName color={player.color}>
                <PlayerDetails>
                  {player.name}
                  {player.id === lobbyState.host && (
                    <HostBadge>HOST</HostBadge>
                  )}
                  {player.faction && (
                    <FactionName>{FACTION_INFO[player.faction].name}</FactionName>
                  )}
                </PlayerDetails>
              </PlayerName>
              <ReadyStatus isReady={player.isReady}>
                {player.isReady ? 'Ready' : 'Not Ready'}
              </ReadyStatus>
            </PlayerItem>
          ))}
          
          {Array.from({ length: MAX_PLAYERS - players.length }).map((_, index) => (
            <PlayerItem key={`empty-${index}`} style={{ opacity: 0.5 }}>
              <div>Waiting for player...</div>
            </PlayerItem>
          ))}
        </PlayerList>
        
        {!myPlayer.isReady && (
          <FactionSelectionContainer>
            <FactionSelectionTitle>Choose Your Faction</FactionSelectionTitle>
            <FactionGrid>
              {Object.values(Faction).map(faction => (
                <FactionCard 
                  key={faction}
                  selected={myPlayer.faction === faction}
                  color={FACTION_INFO[faction].baseColor}
                  onClick={() => handleFactionSelect(faction)}
                >
                  <FactionHeader>
                    <FactionIcon color={FACTION_INFO[faction].baseColor} />
                    <FactionTitle>{FACTION_INFO[faction].name}</FactionTitle>
                  </FactionHeader>
                  <FactionDescription>
                    {FACTION_INFO[faction].description}
                  </FactionDescription>
                  <ConstructsList>
                    <Construct>
                      <span>G:</span>
                      <span>{FACTION_INFO[faction].constructs.GOLD}</span>
                    </Construct>
                    <Construct>
                      <span>U:</span>
                      <span>{FACTION_INFO[faction].constructs.UNIT}</span>
                    </Construct>
                    <Construct>
                      <span>D:</span>
                      <span>{FACTION_INFO[faction].constructs.DEFENSE}</span>
                    </Construct>
                  </ConstructsList>
                </FactionCard>
              ))}
            </FactionGrid>
          </FactionSelectionContainer>
        )}
        
        {players.length < 2 && (
          <WaitingMessage>
            Waiting for more players to join...
          </WaitingMessage>
        )}
        
        {isHost && canStartGame && (
          <Button primary onClick={startGame}>
            Start Game
          </Button>
        )}
        
        <Button onClick={toggleReady} disabled={!myPlayer.faction && !myPlayer.isReady}>
          {myPlayer.isReady ? 'Not Ready' : 'Ready Up'}
        </Button>
      </Card>
    </Container>
  );
};

export default Lobby; 