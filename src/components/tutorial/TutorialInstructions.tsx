import React from 'react';
import './TutorialInstructions.css';

interface TutorialInstructionsProps {
  text: string | string[];
  className?: string;
}

export const TutorialInstructions: React.FC<TutorialInstructionsProps> = ({
  text,
  className = ''
}) => {
  const textLines = Array.isArray(text) ? text : [text];
  
  return (
    <div className={`tutorial-instructions ${className}`.trim()}>
      <div className="tutorial-instructions__content">
        {textLines.map((line, index) => (
          <div key={index} className="tutorial-instructions__line">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}; 