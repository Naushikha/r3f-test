import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/Addons.js";

interface Model3DProps {
  URL?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  onClick?: () => void;
}

// https://stackoverflow.com/questions/68813736/use-the-same-gltf-model-twice-in-react-three-fiber-drei-three-js

const Model3D: React.FC<Model3DProps> = ({
  URL = "/car.glb",
  position = [0, 0, 0],
  rotation = [0, -1.57, 0],
  scale = [1, 1, 1],
  onClick = () => {},
}) => {
  const gltf = useLoader(GLTFLoader, URL);
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
      <primitive object={gltf.scene.clone()} />
    </mesh>
  );
};

export default Model3D;
