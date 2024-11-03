import { Canvas, useLoader } from "@react-three/fiber";
import { XR, createXRStore } from "@react-three/xr";
// import { useState } from "react";
import * as THREE from "three";

import { TextureLoader } from "three/src/loaders/TextureLoader.js";

const store = createXRStore();
function SceneVR360() {
  const colorMap = useLoader(TextureLoader, "/outside.jpg");
  return (
    <>
      <button onClick={() => store.enterAR()}>Enter AR</button>
      <Canvas>
        <XR store={store}>
          <mesh>
            <sphereGeometry args={[500, 60, 40]} />
            <meshBasicMaterial map={colorMap} side={THREE.BackSide} />
          </mesh>
        </XR>
      </Canvas>
    </>
  );
}

export default SceneVR360;
