'use client';

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

const PREFIX = "i'm a ";

export default function CodeProfile() {
  const [text, setText] = useState('');
  const [index, setIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    document.body.style.backgroundColor = '#1e1e1e';
    let timeoutId: NodeJS.Timeout;

    const type = () => {
      const currentText = descriptions[index];
      const nextText = descriptions[(index + 1) % descriptions.length];
      
      if (isDeleting) {
        // Fast deletion, but preserve prefix if both current and next texts have it
        if (currentText.startsWith(PREFIX) && nextText.startsWith(PREFIX)) {
          const deleteUntil = PREFIX.length;
          if (text.length > deleteUntil) {
            setText(currentText.substring(0, text.length - 1));
            timeoutId = setTimeout(type, 8);
            return;
          }
        } else {
          setText(currentText.substring(0, text.length - 1));
        }
        
        if (text.length === (currentText.startsWith(PREFIX) && nextText.startsWith(PREFIX) ? PREFIX.length : 0)) {
          setIsDeleting(false);
          setIndex((prev) => (prev + 1) % descriptions.length);
          timeoutId = setTimeout(type, 100);
          return;
        }

        timeoutId = setTimeout(type, 8);
      } else {
        // Faster typing with slight variation
        setText(currentText.substring(0, text.length + 1));
        
        if (text.length === currentText.length) {
          timeoutId = setTimeout(() => {
            setIsDeleting(true);
            type();
          }, 500);
          return;
        }
        
        timeoutId = setTimeout(type, 25 + Math.random() * 15);
      }
    };

    timeoutId = setTimeout(type, 50);

    return () => {
      clearTimeout(timeoutId);
      document.body.style.backgroundColor = '';
    };
  }, [text, index, isDeleting]);

  return (
    <div className="h-[100dvh] flex items-center bg-[#1e1e1e] text-[#4ec9b0] overflow-x-auto overflow-y-hidden">
      <div className="pl-4 md:pl-[30vw]">
        <pre className="font-mono text-[11px] md:text-sm leading-[1.2] md:leading-relaxed">
        {`{
  "name": "ryan huang",
  
  "description": "${text}${!isDeleting ? '|' : ' '}",
  
  "countries visited": [
    "united states",
    "china",
    "peru",
    "netherlands",
    "canada",
    "united kingdom",
    "france"
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
  </div>
  );
}
