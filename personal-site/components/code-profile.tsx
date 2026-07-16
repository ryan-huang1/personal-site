import { Fragment } from "react";

import { TypingDescription } from "@/components/typing-description";
import { profile, type ProfileLink } from "@/lib/profile";

function formatStringList(values: readonly string[]) {
  return values.map((value) => `    ${JSON.stringify(value)}`).join(",\n");
}

function formatWork() {
  return profile.work
    .map((item) => [
      "    {",
      `      "company": ${JSON.stringify(item.company)},`,
      `      "role": ${JSON.stringify(item.role)},`,
      `      "status": ${JSON.stringify(item.status)}`,
      "    }",
    ].join("\n"))
    .join(",\n");
}

type CodeLinkProps = ProfileLink & {
  hasTrailingComma: boolean;
};

function CodeLink({ href, label, hasTrailingComma }: CodeLinkProps) {
  const externalProps = href.startsWith("http")
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <>
      {"    "}
      <a className="code-link" href={href} {...externalProps}>
        {JSON.stringify(label)}
      </a>
      {hasTrailingComma ? ",\n" : "\n"}
    </>
  );
}

function CodeLinkList({ links }: { links: readonly ProfileLink[] }) {
  return links.map((link, index) => (
    <Fragment key={link.href}>
      <CodeLink
        {...link}
        hasTrailingComma={index < links.length - 1}
      />
    </Fragment>
  ));
}

export function CodeProfile() {
  return (
    <main className="profile-shell">
      <h1 className="sr-only">Ryan Huang</h1>
      <p className="sr-only">
        Product builder, endurance athlete, traveler, photographer, and coder.
      </p>

      <pre
        aria-label="Ryan Huang's profile formatted as JSON"
        className="profile-code"
      >
        {`{
  "name": ${JSON.stringify(profile.name)},

  "description": "`}
        <span className="sr-only">{profile.descriptions[1]}</span>
        <span aria-hidden="true">
          <TypingDescription />
        </span>
        {`",

  "countries visited": [
${formatStringList(profile.countriesVisited)}
  ],

  "work": [
${formatWork()}
  ],

  "contact": [
`}
        <CodeLinkList links={profile.contact} />
        {`  ],

  "profiles": [
`}
        <CodeLinkList links={profile.profiles} />
        {`  ]
}`}
      </pre>
    </main>
  );
}
