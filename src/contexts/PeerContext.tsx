import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
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
  
  // Refs to track and clean up intervals
  const heartbeatIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lobbyCheckIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Clean up intervals when component unmounts
  useEffect(() => {
    return () => {
      // Clear all heartbeat intervals
      heartbeatIntervals.current.forEach((intervalId) => {
        clearInterval(intervalId);
      });
      
      // Clear all lobby check intervals
      lobbyCheckIntervals.current.forEach((intervalId) => {
        clearInterval(intervalId);
      });
    };
  }, []);

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
    
    // Store in localStorage with a timestamp to prevent conflicts
    const storageKey = `lobby-${lobbyId}`;
    localStorage.setItem(storageKey, JSON.stringify({
      lobbyState: newLobbyState,
      createdAt: Date.now()
    }));
    
    setLobbyState(newLobbyState);
    
    // Set up a heartbeat to keep this lobby alive and maintain host status
    const heartbeatId = setInterval(() => {
      const existingData = localStorage.getItem(storageKey);
      if (existingData) {
        const data = JSON.parse(existingData);
        
        // Ensure we remain the host by writing back our state
        if (data.lobbyState) {
          // Preserve other players but make sure we're the host
          const updatedLobbyState = { 
            ...data.lobbyState,
            host: myId
          };
          
          // Make sure our player data is preserved
          if (lobbyState && lobbyState.players[myId]) {
            updatedLobbyState.players[myId] = lobbyState.players[myId];
          }
          
          // Write back to localStorage
          data.lobbyState = updatedLobbyState;
          data.lastHeartbeat = Date.now();
          localStorage.setItem(storageKey, JSON.stringify(data));
          
          // Update our state if needed
          if (JSON.stringify(lobbyState) !== JSON.stringify(updatedLobbyState)) {
            setLobbyState(updatedLobbyState);
          }
        }
      }
    }, 2000); // Every 2 seconds
    
    // Store the interval ID for cleanup
    heartbeatIntervals.current.set(lobbyId, heartbeatId);
    
    return lobbyId;
  };

  // Join an existing lobby
  const joinLobby = (lobbyId: string) => {
    // Reset any previous state
    setLobbyError(null);
    
    try {
      const storageKey = `lobby-${lobbyId}`;
      const existingData = localStorage.getItem(storageKey);
      
      if (!existingData) {
        setLobbyError('Lobby not found');
        return;
      }
      
      // Parse the existing lobby data
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
      
      // Create our player object
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
      
      // Create a copy of the lobby state that includes our player
      const updatedLobbyState = { ...existingLobbyState };
      updatedLobbyState.players[myId] = player;
      
      // Explicitly preserve the original host
      // This is crucial to prevent host changing when new players join
      const originalHost = existingLobbyState.host;
      updatedLobbyState.host = originalHost;
      
      // Update localStorage
      lobbyData.lobbyState = updatedLobbyState;
      lobbyData.lastUpdated = Date.now();
      localStorage.setItem(storageKey, JSON.stringify(lobbyData));
      
      // Set our local state
      setLobbyState(updatedLobbyState);
      
      // Send a join notification
      const joinMessage: PeerMessage = {
        type: 'JOIN_LOBBY',
        payload: player,
        senderId: myId
      };
      
      // Use a unique key for this message to prevent conflicts
      const messageKey = `${storageKey}-join-${myId}-${Date.now()}`;
      localStorage.setItem(messageKey, JSON.stringify(joinMessage));
      
      // Start a periodic check for lobby updates (not as host)
      const intervalId = setInterval(() => {
        const latestData = localStorage.getItem(storageKey);
        if (latestData) {
          try {
            const data = JSON.parse(latestData);
            const latestLobbyState = data.lobbyState;
            
            if (JSON.stringify(latestLobbyState) !== JSON.stringify(lobbyState)) {
              // Preserve our local player state
              if (lobbyState && lobbyState.players[myId]) {
                latestLobbyState.players[myId] = lobbyState.players[myId];
              }
              
              setLobbyState(latestLobbyState);
            }
            
            // Also update our player info in the shared state
            if (lobbyState && lobbyState.players[myId]) {
              data.lobbyState.players[myId] = lobbyState.players[myId];
              localStorage.setItem(storageKey, JSON.stringify(data));
            }
          } catch (error) {
            console.error('Error checking for lobby updates:', error);
          }
        }
      }, 1000);
      
      // Store the interval ID for cleanup
      lobbyCheckIntervals.current.set(lobbyId, intervalId);
      
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

  // Move broadcastToPeers function here, above resetGame
  const broadcastToPeers = (message: PeerMessage) => {
    // For testing, update localStorage with a unique timestamp to avoid conflicts
    if (lobbyState) {
      const storageKey = `lobby-${lobbyState.lobbyId}`;
      const messageKey = `${storageKey}-msg-${message.type}-${Date.now()}`;
      
      // Add the new message with a unique key
      localStorage.setItem(messageKey, JSON.stringify(message));
      
      // Also update the lobby/game state directly to ensure consistency
      const existingData = localStorage.getItem(storageKey);
      if (existingData) {
        const lobbyData = JSON.parse(existingData);
        
        // Update the relevant state based on message type
        switch (message.type) {
          case 'READY_STATE':
            if (typeof message.payload === 'boolean') {
              if (lobbyData.lobbyState && lobbyData.lobbyState.players[message.senderId]) {
                lobbyData.lobbyState.players[message.senderId].isReady = message.payload;
              }
            } else if (message.payload.faction && message.payload.color) {
              if (lobbyData.lobbyState && lobbyData.lobbyState.players[message.senderId]) {
                lobbyData.lobbyState.players[message.senderId].faction = message.payload.faction;
                lobbyData.lobbyState.players[message.senderId].color = message.payload.color;
              }
            }
            break;
            
          case 'START_GAME':
            if (lobbyData.lobbyState) {
              lobbyData.lobbyState.gameStarted = true;
            }
            lobbyData.gameState = message.payload;
            break;
            
          case 'CLAIM_TILE':
          case 'BUILD_CONSTRUCT':
          case 'DEMOLISH_CONSTRUCT':
            if (message.payload.gameState) {
              lobbyData.gameState = message.payload.gameState;
            }
            break;
            
          case 'GAME_STATE':
            lobbyData.gameState = message.payload;
            break;
        }
        
        // Save updated data back to localStorage
        localStorage.setItem(storageKey, JSON.stringify(lobbyData));
      }
    }
    
    // In a real WebRTC implementation, we'd send to all peers:
    Object.values(peerConnections).forEach(peer => {
      // peer.send(JSON.stringify(message));
      console.log('Would send to peer:', message);
    });
  };

  // Reset the game
  const resetGame = useCallback(() => {
    setGameState(null);
    
    if (lobbyState) {
      const lobbyId = lobbyState.lobbyId;
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
      const storageKey = `lobby-${lobbyId}`;
      const existingData = localStorage.getItem(storageKey);
      if (existingData) {
        const lobbyData = JSON.parse(existingData);
        lobbyData.lobbyState = updatedLobbyState;
        lobbyData.gameState = null;
        localStorage.setItem(storageKey, JSON.stringify(lobbyData));
      }
      
      // Broadcast the reset to all peers
      broadcastToPeers({
        type: 'GAME_STATE',
        payload: null,
        senderId: myId
      });
    }
  }, [lobbyState, myId]);

  // Mock function to handle incoming peer messages
  // In a real app, this would be called by WebRTC data channel event listeners
  const handlePeerMessage = useCallback((message: PeerMessage) => {
    const { type, payload, senderId } = message;
    
    switch (type) {
      case 'JOIN_LOBBY':
        if (lobbyState) {
          const updatedLobbyState = { ...lobbyState };
          updatedLobbyState.players[senderId] = payload;
          setLobbyState(updatedLobbyState);
          
          // Update localStorage to reflect the new player
          const storageKey = `lobby-${lobbyState.lobbyId}`;
          const existingData = localStorage.getItem(storageKey);
          if (existingData) {
            const lobbyData = JSON.parse(existingData);
            lobbyData.lobbyState = updatedLobbyState;
            localStorage.setItem(storageKey, JSON.stringify(lobbyData));
          }
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
            
            // Update localStorage
            const storageKey = `lobby-${lobbyState.lobbyId}`;
            const existingData = localStorage.getItem(storageKey);
            if (existingData) {
              const lobbyData = JSON.parse(existingData);
              lobbyData.lobbyState = updatedLobbyState;
              localStorage.setItem(storageKey, JSON.stringify(lobbyData));
            }
          }
        }
        break;
        
      case 'START_GAME':
        setGameState(payload);
        if (lobbyState) {
          const updatedLobbyState = { ...lobbyState, gameStarted: true };
          setLobbyState(updatedLobbyState);
          
          // Update localStorage
          const storageKey = `lobby-${lobbyState.lobbyId}`;
          const existingData = localStorage.getItem(storageKey);
          if (existingData) {
            const lobbyData = JSON.parse(existingData);
            lobbyData.lobbyState = updatedLobbyState;
            lobbyData.gameState = payload;
            localStorage.setItem(storageKey, JSON.stringify(lobbyData));
          }
        }
        break;
        
      case 'CLAIM_TILE':
      case 'BUILD_CONSTRUCT':
      case 'DEMOLISH_CONSTRUCT':
        if (payload.gameState) {
          setGameState(payload.gameState);
          
          // Update localStorage
          if (lobbyState) {
            const storageKey = `lobby-${lobbyState.lobbyId}`;
            const existingData = localStorage.getItem(storageKey);
            if (existingData) {
              const lobbyData = JSON.parse(existingData);
              lobbyData.gameState = payload.gameState;
              localStorage.setItem(storageKey, JSON.stringify(lobbyData));
            }
          }
        }
        break;
        
      case 'GAME_STATE':
        setGameState(payload);
        
        // Update localStorage
        if (lobbyState) {
          const storageKey = `lobby-${lobbyState.lobbyId}`;
          const existingData = localStorage.getItem(storageKey);
          if (existingData) {
            const lobbyData = JSON.parse(existingData);
            lobbyData.gameState = payload;
            localStorage.setItem(storageKey, JSON.stringify(lobbyData));
          }
        }
        break;
        
      default:
        console.log('Unknown message type:', type);
    }
  }, [lobbyState, setGameState, setLobbyState]);

  // Set up a polling mechanism to check for new messages (for testing)
  useEffect(() => {
    if (!lobbyState) return;
    
    const storageKey = `lobby-${lobbyState.lobbyId}`;
    
    const checkForUpdates = () => {
      // Check for new messages
      const lastMessageKey = `${storageKey}-lastMessage`;
      const messageData = localStorage.getItem(lastMessageKey);
      
      if (messageData) {
        try {
          const message = JSON.parse(messageData) as PeerMessage;
          if (message.senderId !== myId) {
            handlePeerMessage(message);
            
            // Clear the message so we don't process it again
            // But add a timestamp to make it unique to avoid race conditions
            localStorage.setItem(
              `${lastMessageKey}-processed-${Date.now()}`, 
              messageData
            );
            localStorage.removeItem(lastMessageKey);
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      }
      
      // Check for lobby and game state updates
      const lobbyData = localStorage.getItem(storageKey);
      if (lobbyData) {
        try {
          const data = JSON.parse(lobbyData);
          const storedLobbyState = data.lobbyState;
          const storedGameState = data.gameState;
          
          // Update lobby state if it's different and we're not the ones who changed it
          if (
            storedLobbyState && 
            JSON.stringify(storedLobbyState) !== JSON.stringify(lobbyState) &&
            (
              // If we've made a local change to the lobby state, don't overwrite it
              !storedLobbyState.players[myId] || 
              storedLobbyState.players[myId].isReady === lobbyState.players[myId]?.isReady
            )
          ) {
            // Preserve our local player state
            if (lobbyState && lobbyState.players[myId]) {
              storedLobbyState.players[myId] = lobbyState.players[myId];
            }
            setLobbyState(storedLobbyState);
          }
          
          // Update game state if it's different
          if (
            storedGameState && 
            JSON.stringify(storedGameState) !== JSON.stringify(gameState)
          ) {
            // If both states exist, merge them carefully to avoid overwriting local changes
            if (gameState) {
              // If an important game action occurred, take the newer state
              // For example, if a tile was claimed or a construct was built
              const hasImportantChanges = 
                JSON.stringify(storedGameState.grid) !== JSON.stringify(gameState.grid) ||
                storedGameState.gameOver !== gameState.gameOver;
                
              if (hasImportantChanges) {
                setGameState(storedGameState);
              }
            } else {
              // If we don't have a game state yet, use the stored one
              setGameState(storedGameState);
            }
          }
        } catch (error) {
          console.error('Error parsing lobby data:', error);
        }
      }
    };
    
    // Check immediately
    checkForUpdates();
    
    // Then check periodically
    const interval = setInterval(checkForUpdates, 500); // Check more frequently (500ms)
    
    return () => clearInterval(interval);
  }, [lobbyState, gameState, myId, handlePeerMessage]);

  // Listen for localStorage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (!event.key || !event.newValue || !lobbyState) return;
      
      const storageKey = `lobby-${lobbyState.lobbyId}`;
      
      // Check if this is a message by checking the key pattern
      if (event.key.startsWith(`${storageKey}-msg-`) || 
          event.key.startsWith(`${storageKey}-join-`)) {
        try {
          const message = JSON.parse(event.newValue) as PeerMessage;
          if (message.senderId !== myId) {
            handlePeerMessage(message);
          }
        } catch (error) {
          console.error('Error handling storage event message:', error);
        }
        return;
      }
      
      // Handle direct lobby state changes
      if (event.key === storageKey) {
        try {
          const data = JSON.parse(event.newValue);
          
          // Update lobby state if it exists and is different
          if (data.lobbyState && JSON.stringify(data.lobbyState) !== JSON.stringify(lobbyState)) {
            // Don't change our ready state based on other tabs' updates
            if (lobbyState && lobbyState.players[myId] && data.lobbyState.players[myId]) {
              data.lobbyState.players[myId] = {
                ...data.lobbyState.players[myId],
                isReady: lobbyState.players[myId].isReady
              };
            }
            
            // Special handling for host: 
            // - If we created the lobby, we should remain the host
            // - Otherwise use the value from localStorage
            if (heartbeatIntervals.current.has(lobbyState.lobbyId)) {
              data.lobbyState.host = myId;
            }
            
            setLobbyState(data.lobbyState);
          }
          
          // Update game state
          if (data.gameState && JSON.stringify(data.gameState) !== JSON.stringify(gameState)) {
            setGameState(data.gameState);
          }
        } catch (error) {
          console.error('Error handling lobby state change:', error);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [myId, lobbyState, gameState, handlePeerMessage]);

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