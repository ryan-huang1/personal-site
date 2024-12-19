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

  const typeSpeed = 30;
  const backSpeed = 10;
  const backDelay = 1000;

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const typeDescription = useCallback(async () => {
    const currentDesc = descriptions[descriptionIndex];
    for (let i = 0; i <= currentDesc.length; i++) {
      setTypedDescription(currentDesc.slice(0, i));
      await sleep(typeSpeed + Math.random() * 20);
    }
    await sleep(backDelay);
    for (let i = currentDesc.length; i >= 0; i--) {
      setTypedDescription(currentDesc.slice(0, i));
      await sleep(backSpeed + Math.random() * 10);
    }
    setDescriptionIndex((prevIndex) => (prevIndex + 1) % descriptions.length);
  }, [descriptionIndex]);

  useEffect(() => {
    document.body.style.backgroundColor = '#1e1e1e';
    typeDescription();
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, [typeDescription]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1e1e1e] text-[#4ec9b0] p-2">
      <pre className="font-mono text-sm leading-relaxed overflow-x-auto max-w-4xl">
        {`{
  "name": "ryan huang",
  "description": `}
        <span className="inline-block w-[30rem] h-5 align-bottom overflow-hidden">
          {`"${typedDescription}${typedDescription.length === descriptions[descriptionIndex].length ? ' ' : '|'}"`}
        </span>
        {`,
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
  );
}

