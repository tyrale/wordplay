import React from 'react';
import './WordTrail.css';

export interface WordTrailProps {
  words: string[];
  className?: string;
}

export const WordTrail: React.FC<WordTrailProps> = ({ words, className = '' }) => {
  if (words.length === 0) {
    return null;
  }

  return (
    <div className={`word-trail ${className}`.trim()} role="status" aria-label="Previous words played">
      {words.map((word, index) => (
        <React.Fragment key={`${word}-${index}`}>
          {index > 0 && <span className="word-trail__separator" aria-hidden="true">•</span>}
          <span className="word-trail__word">{word.toUpperCase()}</span>
        </React.Fragment>
      ))}
    </div>
  );
}; 