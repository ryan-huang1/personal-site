"use client";

import { useEffect, useState } from "react";

import { profile } from "@/lib/profile";

const SHARED_PREFIX = "i'm ";
const TYPE_DELAY = 30;
const DELETE_DELAY = 10;
const PAUSE_DELAY = 700;

type Phase = "typing" | "paused" | "deleting";

type TypewriterState = {
  descriptionIndex: number;
  phase: Phase;
  text: string;
};

const initialState: TypewriterState = {
  descriptionIndex: 0,
  phase: "typing",
  text: "",
};

function getNextState(state: TypewriterState): TypewriterState {
  const description = profile.descriptions[state.descriptionIndex];

  if (state.phase === "typing") {
    const isComplete = state.text === description;
    if (isComplete) return { ...state, phase: "paused" };

    return { ...state, text: description.slice(0, state.text.length + 1) };
  }

  if (state.phase === "paused") {
    return { ...state, phase: "deleting" };
  }

  const nextIndex = (state.descriptionIndex + 1) % profile.descriptions.length;
  const nextDescription = profile.descriptions[nextIndex];
  const sharesPrefix =
    description.startsWith(SHARED_PREFIX) &&
    nextDescription.startsWith(SHARED_PREFIX);
  const remainingLength = sharesPrefix ? SHARED_PREFIX.length : 0;

  if (state.text.length > remainingLength) {
    return { ...state, text: state.text.slice(0, -1) };
  }

  return {
    descriptionIndex: nextIndex,
    phase: "typing",
    text: sharesPrefix ? SHARED_PREFIX : "",
  };
}

function getDelay(phase: Phase) {
  if (phase === "paused") return PAUSE_DELAY;
  if (phase === "deleting") return DELETE_DELAY;
  return TYPE_DELAY + Math.random() * 15;
}

export function TypingDescription() {
  const [state, setState] = useState(initialState);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReduceMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;

    const timeout = window.setTimeout(() => {
      setState(getNextState);
    }, getDelay(state.phase));

    return () => window.clearTimeout(timeout);
  }, [reduceMotion, state.phase, state.text]);

  if (reduceMotion) return profile.descriptions[1];

  return (
    <>
      {state.text}
      <span aria-hidden="true" className="typing-cursor">
        |
      </span>
    </>
  );
}
