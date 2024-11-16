import { useState } from "react";
import { ARCanvas, ARTarget } from "core/AR";
import Model3D from "./core/content/Model3D";
import GreenScreenPlane from "./core/content/GreenScreenPlane";
import YouTube from "./core/content/YouTube";

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
        <Model3D URL="/car.glb" />
        <GreenScreenPlane playing={markiPlay} />
        <YouTube playing={markiPlay} />
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
