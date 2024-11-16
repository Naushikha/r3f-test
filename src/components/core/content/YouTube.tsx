import { useEffect } from "react";
import { Html } from "@react-three/drei";
import ReactPlayer from "react-player";
import { useAtomValue } from "jotai";
import {
  isAudioMutedAtom,
  increaseCurrentlyPlayingAudioCount,
  reduceCurrentlyPlayingAudioCount,
} from "../AppState";

interface YouTubeProps {
  URL?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  playing?: boolean;
}

const YouTube: React.FC<YouTubeProps> = ({
  URL = "https://www.youtube.com/watch?v=ZpUYjpKg9KY",
  position = [0.5, 0.5, -0.5],
  rotation = [0, 0, 0],
  scale = [0.1, 0.1, 0.1],
  playing = false,
}) => {
  useEffect(() => {
    if (playing) {
      increaseCurrentlyPlayingAudioCount();
    } else {
      reduceCurrentlyPlayingAudioCount();
    }
  }, [playing]);
  const isAudioMuted = useAtomValue(isAudioMutedAtom);
  return (
    <Html
      style={{ userSelect: "none" }}
      occlude="blending"
      zIndexRange={[10, 0]}
      position={position}
      rotation={rotation}
      scale={scale}
      transform
      className="testing-html"
    >
      <ReactPlayer
        url={URL}
        playing={playing}
        pip={false}
        loop
        playsinline
        muted={isAudioMuted}
        style={{ visibility: playing ? "visible" : "hidden" }} // https://github.com/pmndrs/drei/issues/1323
      />
    </Html>
  );
};

export default YouTube;
