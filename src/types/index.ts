export interface Player {
  id: string;
  name: string;
  isReady: boolean;
  color: string;
  tiles: Array<{ x: number; y: number }>;
}

export interface Tile {
  x: number;
  y: number;
  ownerId: string | null;
  color: string | null;
}

export interface GameState {
  gameStarted: boolean;
  currentTurn: string;
  grid: Tile[][];
  players: Record<string, Player>;
}

export interface LobbyState {
  lobbyId: string;
  players: Record<string, Player>;
  host: string;
  gameStarted: boolean;
}

export interface PeerMessage {
  type: 'JOIN_LOBBY' | 'READY_STATE' | 'START_GAME' | 'CLAIM_TILE' | 'GAME_STATE' | 'NEW_PEER' | 'PEER_JOIN';
  payload: any;
  senderId: string;
}

export type PeerConnectionsType = Record<string, any>; // simple-peer instance

export const GRID_SIZE = 24;
export const MAX_PLAYERS = 3; 