# Multiplayer Grid Game

A simple multiplayer game where players compete to claim the most tiles on a 24x24 grid. This project was created as a proof of concept for WebRTC-based multiplayer functionality.

## Features

- Real-time multiplayer using WebRTC (simulated using localStorage for demonstration)
- Lobby system with player ready states
- Game state synchronization between players
- Turn-based gameplay
- 24x24 grid with colored tiles for each player
- Score tracking

## How to Play

1. Enter your name and create a new lobby or join an existing one using a lobby code
2. Share the lobby code with other players (up to 3 players total)
3. All players must click "Ready Up" to start the game
4. Once all players are ready, the host can click "Start Game"
5. Players take turns claiming adjacent tiles on the grid
6. The player with the most tiles at the end wins

## Testing the Multiplayer

For development purposes, the multiplayer functionality is currently simulated using localStorage, which means:

1. You can test the game by opening multiple browser tabs/windows
2. Create a lobby in one tab and note the lobby code
3. Join the same lobby using the code in other tabs
4. Ready up all players and start the game
5. Play against yourself by taking turns in each tab

In a production environment, this would be replaced with actual WebRTC peer connections.

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm start
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Technical Implementation

This game uses:

- React with TypeScript for the UI
- Simple-peer for WebRTC connectivity (currently mocked with localStorage)
- Styled-components for styling

## Future Improvements

- Implement actual WebRTC peer connections
- Add resource system for claiming tiles
- Add different faction abilities
- Improve UI/UX
- Add game completion state and winner announcement
- Add chat functionality

## License

MIT
