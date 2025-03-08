import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Peer from 'simple-peer';
import { v4 as uuidv4 } from 'uuid';
import { PeerConnectionsType, PeerMessage, LobbyState, GameState, Player, GRID_SIZE, Tile } from '../types';

interface PeerContextProps {
  myId: string;
  playerName: string;
  setPlayerName: (name: string) => void;
  lobbyState: LobbyState | null;
  gameState: GameState | null;
  createLobby: () => string;
  joinLobby: (lobbyId: string) => void;
  toggleReady: () => void;
  startGame: () => void;
  claimTile: (x: number, y: number) => boolean;
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
      }
    });
    
    return {
      gameStarted: true,
      currentTurn: playerIds[0], // First player starts
      grid,
      players,
    };
  };

  // Create a new lobby
  const createLobby = (): string => {
    const lobbyId = uuidv4().substring(0, 6);
    const player: Player = {
      id: myId,
      name: playerName,
      isReady: false,
      color: PLAYER_COLORS[0],
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
          color: PLAYER_COLORS[0],
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
        
        // Add self to players
        const playerIndex = Object.keys(existingLobbyState.players).length;
        const player: Player = {
          id: myId,
          name: playerName,
          isReady: false,
          color: PLAYER_COLORS[playerIndex % PLAYER_COLORS.length],
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

  // Claim a tile on the game grid
  const claimTile = (x: number, y: number): boolean => {
    if (!gameState || !lobbyState || gameState.currentTurn !== myId) return false;
    
    // Check if tile is claimable (adjacent to an owned tile)
    const isAdjacent = gameState.players[myId].tiles.some(tile => {
      return (
        (Math.abs(tile.x - x) === 1 && tile.y === y) || 
        (Math.abs(tile.y - y) === 1 && tile.x === x)
      );
    });
    
    if (!isAdjacent) return false;
    
    // Check if tile is already owned
    if (gameState.grid[y][x].ownerId !== null) return false;
    
    // Clone game state for update
    const updatedGameState = JSON.parse(JSON.stringify(gameState)) as GameState;
    
    // Update tile
    updatedGameState.grid[y][x].ownerId = myId;
    updatedGameState.grid[y][x].color = gameState.players[myId].color;
    
    // Update player's tiles
    updatedGameState.players[myId].tiles.push({ x, y });
    
    // Next player's turn
    const playerIds = Object.keys(updatedGameState.players);
    const currentIndex = playerIds.indexOf(myId);
    const nextIndex = (currentIndex + 1) % playerIds.length;
    updatedGameState.currentTurn = playerIds[nextIndex];
    
    setGameState(updatedGameState);
    
    // Broadcast to peers
    broadcastToPeers({
      type: 'CLAIM_TILE',
      payload: { x, y, playerId: myId, nextTurn: updatedGameState.currentTurn },
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
  const resetGame = () => {
    setGameState(null);
    
    if (lobbyState) {
      const updatedLobbyState = { ...lobbyState, gameStarted: false };
      const updatedPlayers = { ...updatedLobbyState.players };
      
      // Reset all player ready states
      Object.keys(updatedPlayers).forEach(id => {
        updatedPlayers[id].isReady = false;
        updatedPlayers[id].tiles = [];
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
  };

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
            updatedLobbyState.players[senderId].isReady = payload;
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
        if (gameState) {
          const { x, y, playerId, nextTurn } = payload;
          const updatedGameState = JSON.parse(JSON.stringify(gameState)) as GameState;
          
          updatedGameState.grid[y][x].ownerId = playerId;
          updatedGameState.grid[y][x].color = gameState.players[playerId].color;
          updatedGameState.players[playerId].tiles.push({ x, y });
          updatedGameState.currentTurn = nextTurn;
          
          setGameState(updatedGameState);
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
        startGame,
        claimTile,
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