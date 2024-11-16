import * as THREE from "three";
import { useEffect, useRef, useState } from "react";
import ChromaKeyMaterial from "../shader/ChromaKeyMaterial";
import {
  isAudioMutedAtom,
  reduceCurrentlyPlayingAudioCount,
  increaseCurrentlyPlayingAudioCount,
} from "../AppState";
import { useAtomValue } from "jotai";

interface GreenScreenPlaneProps {
  videoURL?: string;
  chromaKeyColor?: number;
  chromaKeySimilarity?: number;
  chromaKeySmoothness?: number;
  chromaKeySpill?: number;
  position?: [number, number, number];
  sizeMultiplier?: number;
  playing?: boolean;
}

const GreenScreenPlane: React.FC<GreenScreenPlaneProps> = ({
  videoURL = "/marki.mp4",
  chromaKeyColor = 0x03ff02,
  chromaKeySimilarity = 0.3,
  chromaKeySmoothness = 0.15,
  chromaKeySpill = 0.01,
  position = [0, 1, 0],
  sizeMultiplier = 1.35,
  playing = false,
}) => {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoAspect, setVideoAspect] = useState(1);
  const greenScreenPlaneRef = useRef<THREE.Mesh>(null!);
  const chromaKeyMaterial = useRef<THREE.Material>(null!);
  const greenScreenVidRef = useRef<HTMLVideoElement>(null!);
  const isAudioMuted = useAtomValue(isAudioMutedAtom);

  useEffect(() => {
    const greenScreenVid = document.createElement("video");
    greenScreenVidRef.current = greenScreenVid;
    greenScreenVid.src = videoURL;
    greenScreenVid.loop = true;
    greenScreenVidRef.current.muted = true;
    greenScreenVid.crossOrigin = "anonymous";
    greenScreenVid.playsInline = true;
    greenScreenVid.load();

    greenScreenVid.addEventListener("loadeddata", () => {
      const vidWidth = greenScreenVid.videoWidth;
      const vidHeight = greenScreenVid.videoHeight;
      const aspect = vidWidth / vidHeight;
      setVideoAspect(aspect);

      chromaKeyMaterial.current = new ChromaKeyMaterial(
        greenScreenVid,
        chromaKeyColor,
        vidWidth,
        vidHeight,
        chromaKeySimilarity,
        chromaKeySmoothness,
        chromaKeySpill
      );
      chromaKeyMaterial.current.side = THREE.DoubleSide;
      // Small hack to prevent black screen on iOS
      greenScreenVid.play();
      setTimeout(() => {
        greenScreenVid.pause();
      }, 500);

      setVideoLoaded(true);
    });

    return () => {
      greenScreenVid.removeEventListener("loadeddata", () => {});
    };
  }, [
    videoURL,
    chromaKeyColor,
    chromaKeySimilarity,
    chromaKeySmoothness,
    chromaKeySpill,
    sizeMultiplier,
  ]);

  useEffect(() => {
    if (videoLoaded) {
      if (playing) {
        increaseCurrentlyPlayingAudioCount();
        greenScreenVidRef.current.play();
      } else {
        reduceCurrentlyPlayingAudioCount();
        greenScreenVidRef.current.pause();
      }
    }
  }, [playing]);

  useEffect(() => {
    greenScreenVidRef.current.muted = isAudioMuted;
  }, [isAudioMuted]);

  return videoLoaded ? (
    <mesh
      ref={greenScreenPlaneRef}
      position={position}
      material={chromaKeyMaterial.current}
    >
      <planeGeometry
        args={[videoAspect * sizeMultiplier, 1 * sizeMultiplier]}
      />
    </mesh>
  ) : (
    <></> // Return nothing or a loading indicator if video hasn't loaded yet
  );
};

export default GreenScreenPlane;
