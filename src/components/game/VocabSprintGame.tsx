import React from 'react';
import JamArena from './jam/JamArena';

interface VocabSprintGameProps {
    lobbyId: string;
    lobby: any;
    participants: any[];
    isHost: boolean;
}

const VocabSprintGame: React.FC<VocabSprintGameProps> = (props) => {
    return <JamArena {...props} />;
};

export default VocabSprintGame;
