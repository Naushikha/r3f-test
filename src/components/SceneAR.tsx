import * as THREE from "three";
import { useEffect, useRef, useState } from "react";
import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/Addons.js";
import { ARCanvas, ARTarget } from "core/AR";
import ChromaKeyMaterial from "./core/shader/ChromaKeyMaterial";

// for testing
// https://stackoverflow.com/questions/68813736/use-the-same-gltf-model-twice-in-react-three-fiber-drei-three-js
function Car3D() {
  const [active, setActive] = useState(false);
  const gltf = useLoader(GLTFLoader, "/car.glb");
  return (
    <mesh
      scale={active ? 1.5 : 1}
      rotation={[0, -1.57, 0]}
      onClick={(e) => {
        e.stopPropagation();
        setActive(!active);
      }}
    >
      <primitive object={gltf.scene.clone()} />
    </mesh>
  );
}

interface GreenScreenPlaneProps {
  videoURL: string;
  chromaKeyColor: number;
  chromaKeySimilarity: number;
  chromaKeySmoothness: number;
  chromaKeySpill: number;
  position: [number, number, number];
  sizeMultiplier: number;
  playback: boolean;
}

const GreenScreenPlane: React.FC<GreenScreenPlaneProps> = ({
  videoURL,
  chromaKeyColor,
  position,
  sizeMultiplier,
  chromaKeySimilarity = 0.01,
  chromaKeySmoothness = 0.18,
  chromaKeySpill = 0.1,
  playback = false,
}) => {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoAspect, setVideoAspect] = useState(1);
  const greenScreenPlaneRef = useRef<THREE.Mesh>(null!);
  const chromaKeyMaterial = useRef<THREE.Material>(null!);
  const greenScreenVidRef = useRef<HTMLVideoElement>(null!);

  useEffect(() => {
    const greenScreenVid = document.createElement("video");
    greenScreenVidRef.current = greenScreenVid;
    greenScreenVid.src = videoURL;
    greenScreenVid.loop = true;
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
      if (playback) greenScreenVidRef.current.play();
      else greenScreenVidRef.current.pause();
    }
  }, [playback]);

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

function ARExperience() {
  const [markiPlay, setMarkiPlay] = useState(false);

  return (
    <ARCanvas imageTargetURL="/car.mind" filterMinCF={0.001} filterBeta={0.001}>
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <ARTarget
        index={0}
        onTargetFound={() => {
          console.log("Found image target!");
          setMarkiPlay(true);
        }}
        onTargetLost={() => {
          console.log("Lost image target!");
          setMarkiPlay(false);
        }}
      >
        <Car3D />
        <GreenScreenPlane
          videoURL="/marki.mp4"
          chromaKeyColor={0x03ff02}
          chromaKeySimilarity={0.3}
          chromaKeySmoothness={0.15}
          chromaKeySpill={0.01}
          position={[0, 1, 0]}
          sizeMultiplier={1.35}
          playback={markiPlay}
        />
        {/* <mesh>
                      <boxGeometry args={[1, 1, 0.1]} />
                      <meshStandardMaterial color="orange" />
                  </mesh> */}
      </ARTarget>
      {/* <group scale={[1, 1, 1]} position={[0, 0, 0]} rotation={[0, 0, 0]}>
          <Car3D />
        </group> */}
    </ARCanvas>
  );
}

export default ARExperience;

// TODO: convert to typescript
// TODO: add green screen shader and marki stock video
