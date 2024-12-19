"use client";

import { useState, useEffect } from 'react';

const descriptions = [
  "Hello!",
  "i'm a long distance cyclist",
  "i'm a ultramarathon runner",
  "i'm a globe trotting traveler",
  "i'm a photographer of friends",
  "i'm a lover of all things code",
  "i'm a hit and run survivor",
  "i'm a proud cat dad",
  "i'm a ignorer of rules",
  "i'm a causer of worries"
];

export default function CodeProfile() {
  const [typedDescription, setTypedDescription] = useState('');
  const [descriptionIndex, setDescriptionIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    document.body.style.backgroundColor = '#1e1e1e';
    
    const typeInterval = setInterval(() => {
      if (isTyping) {
        setTypedDescription(prev => {
          const currentDesc = descriptions[descriptionIndex];
          if (prev.length < currentDesc.length) {
            return currentDesc.slice(0, prev.length + 1);
          } else {
            setIsTyping(false);
            return prev;
          }
        });
      } else {
        setTypedDescription(prev => {
          if (prev.length > 0) {
            return prev.slice(0, -1);
          } else {
            setIsTyping(true);
            setDescriptionIndex((descriptionIndex + 1) % descriptions.length);
            return '';
          }
        });
      }
    }, 100);

    return () => {
      document.body.style.backgroundColor = '';
      clearInterval(typeInterval);
    };
  }, [descriptionIndex, isTyping]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1e1e1e] text-[#4ec9b0] p-4">
      <pre className="font-mono text-sm leading-relaxed overflow-x-auto max-w-full">
        {`{
  "name": "ryan huang",
  
  "description": "${typedDescription}${isTyping ? '|' : ' '}",
  
  "countries visited": [
    "united states",
    "china",
    "peru",
    "netherlands",
    "canada",
    "united kingdom",
    "france",
    "colombia",
    "qatar",
    "spain"
  ],
  
  "work": [
    "horen research (current)": "mle",
    "standard intelligence (prev)": "data team",
    "osmos learn (prev)": "founder"
  ],
  
  "contact": [
    "ryanhuang.xyz",
    "hello@ryanhuang.xyz"
  ],
  
  "profiles": [
    `}
        <a href="https://www.instagram.com/ryan_huang1/" target="_blank" rel="noopener noreferrer" className="hover:underline cursor-pointer">&quot;instagram&quot;</a>
        {`,
    `}
        <a href="https://github.com/ryan-huang1" target="_blank" rel="noopener noreferrer" className="hover:underline cursor-pointer">&quot;github&quot;</a>
        {`,
    `}
        <a href="https://x.com/ryan_huang_1" target="_blank" rel="noopener noreferrer" className="hover:underline cursor-pointer">&quot;twitter&quot;</a>
        {`,
    `}
        <a href="https://linkedin.com/in/rfhuang" target="_blank" rel="noopener noreferrer" className="hover:underline cursor-pointer">&quot;linkedin&quot;</a>
        {`
  ]
}`}
      </pre>
    </div>
  );
}

