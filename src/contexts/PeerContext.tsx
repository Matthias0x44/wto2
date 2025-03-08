import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import Peer from 'simple-peer';
import { v4 as uuidv4 } from 'uuid';
import { 
  PeerConnectionsType, 
  PeerMessage, 
  LobbyState, 
  GameState, 
  Player, 
  GRID_SIZE, 
  Tile, 
  Faction,
  ConstructType,
  GAME_DURATION_MS,
  FACTION_INFO
} from '../types';

interface PeerContextProps {
  myId: string;
  playerName: string;
  setPlayerName: (name: string) => void;
  lobbyState: LobbyState | null;
  gameState: GameState | null;
  createLobby: () => string;
  joinLobby: (lobbyId: string) => void;
  toggleReady: () => void;
  changeFaction: (faction: Faction) => void;
  startGame: () => void;
  claimTile: (x: number, y: number, goldCost: number, unitCost: number) => boolean;
  buildConstruct: (x: number, y: number, constructType: ConstructType) => boolean;
  demolishConstruct: (x: number, y: number) => boolean;
  peerConnections: PeerConnectionsType;
  isInLobby: boolean;
  lobbyError: string | null;
  resetGame: () => void;
}

interface PeerProviderProps {
  children: ReactNode;
}

const PeerContext = createContext<PeerContextProps | undefined>(undefined);

// Initial colors for players
const PLAYER_COLORS = ['#FF5733', '#33FF57', '#3357FF'];

export const PeerProvider: React.FC<PeerProviderProps> = ({ children }) => {
  const [myId] = useState<string>(uuidv4());
  const [playerName, setPlayerName] = useState<string>('');
  const [peerConnections, setPeerConnections] = useState<PeerConnectionsType>({});
  const [lobbyState, setLobbyState] = useState<LobbyState | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [lobbyError, setLobbyError] = useState<string | null>(null);

  // Initialize a new game state
  const initializeGameState = (players: Record<string, Player>): GameState => {
    // Create empty grid
    const grid: Tile[][] = Array(GRID_SIZE).fill(null).map((_, y) => 
      Array(GRID_SIZE).fill(null).map((_, x) => ({
        x,
        y,
        ownerId: null,
        color: null,
        construct: null,
        defenseBonus: 0
      }))
    );
    
    // Assign starting positions for each player (equidistant)
    const playerIds = Object.keys(players);
    const startingPositions = [
      { x: 3, y: 3 },
      { x: GRID_SIZE - 4, y: GRID_SIZE - 4 },
      { x: 3, y: GRID_SIZE - 4 }
    ];
    
    playerIds.forEach((playerId, index) => {
      if (index < startingPositions.length) {
        const pos = startingPositions[index];
        grid[pos.y][pos.x].ownerId = playerId;
        grid[pos.y][pos.x].color = players[playerId].color;
        
        // Update player's tiles
        players[playerId].tiles = [{ x: pos.x, y: pos.y }];
        
        // Set initial resources based on faction
        if (players[playerId].faction === Faction.ALIENS) {
          players[playerId].unitRate = 1;
        }
      }
    });
    
    return {
      gameStarted: true,
      currentTurn: playerIds[0], // First player starts (doesn't matter for real-time game)
      grid,
      players,
      gameEndTime: Date.now() + GAME_DURATION_MS,
      gameOver: false,
      winner: null
    };
  };

  // Create a new lobby
  const createLobby = (): string => {
    const lobbyId = uuidv4().substring(0, 6);
    const player: Player = {
      id: myId,
      name: playerName,
      isReady: false,
      color: FACTION_INFO[Faction.HUMANS].baseColor, // Default to Humans
      faction: Faction.HUMANS,
      gold: 0,
      units: 0,
      goldRate: 1, // Base rate
      unitRate: 0,
      tiles: []
    };
    
    const newLobbyState: LobbyState = {
      lobbyId,
      players: { [myId]: player },
      host: myId,
      gameStarted: false
    };
    
    setLobbyState(newLobbyState);
    return lobbyId;
  };

  // Join an existing lobby
  const joinLobby = (lobbyId: string) => {
    // Reset any previous state
    setLobbyError(null);
    
    try {
      // For now, we're mocking this - in a real app, we'd use a signaling server
      // to exchange information with peers in the lobby
      // This would be implemented with WebSocket or a similar technology
      
      // For testing in local tabs, we'll use localStorage to simulate signaling
      const storageKey = `lobby-${lobbyId}`;
      const existingData = localStorage.getItem(storageKey);
      
      if (!existingData) {
        // First player in this lobby on this browser
        const player: Player = {
          id: myId,
          name: playerName,
          isReady: false,
          color: FACTION_INFO[Faction.HUMANS].baseColor, // Default to Humans
          faction: Faction.HUMANS,
          gold: 0,
          units: 0,
          goldRate: 1, // Base rate
          unitRate: 0,
          tiles: []
        };
        
        const newLobbyState: LobbyState = {
          lobbyId,
          players: { [myId]: player },
          host: myId,
          gameStarted: false
        };
        
        localStorage.setItem(storageKey, JSON.stringify({
          lobbyState: newLobbyState,
          peerOffers: {}
        }));
        
        setLobbyState(newLobbyState);
      } else {
        // Other players exist in this lobby
        const lobbyData = JSON.parse(existingData);
        const existingLobbyState = lobbyData.lobbyState as LobbyState;
        
        if (Object.keys(existingLobbyState.players).length >= 3) {
          setLobbyError('Lobby is full');
          return;
        }
        
        // Find an available faction
        const usedFactions = Object.values(existingLobbyState.players).map(p => p.faction);
        const availableFactions = Object.values(Faction).filter(f => !usedFactions.includes(f));
        const selectedFaction = availableFactions.length > 0 ? availableFactions[0] : Faction.HUMANS;

        // Find an available color
        const usedColors = Object.values(existingLobbyState.players).map(p => p.color);
        let selectedColor = FACTION_INFO[selectedFaction].baseColor;
        if (usedColors.includes(selectedColor)) {
          // Find any available faction color
          Object.values(Faction).some(faction => {
            const color = FACTION_INFO[faction].baseColor;
            if (!usedColors.includes(color)) {
              selectedColor = color;
              return true;
            }
            return false;
          });
        }
        
        // Add self to players
        const player: Player = {
          id: myId,
          name: playerName,
          isReady: false,
          color: selectedColor,
          faction: selectedFaction,
          gold: 0,
          units: 0,
          goldRate: 1, // Base rate
          unitRate: 0,
          tiles: []
        };
        
        existingLobbyState.players[myId] = player;
        
        // Update localStorage
        lobbyData.lobbyState = existingLobbyState;
        localStorage.setItem(storageKey, JSON.stringify(lobbyData));
        
        setLobbyState(existingLobbyState);
        
        // In a real app, we'd establish WebRTC connections here
        // For now, we're just using localStorage as a mock
      }
    } catch (error) {
      console.error('Error joining lobby:', error);
      setLobbyError('Failed to join lobby');
    }
  };

  // Toggle player ready state
  const toggleReady = () => {
    if (!lobbyState) return;
    
    const updatedLobbyState = { ...lobbyState };
    updatedLobbyState.players[myId].isReady = !updatedLobbyState.players[myId].isReady;
    setLobbyState(updatedLobbyState);
    
    // Sync with other peers
    broadcastToPeers({
      type: 'READY_STATE',
      payload: updatedLobbyState.players[myId].isReady,
      senderId: myId
    });
    
    // Update localStorage (for testing)
    if (lobbyState) {
      const storageKey = `lobby-${lobbyState.lobbyId}`;
      const existingData = localStorage.getItem(storageKey);
      if (existingData) {
        const lobbyData = JSON.parse(existingData);
        lobbyData.lobbyState = updatedLobbyState;
        localStorage.setItem(storageKey, JSON.stringify(lobbyData));
      }
    }
  };

  // Change player faction
  const changeFaction = (faction: Faction) => {
    if (!lobbyState || lobbyState.players[myId].isReady) return;
    
    const updatedLobbyState = { ...lobbyState };
    updatedLobbyState.players[myId].faction = faction;
    updatedLobbyState.players[myId].color = FACTION_INFO[faction].baseColor;
    setLobbyState(updatedLobbyState);
    
    // Sync with other peers
    broadcastToPeers({
      type: 'READY_STATE', // Reusing this message type
      payload: { faction, color: FACTION_INFO[faction].baseColor },
      senderId: myId
    });
    
    // Update localStorage (for testing)
    if (lobbyState) {
      const storageKey = `lobby-${lobbyState.lobbyId}`;
      const existingData = localStorage.getItem(storageKey);
      if (existingData) {
        const lobbyData = JSON.parse(existingData);
        lobbyData.lobbyState = updatedLobbyState;
        localStorage.setItem(storageKey, JSON.stringify(lobbyData));
      }
    }
  };

  // Start the game
  const startGame = () => {
    if (!lobbyState) return;
    
    const newGameState = initializeGameState(lobbyState.players);
    setGameState(newGameState);
    
    // Update lobby state
    const updatedLobbyState = { ...lobbyState, gameStarted: true };
    setLobbyState(updatedLobbyState);
    
    // Broadcast to peers
    broadcastToPeers({
      type: 'START_GAME',
      payload: newGameState,
      senderId: myId
    });
    
    // Update localStorage (for testing)
    if (lobbyState) {
      const storageKey = `lobby-${lobbyState.lobbyId}`;
      const existingData = localStorage.getItem(storageKey);
      if (existingData) {
        const lobbyData = JSON.parse(existingData);
        lobbyData.lobbyState = updatedLobbyState;
        lobbyData.gameState = newGameState;
        localStorage.setItem(storageKey, JSON.stringify(lobbyData));
      }
    }
  };

  // Resource update loop
  useEffect(() => {
    if (!gameState || gameState.gameOver) return;
    
    const updateResources = () => {
      const updatedGameState = JSON.parse(JSON.stringify(gameState)) as GameState;
      const currentTime = Date.now();
      
      // Check if game should end
      if (gameState.gameEndTime && currentTime >= gameState.gameEndTime) {
        // Game over by time
        const scores: Record<string, number> = {};
        
        // Count tiles for each player
        Object.keys(updatedGameState.players).forEach(playerId => {
          scores[playerId] = updatedGameState.players[playerId].tiles.length;
        });
        
        // Find player with most tiles
        let maxScore = 0;
        let winner: string | null = null;
        
        Object.entries(scores).forEach(([playerId, score]) => {
          if (score > maxScore) {
            maxScore = score;
            winner = playerId;
          }
        });
        
        updatedGameState.gameOver = true;
        updatedGameState.winner = winner;
        
        setGameState(updatedGameState);
        
        // Update localStorage
        if (lobbyState) {
          const storageKey = `lobby-${lobbyState.lobbyId}`;
          const existingData = localStorage.getItem(storageKey);
          if (existingData) {
            const lobbyData = JSON.parse(existingData);
            lobbyData.gameState = updatedGameState;
            localStorage.setItem(storageKey, JSON.stringify(lobbyData));
          }
        }
        
        return;
      }
      
      // Update resources for each player
      Object.keys(updatedGameState.players).forEach(playerId => {
        const player = updatedGameState.players[playerId];
        
        // Skip players with no tiles (they're eliminated)
        if (player.tiles.length === 0) return;
        
        // Add resources based on rates
        player.gold += player.goldRate / 10; // Divide by 10 for smoother increments (10fps)
        player.units += player.unitRate / 10;
      });
      
      setGameState(updatedGameState);
    };
    
    const intervalId = setInterval(updateResources, 100); // 10fps
    
    return () => clearInterval(intervalId);
  }, [gameState, lobbyState]);

  // Claim a tile on the game grid
  const claimTile = (x: number, y: number, goldCost: number, unitCost: number): boolean => {
    if (!gameState || !lobbyState) return false;
    
    const tile = gameState.grid[y][x];
    const player = gameState.players[myId];
    
    // Check if player has enough resources
    if (player.gold < goldCost) return false;
    if (tile.ownerId !== null && tile.ownerId !== myId && player.units < unitCost) return false;
    
    // Check if tile is adjacent to player's territory
    const isAdjacent = player.tiles.some(playerTile => {
      return (
        (Math.abs(playerTile.x - x) === 1 && playerTile.y === y) || 
        (Math.abs(playerTile.y - y) === 1 && playerTile.x === x)
      );
    });
    
    if (!isAdjacent) return false;
    
    // Clone game state for update
    const updatedGameState = JSON.parse(JSON.stringify(gameState)) as GameState;
    
    // Spend resources
    updatedGameState.players[myId].gold -= goldCost;
    if (tile.ownerId !== null && tile.ownerId !== myId) {
      updatedGameState.players[myId].units -= unitCost;
    }
    
    // If the tile is owned by another player, remove it from their tiles
    if (tile.ownerId !== null && tile.ownerId !== myId) {
      const previousOwner = updatedGameState.players[tile.ownerId];
      previousOwner.tiles = previousOwner.tiles.filter(t => !(t.x === x && t.y === y));
      
      // Check if the previous owner has been eliminated
      if (previousOwner.tiles.length === 0) {
        // Player has been eliminated
        // No need to do anything special here as they have no tiles left
      }
    }
    
    // Update tile
    updatedGameState.grid[y][x].ownerId = myId;
    updatedGameState.grid[y][x].color = player.color;
    
    // Update player's tiles
    updatedGameState.players[myId].tiles.push({ x, y });
    
    // Check for winner by elimination
    const activePlayers = Object.values(updatedGameState.players).filter(p => p.tiles.length > 0);
    if (activePlayers.length === 1) {
      updatedGameState.gameOver = true;
      updatedGameState.winner = activePlayers[0].id;
    }
    
    setGameState(updatedGameState);
    
    // Broadcast to peers
    broadcastToPeers({
      type: 'CLAIM_TILE',
      payload: { 
        x, 
        y, 
        playerId: myId, 
        goldCost,
        unitCost,
        gameState: updatedGameState
      },
      senderId: myId
    });
    
    // Update localStorage (for testing)
    if (lobbyState) {
      const storageKey = `lobby-${lobbyState.lobbyId}`;
      const existingData = localStorage.getItem(storageKey);
      if (existingData) {
        const lobbyData = JSON.parse(existingData);
        lobbyData.gameState = updatedGameState;
        localStorage.setItem(storageKey, JSON.stringify(lobbyData));
      }
    }
    
    return true;
  };

  // Build a construct on a tile
  const buildConstruct = (x: number, y: number, constructType: ConstructType): boolean => {
    if (!gameState || !lobbyState) return false;
    
    const tile = gameState.grid[y][x];
    
    // Check if tile is owned by the player
    if (tile.ownerId !== myId) return false;
    
    // Check if tile already has a construct
    if (tile.construct !== null) return false;
    
    // Calculate gold cost based on construct type
    let goldCost = 0;
    switch (constructType) {
      case ConstructType.GOLD:
        goldCost = 20;
        break;
      case ConstructType.UNIT:
        goldCost = 15;
        break;
      case ConstructType.DEFENSE:
        goldCost = 25;
        break;
      default:
        return false;
    }
    
    // Check if player has enough gold
    if (gameState.players[myId].gold < goldCost) return false;
    
    // Clone game state for update
    const updatedGameState = JSON.parse(JSON.stringify(gameState)) as GameState;
    
    // Spend resources
    updatedGameState.players[myId].gold -= goldCost;
    
    // Add construct to tile
    updatedGameState.grid[y][x].construct = {
      type: constructType,
      ownerId: myId
    };
    
    // Update player rates based on construct type
    if (constructType === ConstructType.GOLD) {
      updatedGameState.players[myId].goldRate += 1;
    } else if (constructType === ConstructType.UNIT) {
      updatedGameState.players[myId].unitRate += 1;
    } else if (constructType === ConstructType.DEFENSE) {
      updatedGameState.grid[y][x].defenseBonus = 10;
    }
    
    setGameState(updatedGameState);
    
    // Broadcast to peers
    broadcastToPeers({
      type: 'BUILD_CONSTRUCT',
      payload: { 
        x, 
        y, 
        playerId: myId, 
        constructType,
        gameState: updatedGameState
      },
      senderId: myId
    });
    
    // Update localStorage (for testing)
    if (lobbyState) {
      const storageKey = `lobby-${lobbyState.lobbyId}`;
      const existingData = localStorage.getItem(storageKey);
      if (existingData) {
        const lobbyData = JSON.parse(existingData);
        lobbyData.gameState = updatedGameState;
        localStorage.setItem(storageKey, JSON.stringify(lobbyData));
      }
    }
    
    return true;
  };

  // Demolish a construct on a tile
  const demolishConstruct = (x: number, y: number): boolean => {
    if (!gameState || !lobbyState) return false;
    
    const tile = gameState.grid[y][x];
    
    // Check if tile is owned by the player
    if (tile.ownerId !== myId) return false;
    
    // Check if tile has a construct
    if (tile.construct === null) return false;
    
    // Clone game state for update
    const updatedGameState = JSON.parse(JSON.stringify(gameState)) as GameState;
    
    // Update player rates based on construct being demolished
    const constructType = tile.construct.type;
    if (constructType === ConstructType.GOLD) {
      updatedGameState.players[myId].goldRate -= 1;
    } else if (constructType === ConstructType.UNIT) {
      updatedGameState.players[myId].unitRate -= 1;
    } else if (constructType === ConstructType.DEFENSE) {
      updatedGameState.grid[y][x].defenseBonus = 0;
    }
    
    // Remove construct from tile
    updatedGameState.grid[y][x].construct = null;
    
    setGameState(updatedGameState);
    
    // Broadcast to peers
    broadcastToPeers({
      type: 'DEMOLISH_CONSTRUCT',
      payload: { 
        x, 
        y, 
        playerId: myId,
        gameState: updatedGameState
      },
      senderId: myId
    });
    
    // Update localStorage (for testing)
    if (lobbyState) {
      const storageKey = `lobby-${lobbyState.lobbyId}`;
      const existingData = localStorage.getItem(storageKey);
      if (existingData) {
        const lobbyData = JSON.parse(existingData);
        lobbyData.gameState = updatedGameState;
        localStorage.setItem(storageKey, JSON.stringify(lobbyData));
      }
    }
    
    return true;
  };

  // Reset the game
  const resetGame = useCallback(() => {
    setGameState(null);
    
    if (lobbyState) {
      const updatedLobbyState = { ...lobbyState, gameStarted: false };
      const updatedPlayers = { ...updatedLobbyState.players };
      
      // Reset all player ready states
      Object.keys(updatedPlayers).forEach(id => {
        updatedPlayers[id].isReady = false;
        updatedPlayers[id].tiles = [];
        updatedPlayers[id].gold = 0;
        updatedPlayers[id].units = 0;
        updatedPlayers[id].goldRate = 1;
        updatedPlayers[id].unitRate = id === myId && updatedPlayers[id].faction === Faction.ALIENS ? 1 : 0;
      });
      
      updatedLobbyState.players = updatedPlayers;
      setLobbyState(updatedLobbyState);
      
      // Update localStorage (for testing)
      const storageKey = `lobby-${lobbyState.lobbyId}`;
      const existingData = localStorage.getItem(storageKey);
      if (existingData) {
        const lobbyData = JSON.parse(existingData);
        lobbyData.lobbyState = updatedLobbyState;
        lobbyData.gameState = null;
        localStorage.setItem(storageKey, JSON.stringify(lobbyData));
      }
    }
  }, [lobbyState, myId]);

  // Mock function to broadcast messages to peers
  // In a real app, this would use WebRTC data channels
  const broadcastToPeers = (message: PeerMessage) => {
    // For testing, update localStorage
    if (lobbyState) {
      const storageKey = `lobby-${lobbyState.lobbyId}`;
      localStorage.setItem(`${storageKey}-lastMessage`, JSON.stringify(message));
    }
    
    // In a real WebRTC implementation, we'd send to all peers:
    Object.values(peerConnections).forEach(peer => {
      // peer.send(JSON.stringify(message));
      console.log('Would send to peer:', message);
    });
  };

  // Mock function to handle incoming peer messages
  // In a real app, this would be called by WebRTC data channel event listeners
  const handlePeerMessage = (message: PeerMessage) => {
    const { type, payload, senderId } = message;
    
    switch (type) {
      case 'JOIN_LOBBY':
        if (lobbyState) {
          const updatedLobbyState = { ...lobbyState };
          updatedLobbyState.players[senderId] = payload;
          setLobbyState(updatedLobbyState);
        }
        break;
        
      case 'READY_STATE':
        if (lobbyState) {
          const updatedLobbyState = { ...lobbyState };
          if (updatedLobbyState.players[senderId]) {
            if (typeof payload === 'boolean') {
              updatedLobbyState.players[senderId].isReady = payload;
            } else if (payload.faction && payload.color) {
              updatedLobbyState.players[senderId].faction = payload.faction;
              updatedLobbyState.players[senderId].color = payload.color;
            }
            setLobbyState(updatedLobbyState);
          }
        }
        break;
        
      case 'START_GAME':
        setGameState(payload);
        if (lobbyState) {
          setLobbyState({ ...lobbyState, gameStarted: true });
        }
        break;
        
      case 'CLAIM_TILE':
        if (payload.gameState) {
          setGameState(payload.gameState);
        }
        break;
        
      case 'BUILD_CONSTRUCT':
        if (payload.gameState) {
          setGameState(payload.gameState);
        }
        break;
        
      case 'DEMOLISH_CONSTRUCT':
        if (payload.gameState) {
          setGameState(payload.gameState);
        }
        break;
        
      case 'GAME_STATE':
        setGameState(payload);
        break;
        
      default:
        console.log('Unknown message type:', type);
    }
  };

  // Set up a polling mechanism to check for new messages (for testing)
  useEffect(() => {
    if (!lobbyState) return;
    
    const interval = setInterval(() => {
      const storageKey = `lobby-${lobbyState.lobbyId}`;
      const lastMessageKey = `${storageKey}-lastMessage`;
      const messageData = localStorage.getItem(lastMessageKey);
      
      if (messageData) {
        try {
          const message = JSON.parse(messageData) as PeerMessage;
          if (message.senderId !== myId) {
            handlePeerMessage(message);
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      }
      
      // Also check for lobby and game state updates
      const lobbyData = localStorage.getItem(storageKey);
      if (lobbyData) {
        try {
          const data = JSON.parse(lobbyData);
          if (data.lobbyState && JSON.stringify(data.lobbyState) !== JSON.stringify(lobbyState)) {
            setLobbyState(data.lobbyState);
          }
          if (data.gameState && JSON.stringify(data.gameState) !== JSON.stringify(gameState)) {
            setGameState(data.gameState);
          }
        } catch (error) {
          console.error('Error parsing lobby data:', error);
        }
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [lobbyState, gameState, myId]);

  return (
    <PeerContext.Provider
      value={{
        myId,
        playerName,
        setPlayerName,
        lobbyState,
        gameState,
        createLobby,
        joinLobby,
        toggleReady,
        changeFaction,
        startGame,
        claimTile,
        buildConstruct,
        demolishConstruct,
        peerConnections,
        isInLobby: !!lobbyState,
        lobbyError,
        resetGame,
      }}
    >
      {children}
    </PeerContext.Provider>
  );
};

export const usePeer = (): PeerContextProps => {
  const context = useContext(PeerContext);
  if (context === undefined) {
    throw new Error('usePeer must be used within a PeerProvider');
  }
  return context;
}; 