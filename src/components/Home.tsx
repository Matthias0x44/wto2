import React, { useState } from 'react';
import styled from 'styled-components';
import { usePeer } from '../contexts/PeerContext';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-color: #282c34;
  color: white;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 2rem;
  color: #61dafb;
`;

const Card = styled.div`
  background-color: #3a3f4b;
  border-radius: 8px;
  padding: 2rem;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Label = styled.label`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 1rem;
`;

const Input = styled.input`
  padding: 0.75rem;
  font-size: 1rem;
  border: none;
  border-radius: 4px;
  background-color: #444a57;
  color: white;
  
  &:focus {
    outline: 2px solid #61dafb;
  }
`;

const Button = styled.button`
  padding: 0.75rem;
  font-size: 1rem;
  background-color: #61dafb;
  color: #282c34;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  margin-top: 1rem;
  
  &:hover {
    background-color: #4fa8d1;
  }
  
  &:disabled {
    background-color: #4a5568;
    cursor: not-allowed;
  }
`;

const Tabs = styled.div`
  display: flex;
  margin-bottom: 1.5rem;
`;

const Tab = styled.button<{ active: boolean }>`
  flex: 1;
  padding: 0.75rem;
  font-size: 1rem;
  background-color: ${props => props.active ? '#61dafb' : '#444a57'};
  color: ${props => props.active ? '#282c34' : 'white'};
  border: none;
  cursor: pointer;
  font-weight: ${props => props.active ? 'bold' : 'normal'};
  
  &:first-child {
    border-top-left-radius: 4px;
    border-bottom-left-radius: 4px;
  }
  
  &:last-child {
    border-top-right-radius: 4px;
    border-bottom-right-radius: 4px;
  }
  
  &:hover {
    background-color: ${props => props.active ? '#4fa8d1' : '#3e4451'};
  }
`;

const ErrorText = styled.p`
  color: #ff6b6b;
  margin-top: 0.5rem;
`;

const Home: React.FC = () => {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [lobbyId, setLobbyId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lobbyCode, setLobbyCode] = useState<string | null>(null);
  
  const { setPlayerName, createLobby, joinLobby, lobbyError } = usePeer();
  
  const handleCreateLobby = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    
    setPlayerName(name);
    const code = createLobby();
    setLobbyCode(code);
  };
  
  const handleJoinLobby = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    
    if (!lobbyId.trim()) {
      setError('Please enter a lobby code');
      return;
    }
    
    setPlayerName(name);
    joinLobby(lobbyId);
  };
  
  return (
    <Container>
      <Title>Multiplayer Grid Game</Title>
      
      <Card>
        {lobbyCode ? (
          <div>
            <h2>Lobby Created!</h2>
            <p>Share this code with other players:</p>
            <div style={{ 
              padding: '1rem', 
              backgroundColor: '#444a57', 
              borderRadius: '4px', 
              textAlign: 'center', 
              fontSize: '1.5rem',
              marginBottom: '1rem',
              fontWeight: 'bold'
            }}>
              {lobbyCode}
            </div>
            <p>Waiting for other players to join...</p>
          </div>
        ) : (
          <>
            <Tabs>
              <Tab 
                active={tab === 'create'} 
                onClick={() => { setTab('create'); setError(null); }}
              >
                Create Lobby
              </Tab>
              <Tab 
                active={tab === 'join'} 
                onClick={() => { setTab('join'); setError(null); }}
              >
                Join Lobby
              </Tab>
            </Tabs>
            
            {tab === 'create' ? (
              <Form onSubmit={handleCreateLobby}>
                <Label>
                  Your Name
                  <Input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="Enter your name" 
                    maxLength={15}
                  />
                </Label>
                
                <Button type="submit">Create Lobby</Button>
                
                {error && <ErrorText>{error}</ErrorText>}
              </Form>
            ) : (
              <Form onSubmit={handleJoinLobby}>
                <Label>
                  Your Name
                  <Input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="Enter your name" 
                    maxLength={15}
                  />
                </Label>
                
                <Label>
                  Lobby Code
                  <Input 
                    type="text" 
                    value={lobbyId} 
                    onChange={(e) => setLobbyId(e.target.value)} 
                    placeholder="Enter lobby code" 
                    maxLength={6}
                  />
                </Label>
                
                <Button type="submit">Join Lobby</Button>
                
                {(error || lobbyError) && <ErrorText>{error || lobbyError}</ErrorText>}
              </Form>
            )}
          </>
        )}
      </Card>
    </Container>
  );
};

export default Home; 