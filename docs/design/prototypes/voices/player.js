// The voice test (D-280): one recorded story for the mission tester, not for the game. The tester loads this file
// if it is there. Taking away the folder takes away the voices, and the tester works as before.
const here = new URL('.', import.meta.url);

// The recording, if the story on show is the one that was recorded, and the crew took the first option at every
// choice, since only that way through was recorded.
export async function recordingFor(story, picked) {
  const m = await (await fetch(new URL('convoy.json', here))).json();
  const s = m.story;
  if (story.premise !== s.premise || story.size !== s.size || story.seed !== s.seed) return { manifest: m, match: false };
  const onPath = Object.values(picked).every((k) => !k);
  return { manifest: m, match: true, onPath };
}

let playing = null;
const stop = () => {
  if (playing) playing.pause();
  playing = null;
};
// Play the clips in order, one after the other.
export function play(manifest, clips, onClip) {
  stop();
  let i = 0;
  const next = () => {
    if (i >= clips.length) return onClip && onClip(null);
    const c = clips[i++];
    onClip && onClip(c);
    const audio = new Audio(new URL(c.file, here).href);
    playing = audio;
    audio.onended = next;
    audio.play().catch(() => onClip && onClip(null));
  };
  next();
}
export { stop };
export const clipsOfStep = (manifest, step) => manifest.clips.filter((c) => c.step === step);
