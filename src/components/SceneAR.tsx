import { useState } from "react";
import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/Addons.js";
import { ARCanvas, ARTarget } from "core/AR";

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

function ARExperience() {
  return (
    <ARCanvas imageTargetURL="/car.mind" filterMinCF={0.001} filterBeta={0.001}>
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <ARTarget
        index={0}
        onTargetFound={() => console.log("Found image target!")}
        onTargetLost={() => console.log("Lost image target!")}
      >
        <Car3D />
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
