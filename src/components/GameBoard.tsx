import React from 'react';
import styled from 'styled-components';
import { usePeer } from '../contexts/PeerContext';
import { GRID_SIZE } from '../types';

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
  font-size: 2rem;
  margin-bottom: 1rem;
  color: #61dafb;
`;

const GameInfo = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  max-width: 800px;
  margin-bottom: 1.5rem;
`;

const PlayerInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const PlayerList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
  max-width: 800px;
`;

const PlayerCard = styled.div<{ active?: boolean, color: string }>`
  background-color: #3a3f4b;
  border: ${props => props.active ? `2px solid ${props.color}` : '2px solid transparent'};
  border-radius: 8px;
  padding: 1rem;
  min-width: 150px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
`;

const ColorIndicator = styled.div<{ color: string }>`
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background-color: ${props => props.color};
  margin-right: 0.5rem;
  display: inline-block;
`;

const GridContainer = styled.div`
  display: flex;
  flex-direction: column;
  background-color: #3a3f4b;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
`;

const GridRow = styled.div`
  display: flex;
`;

const GridCell = styled.div<{ owner: string | null, color: string | null, isAdjacent: boolean }>`
  width: 20px;
  height: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background-color: ${props => props.owner ? props.color : '#444a57'};
  cursor: ${props => props.isAdjacent ? 'pointer' : 'default'};
  opacity: ${props => props.isAdjacent ? '0.8' : '1'};
  
  &:hover {
    opacity: ${props => props.isAdjacent ? '0.6' : '1'};
    transform: ${props => props.isAdjacent ? 'scale(1.1)' : 'none'};
    z-index: ${props => props.isAdjacent ? '1' : '0'};
    transition: all 0.1s ease;
  }
`;

const Button = styled.button`
  width: 100%;
  max-width: 200px;
  padding: 0.75rem;
  font-size: 1rem;
  background-color: #61dafb;
  color: #282c34;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  
  &:hover {
    background-color: #4fa8d1;
  }
`;

const TurnIndicator = styled.div`
  background-color: #3a3f4b;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  margin-bottom: 1.5rem;
  text-align: center;
  font-size: 1.25rem;
  
  span {
    font-weight: bold;
    margin-left: 0.5rem;
  }
`;

const GameBoard: React.FC = () => {
  const { myId, gameState, lobbyState, claimTile, resetGame } = usePeer();
  
  if (!gameState || !lobbyState) {
    return <div>Loading...</div>;
  }
  
  const players = Object.values(gameState.players);
  const isMyTurn = gameState.currentTurn === myId;
  const currentPlayer = gameState.players[gameState.currentTurn];
  
  // Calculate adjacent tiles to player's owned tiles
  const getAdjacentCells = () => {
    if (!isMyTurn) return new Set<string>();
    
    const adjacentSet = new Set<string>();
    const myTiles = gameState.players[myId].tiles;
    
    myTiles.forEach(tile => {
      const { x, y } = tile;
      
      // Check the four adjacent cells
      [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 }
      ].forEach(({ dx, dy }) => {
        const adjX = x + dx;
        const adjY = y + dy;
        
        // Check if the adjacent cell is within the grid bounds
        if (
          adjX >= 0 && adjX < GRID_SIZE && 
          adjY >= 0 && adjY < GRID_SIZE &&
          // And if it's not already owned
          gameState.grid[adjY][adjX].ownerId === null
        ) {
          adjacentSet.add(`${adjX},${adjY}`);
        }
      });
    });
    
    return adjacentSet;
  };
  
  const adjacentCells = getAdjacentCells();
  
  // Calculate scores
  const calculateScores = () => {
    const scores: Record<string, number> = {};
    
    // Initialize scores for all players
    Object.keys(gameState.players).forEach(playerId => {
      scores[playerId] = 0;
    });
    
    // Count tiles for each player
    gameState.grid.forEach(row => {
      row.forEach(cell => {
        if (cell.ownerId) {
          scores[cell.ownerId] += 1;
        }
      });
    });
    
    return scores;
  };
  
  const scores = calculateScores();
  
  // Handle tile click
  const handleCellClick = (x: number, y: number) => {
    if (isMyTurn && adjacentCells.has(`${x},${y}`)) {
      claimTile(x, y);
    }
  };
  
  return (
    <Container>
      <Title>Game in Progress</Title>
      
      <PlayerList>
        {players.map(player => (
          <PlayerCard 
            key={player.id} 
            active={player.id === gameState.currentTurn}
            color={player.color}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
              <ColorIndicator color={player.color} />
              <strong>{player.name}</strong>
            </div>
            <div>Tiles: {scores[player.id]}</div>
          </PlayerCard>
        ))}
      </PlayerList>
      
      <TurnIndicator>
        Current Turn: 
        <span style={{ color: currentPlayer.color }}>
          {currentPlayer.name}
          {currentPlayer.id === myId ? ' (You)' : ''}
        </span>
      </TurnIndicator>
      
      <GridContainer>
        {gameState.grid.map((row, y) => (
          <GridRow key={y}>
            {row.map((cell, x) => (
              <GridCell 
                key={`${x},${y}`}
                owner={cell.ownerId}
                color={cell.color}
                isAdjacent={adjacentCells.has(`${x},${y}`)}
                onClick={() => handleCellClick(x, y)}
              />
            ))}
          </GridRow>
        ))}
      </GridContainer>
      
      <Button onClick={resetGame}>
        End Game
      </Button>
    </Container>
  );
};

export default GameBoard; 