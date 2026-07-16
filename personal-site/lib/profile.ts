export const profile = {
  name: "ryan huang",
  descriptions: [
    "hello!",
    "i'm an ultramarathon runner",
    "i'm a crazy motorcyclist",
    "i'm a long-distance cyclist",
    "i'm a traveler of the world",
    "i'm a photographer of friends",
    "i'm a lover of all things code",
    "i'm a hit-and-run survivor",
    "i'm a proud cat dad",
    "i'm an ignorer of rules",
    "i'm a causer of worries",
  ],
  countriesVisited: [
    "united states",
    "china",
    "peru",
    "netherlands",
    "canada",
    "united kingdom",
    "france",
    "colombia",
    "qatar",
    "spain",
    "japan",
  ],
  work: [
    {
      company: "endeavor ai",
      role: "director of ai r&d",
      status: "current",
    },
    {
      company: "boardy ai",
      role: "agentic voice",
      status: "previous",
    },
    {
      company: "osmos learn",
      role: "founder",
      status: "previous",
    },
  ],
  profiles: [
    {
      label: "instagram",
      href: "https://www.instagram.com/ryan_huang1/",
    },
    {
      label: "github",
      href: "https://github.com/ryan-huang1",
    },
    {
      label: "x",
      href: "https://x.com/ryan_huang_1",
    },
    {
      label: "linkedin",
      href: "https://linkedin.com/in/rfhuang",
    },
  ],
} as const;

export type ProfileLink = (typeof profile.profiles)[number];
