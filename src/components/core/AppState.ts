import { atom, getDefaultStore } from "jotai";

const isAudioMutedAtom = atom(true);
const currentlyPlayingAudioCountAtom = atom(0);
const store = getDefaultStore();

function reduceCurrentlyPlayingAudioCount() {
  const currentlyPlayingAudioCount = store.get(currentlyPlayingAudioCountAtom);
  if (currentlyPlayingAudioCount == 0) return;
  store.set(currentlyPlayingAudioCountAtom, (prev) => prev - 1);
}

function increaseCurrentlyPlayingAudioCount() {
  store.set(currentlyPlayingAudioCountAtom, (prev) => prev + 1);
}

export {
  isAudioMutedAtom,
  currentlyPlayingAudioCountAtom,
  reduceCurrentlyPlayingAudioCount,
  increaseCurrentlyPlayingAudioCount,
};
