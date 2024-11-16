import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader, SkeletonUtils } from "three/examples/jsm/Addons.js";

interface Model3DProps {
  URL?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  onClick?: () => void;
}

// https://github.com/pmndrs/react-three-fiber/issues/245
function useMeshCloneForGLTF(URL: string) {
  const gltf = useLoader(GLTFLoader, URL);
  const clonedScene = useMemo(() => SkeletonUtils.clone(gltf.scene), [gltf]);
  return { gltfScene: clonedScene, gltfAnimations: gltf.animations };
}

const Model3D: React.FC<Model3DProps> = ({
  URL = "/car.glb",
  position = [0, 0, 0],
  rotation = [0, -1.57, 0],
  scale = [1, 1, 1],
  onClick = () => {},
}) => {
  const { gltfScene, gltfAnimations } = useMeshCloneForGLTF(URL);
  const mixer = useRef<THREE.AnimationMixer>(null!);

  useEffect(() => {
    if (gltfAnimations.length > 0) {
      mixer.current = new THREE.AnimationMixer(gltfScene);
      mixer.current.clipAction(gltfAnimations[0]).play();
    }
  }, [gltfScene]);

  useFrame((_, delta) => {
    mixer.current && mixer.current.update(delta);
  });

  return (
    <mesh
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={(e) => {
        e.stopPropagation();
        onClick && onClick();
      }}
    >
      <primitive object={gltfScene} />
    </mesh>
  );
};

export default Model3D;
