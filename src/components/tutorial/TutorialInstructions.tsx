import React from 'react';
import './TutorialInstructions.css';

interface TutorialInstructionsProps {
  text: string;
  className?: string;
}

export const TutorialInstructions: React.FC<TutorialInstructionsProps> = ({
  text,
  className = ''
}) => {
  return (
    <div className={`tutorial-instructions ${className}`.trim()}>
      <div className="tutorial-instructions__content">
        {text}
      </div>
    </div>
  );
}; 