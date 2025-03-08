import React from 'react';
import './App.css';
import { PeerProvider, usePeer } from './contexts/PeerContext';
import Home from './components/Home';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';
import VictoryScreen from './components/VictoryScreen';

const AppContent: React.FC = () => {
  const { isInLobby, lobbyState, gameState } = usePeer();
  
  // Show victory screen if the game is over and there's a winner
  if (isInLobby && gameState?.gameOver && gameState?.winner) {
    return <VictoryScreen />;
  }
  
  // Show game board if game has started and not over
  if (isInLobby && lobbyState?.gameStarted && gameState && !gameState.gameOver) {
    return <GameBoard />;
  }
  
  // Show lobby if in a lobby but game hasn't started
  if (isInLobby && !lobbyState?.gameStarted) {
    return <Lobby />;
  }
  
  // Show home screen if not in a lobby
  return <Home />;
};

function App() {
  return (
    <PeerProvider>
      <AppContent />
    </PeerProvider>
  );
}

export default App;
