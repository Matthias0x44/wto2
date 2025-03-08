export enum Faction {
  HUMANS = 'HUMANS',
  ALIENS = 'ALIENS',
  ROBOTS = 'ROBOTS'
}

export enum ConstructType {
  GOLD = 'GOLD',
  UNIT = 'UNIT',
  DEFENSE = 'DEFENSE',
  NONE = 'NONE'
}

export interface Player {
  id: string;
  name: string;
  isReady: boolean;
  color: string;
  faction: Faction;
  gold: number;
  units: number;
  goldRate: number;
  unitRate: number;
  tiles: Array<{ x: number; y: number }>;
}

export interface Construct {
  type: ConstructType;
  ownerId: string | null;
}

export interface Tile {
  x: number;
  y: number;
  ownerId: string | null;
  color: string | null;
  construct: Construct | null;
  defenseBonus: number;
}

export interface GameState {
  gameStarted: boolean;
  currentTurn: string;
  grid: Tile[][];
  players: Record<string, Player>;
  gameEndTime: number | null; // timestamp for when the game ends (5 minutes from start)
  gameOver: boolean;
  winner: string | null;
}

export interface LobbyState {
  lobbyId: string;
  players: Record<string, Player>;
  host: string;
  gameStarted: boolean;
}

export interface PeerMessage {
  type: 'JOIN_LOBBY' | 'READY_STATE' | 'START_GAME' | 'CLAIM_TILE' | 'GAME_STATE' | 'NEW_PEER' | 'PEER_JOIN' | 'BUILD_CONSTRUCT' | 'DEMOLISH_CONSTRUCT';
  payload: any;
  senderId: string;
}

export type PeerConnectionsType = Record<string, any>; // simple-peer instance

export const GRID_SIZE = 24;
export const MAX_PLAYERS = 3;
export const GAME_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export const FACTION_INFO = {
  [Faction.HUMANS]: {
    name: 'Humans',
    constructs: {
      [ConstructType.GOLD]: 'Farm',
      [ConstructType.UNIT]: 'Barracks',
      [ConstructType.DEFENSE]: 'Fort'
    },
    baseColor: '#3498db', // Blue
    description: 'Balanced and adaptable.'
  },
  [Faction.ALIENS]: {
    name: 'Aliens',
    constructs: {
      [ConstructType.GOLD]: 'Hive',
      [ConstructType.UNIT]: 'Nest',
      [ConstructType.DEFENSE]: 'Biowall'
    },
    baseColor: '#2ecc71', // Green
    description: 'Starts with unit production. Expands quickly.'
  },
  [Faction.ROBOTS]: {
    name: 'Robots',
    constructs: {
      [ConstructType.GOLD]: 'Network',
      [ConstructType.UNIT]: 'Factory',
      [ConstructType.DEFENSE]: 'Autoturret'
    },
    baseColor: '#e74c3c', // Red
    description: 'Stronger defenses.'
  }
}; 