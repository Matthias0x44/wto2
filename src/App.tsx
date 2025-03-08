import React from 'react';
import './App.css';
import { PeerProvider, usePeer } from './contexts/PeerContext';
import Home from './components/Home';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';

const AppContent: React.FC = () => {
  const { isInLobby, lobbyState, gameState } = usePeer();
  
  // Show game board if game has started
  if (isInLobby && lobbyState?.gameStarted && gameState) {
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
