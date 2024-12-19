import { useState, useEffect, useCallback } from 'react';

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

  const typeSpeed = 30;
  const backSpeed = 10;
  const backDelay = 1000;

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const typeDescription = useCallback(async () => {
    const currentDesc = descriptions[descriptionIndex];
    // Typing the description
    for (let i = 0; i <= currentDesc.length; i++) {
      setTypedDescription(currentDesc.slice(0, i));
      await sleep(typeSpeed + Math.random() * 20);
    }
    await sleep(backDelay);
    // Deleting the description
    for (let i = currentDesc.length; i >= 0; i--) {
      setTypedDescription(currentDesc.slice(0, i));
      await sleep(backSpeed + Math.random() * 10);
    }
    setDescriptionIndex((prevIndex) => (prevIndex + 1) % descriptions.length);
  }, [descriptionIndex]);

  useEffect(() => {
    document.body.style.backgroundColor = '#1e1e1e';
    const typingTask = typeDescription();

    return () => {
      document.body.style.backgroundColor = '';
      // Cancel ongoing promises if needed in complex scenarios
    };
  }, [typeDescription]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1e1e1e] text-[#4ec9b0] p-4">
      <pre className="font-mono text-sm leading-relaxed overflow-x-auto max-w-full">
        {`{
  "name": "ryan huang",
  
  "description": "${typedDescription}${typedDescription.length === descriptions[descriptionIndex].length ? ' ' : '|'}",
  
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
    "+1 336 582 4875",
    "rfhuang17@gmail.com"
  ],
  
  "profiles": [
    "instagram",
    "github",
    "twitter",
    "linkedin"
  ]
}`}
      </pre>
    </div>
  );
}
