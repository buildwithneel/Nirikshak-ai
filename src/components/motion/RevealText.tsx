import React from 'react';

interface RevealTextProps {
  text: string;
  className?: string;
  staggerMs?: number;
}

export const RevealText: React.FC<RevealTextProps> = ({
  text,
  className = '',
  staggerMs = 25,
}) => {
  const words = text.split(' ');

  return (
    <span className={`inline-block ${className}`}>
      {words.map((word, wIdx) => (
        <span
          key={wIdx}
          className="inline-block animate-slide-up mr-[0.25em]"
          style={{ animationDelay: `${wIdx * staggerMs}ms` }}
        >
          {word}
        </span>
      ))}
    </span>
  );
};

export default RevealText;
