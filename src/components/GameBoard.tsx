import React, { useState } from 'react';
import styled from 'styled-components';
import { usePeer } from '../contexts/PeerContext';
import { GRID_SIZE, ConstructType, FACTION_INFO } from '../types';

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

const ResourcesContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background-color: #3a3f4b;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  width: 100%;
  max-width: 800px;
`;

const ResourceRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ResourceLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ResourceIcon = styled.div<{ type: 'gold' | 'unit' }>`
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  background-color: ${props => props.type === 'gold' ? '#ffd700' : '#f87171'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.8rem;
  color: #333;
`;

const ResourceValue = styled.div`
  font-weight: bold;
`;

const ResourceRate = styled.div`
  font-size: 0.8rem;
  opacity: 0.7;
`;

const TimerContainer = styled.div`
  background-color: #3a3f4b;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  margin-bottom: 1.5rem;
  text-align: center;
  font-size: 1.5rem;
  font-weight: bold;
  width: 100%;
  max-width: 800px;
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

const PlayerInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const PlayerHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
  width: 100%;
`;

const ColorIndicator = styled.div<{ color: string }>`
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background-color: ${props => props.color};
  margin-right: 0.5rem;
  display: inline-block;
`;

const PlayerStats = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.9rem;
  width: 100%;
`;

const Stat = styled.div`
  display: flex;
  justify-content: space-between;
`;

const GridContainer = styled.div`
  display: flex;
  flex-direction: column;
  background-color: #3a3f4b;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  max-width: 800px;
  overflow: auto;
`;

const GridRow = styled.div`
  display: flex;
`;

const GridCell = styled.div<{ owner: string | null, color: string | null, isClaimable: boolean, hasConstruct: boolean }>`
  position: relative;
  width: 20px;
  height: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background-color: ${props => props.owner ? props.color : '#444a57'};
  cursor: ${props => props.isClaimable ? 'pointer' : 'default'};
  opacity: ${props => props.isClaimable ? '0.8' : '1'};
  
  &:hover {
    opacity: ${props => props.isClaimable ? '0.6' : '1'};
    transform: ${props => props.isClaimable ? 'scale(1.1)' : 'none'};
    z-index: ${props => props.isClaimable ? '1' : '0'};
    transition: all 0.1s ease;
  }
`;

const ConstructIcon = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.7rem;
  font-weight: bold;
  color: white;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.8);
`;

const ActionPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background-color: #3a3f4b;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  width: 100%;
  max-width: 800px;
`;

const ActionsTitle = styled.h3`
  margin-top: 0;
  margin-bottom: 1rem;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
`;

const ActionButton = styled.button<{ active?: boolean, constructType?: string }>`
  flex: 1;
  padding: 0.75rem;
  min-width: 120px;
  font-size: 0.9rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  background-color: ${props => {
    if (props.active) {
      if (props.constructType === 'GOLD') return '#ffd700';
      if (props.constructType === 'UNIT') return '#f87171';
      if (props.constructType === 'DEFENSE') return '#60a5fa';
      return '#61dafb';
    }
    return '#4a5568';
  }};
  color: ${props => props.active ? '#333' : 'white'};
  
  &:hover {
    filter: brightness(1.1);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    filter: grayscale(1);
  }
`;

const SelectedTileInfo = styled.div`
  background-color: #444a57;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
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

const formatTime = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const GameBoard: React.FC = () => {
  const { 
    myId, 
    gameState, 
    lobbyState, 
    claimTile, 
    buildConstruct,
    demolishConstruct,
    resetGame 
  } = usePeer();
  
  const [selectedTile, setSelectedTile] = useState<{x: number, y: number} | null>(null);
  const [selectedAction, setSelectedAction] = useState<'claim' | 'build' | null>(null);
  const [selectedConstructType, setSelectedConstructType] = useState<ConstructType | null>(null);
  
  if (!gameState || !lobbyState) {
    return <div>Loading...</div>;
  }
  
  const players = Object.values(gameState.players);
  const myPlayer = gameState.players[myId];
  
  // Game time remaining
  const timeRemaining = gameState.gameEndTime ? gameState.gameEndTime - Date.now() : 0;
  
  // Calculate claimable cells
  const getClaimableCells = () => {
    const claimableSet = new Set<string>();
    
    // Your tiles
    const myTiles = myPlayer.tiles;
    
    // For each of your tiles, check adjacent tiles
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
          adjY >= 0 && adjY < GRID_SIZE
        ) {
          const cell = gameState.grid[adjY][adjX];
          
          // Cell can be claimed if:
          // 1. It's not owned by you
          // 2. You have enough resources to claim it
          
          const goldCost = getGoldCostForNewTile(cell);
          const unitCost = getUnitCostForTile(cell);
          
          if (
            (cell.ownerId === null && myPlayer.gold >= goldCost) ||
            (cell.ownerId !== null && cell.ownerId !== myId && myPlayer.gold >= goldCost && myPlayer.units >= unitCost)
          ) {
            claimableSet.add(`${adjX},${adjY}`);
          }
        }
      });
    });
    
    return claimableSet;
  };
  
  // Calculate gold cost for claiming a new tile
  const getGoldCostForNewTile = (tile: typeof gameState.grid[0][0]) => {
    // Base cost is 10
    const baseCost = 10;
    
    // Cost increases by 5 for each tile you already own
    const territorySizeCost = myPlayer.tiles.length * 2;
    
    return baseCost + territorySizeCost;
  };
  
  // Calculate unit cost for claiming a tile
  const getUnitCostForTile = (tile: typeof gameState.grid[0][0]) => {
    if (tile.ownerId === null) return 0;
    
    // Base cost is 5 units
    const baseCost = 5;
    
    // Add defense bonus from the tile
    return baseCost + (tile.defenseBonus || 0);
  };
  
  const claimableCells = getClaimableCells();
  
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
    // If we're in build mode and the tile is owned by us, select it
    if (selectedAction === 'build') {
      const tile = gameState.grid[y][x];
      
      if (tile.ownerId === myId) {
        setSelectedTile({ x, y });
      }
      return;
    }
    
    // Otherwise, we're in claim mode
    if (claimableCells.has(`${x},${y}`)) {
      const tile = gameState.grid[y][x];
      const goldCost = getGoldCostForNewTile(tile);
      const unitCost = getUnitCostForTile(tile);
      
      claimTile(x, y, goldCost, unitCost);
      setSelectedTile(null);
    }
  };
  
  // Handle build construct
  const handleBuildConstruct = () => {
    if (!selectedTile || !selectedConstructType) return;
    
    const { x, y } = selectedTile;
    buildConstruct(x, y, selectedConstructType);
    setSelectedTile(null);
    setSelectedConstructType(null);
  };
  
  // Handle demolish construct
  const handleDemolishConstruct = () => {
    if (!selectedTile) return;
    
    const { x, y } = selectedTile;
    demolishConstruct(x, y);
    setSelectedTile(null);
  };
  
  // Get information about the selected tile
  const getSelectedTileInfo = () => {
    if (!selectedTile) return null;
    
    const { x, y } = selectedTile;
    const tile = gameState.grid[y][x];
    
    if (tile.ownerId !== myId) return null;
    
    let constructInfo = 'None';
    if (tile.construct) {
      const constructType = tile.construct.type;
      // Use bracket notation for type safety
      const faction = myPlayer.faction;
      const factionInfo = FACTION_INFO[faction];
      constructInfo = factionInfo.constructs[constructType as keyof typeof factionInfo.constructs];
    }
    
    return {
      coords: `(${x}, ${y})`,
      construct: constructInfo,
      canBuild: !tile.construct,
      canDemolish: !!tile.construct
    };
  };
  
  const selectedTileInfo = getSelectedTileInfo();
  
  // Check if a construct can be built
  const canBuildConstruct = (type: ConstructType) => {
    if (!selectedTile) return false;
    
    const { x, y } = selectedTile;
    const tile = gameState.grid[y][x];
    
    if (tile.ownerId !== myId || tile.construct) return false;
    
    // Check resource requirements
    const goldCost = type === ConstructType.GOLD ? 20 : (type === ConstructType.UNIT ? 15 : 25);
    return myPlayer.gold >= goldCost;
  };
  
  // Get cost for a construct
  const getConstructCost = (type: ConstructType) => {
    switch (type) {
      case ConstructType.GOLD: return 20;
      case ConstructType.UNIT: return 15;
      case ConstructType.DEFENSE: return 25;
      default: return 0;
    }
  };
  
  return (
    <Container>
      <Title>Wartiles Online</Title>
      
      <TimerContainer>
        {formatTime(timeRemaining)}
      </TimerContainer>
      
      <ResourcesContainer>
        <ResourceRow>
          <ResourceLabel>
            <ResourceIcon type="gold">G</ResourceIcon>
            Gold
          </ResourceLabel>
          <div>
            <ResourceValue>{myPlayer.gold.toFixed(1)}</ResourceValue>
            <ResourceRate>(+{myPlayer.goldRate.toFixed(1)}/s)</ResourceRate>
          </div>
        </ResourceRow>
        <ResourceRow>
          <ResourceLabel>
            <ResourceIcon type="unit">U</ResourceIcon>
            Units
          </ResourceLabel>
          <div>
            <ResourceValue>{myPlayer.units.toFixed(1)}</ResourceValue>
            <ResourceRate>(+{myPlayer.unitRate.toFixed(1)}/s)</ResourceRate>
          </div>
        </ResourceRow>
      </ResourcesContainer>
      
      <PlayerList>
        {players.map(player => (
          <PlayerCard 
            key={player.id} 
            color={player.color}
          >
            <PlayerHeader>
              <ColorIndicator color={player.color} />
              <strong>{player.name}{player.id === myId ? ' (You)' : ''}</strong>
            </PlayerHeader>
            
            <PlayerStats>
              <Stat>
                <span>Faction:</span>
                <span>{FACTION_INFO[player.faction].name}</span>
              </Stat>
              <Stat>
                <span>Tiles:</span>
                <span>{scores[player.id]}</span>
              </Stat>
              <Stat>
                <span>Gold Rate:</span>
                <span>+{player.goldRate.toFixed(1)}/s</span>
              </Stat>
              <Stat>
                <span>Unit Rate:</span>
                <span>+{player.unitRate.toFixed(1)}/s</span>
              </Stat>
            </PlayerStats>
          </PlayerCard>
        ))}
      </PlayerList>
      
      <GridContainer className="grid-container">
        {gameState.grid.map((row, y) => (
          <GridRow key={y}>
            {row.map((cell, x) => (
              <GridCell 
                key={`${x},${y}`}
                owner={cell.ownerId}
                color={cell.ownerId ? gameState.players[cell.ownerId].color : null}
                isClaimable={claimableCells.has(`${x},${y}`)}
                hasConstruct={!!cell.construct}
                onClick={() => handleCellClick(x, y)}
                data-selected={selectedTile && selectedTile.x === x && selectedTile.y === y}
              >
                {cell.construct && (
                  <ConstructIcon>
                    {cell.construct.type === ConstructType.GOLD ? 'G' : 
                     cell.construct.type === ConstructType.UNIT ? 'U' : 'D'}
                  </ConstructIcon>
                )}
              </GridCell>
            ))}
          </GridRow>
        ))}
      </GridContainer>
      
      <ActionPanel>
        <ActionsTitle>Actions</ActionsTitle>
        
        <ActionButtons>
          <ActionButton 
            active={selectedAction === 'claim'}
            onClick={() => { 
              setSelectedAction('claim');
              setSelectedTile(null);
              setSelectedConstructType(null);
            }}
          >
            Claim Tiles
          </ActionButton>
          <ActionButton 
            active={selectedAction === 'build'}
            onClick={() => { 
              setSelectedAction('build');
              setSelectedTile(null);
              setSelectedConstructType(null);
            }}
          >
            Build/Demolish
          </ActionButton>
        </ActionButtons>
        
        {selectedAction === 'build' && selectedTile && selectedTileInfo && (
          <>
            <SelectedTileInfo>
              <h4>Selected Tile: {selectedTileInfo.coords}</h4>
              <p>Current Construct: {selectedTileInfo.construct}</p>
            </SelectedTileInfo>
            
            {selectedTileInfo.canBuild ? (
              <>
                <h4>Build Construct:</h4>
                <ActionButtons>
                  {Object.values(ConstructType).filter(type => type !== ConstructType.NONE).map(type => {
                    const faction = myPlayer.faction;
                    const factionInfo = FACTION_INFO[faction];
                    const constructName = factionInfo.constructs[type as keyof typeof factionInfo.constructs];
                    
                    return (
                      <ActionButton 
                        key={type}
                        constructType={type}
                        active={selectedConstructType === type}
                        disabled={!canBuildConstruct(type)}
                        onClick={() => setSelectedConstructType(type)}
                      >
                        {constructName}
                        <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                          Cost: {getConstructCost(type)} Gold
                        </div>
                      </ActionButton>
                    );
                  })}
                </ActionButtons>
                
                <Button 
                  onClick={handleBuildConstruct}
                  disabled={!selectedConstructType}
                  style={{ marginTop: '1rem' }}
                >
                  Build
                </Button>
              </>
            ) : selectedTileInfo.canDemolish ? (
              <Button onClick={handleDemolishConstruct}>
                Demolish Construct
              </Button>
            ) : null}
          </>
        )}
      </ActionPanel>
    </Container>
  );
};

export default GameBoard; 