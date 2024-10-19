import * as THREE from "three";
import { useState, useRef, useEffect } from "react";
import { Canvas, useFrame, ThreeElements } from "@react-three/fiber";
import { Mesh } from "three";
import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Stats, OrbitControls } from "@react-three/drei";
import { TextureLoader } from "three/src/loaders/TextureLoader.js";

function Car3D() {
  const [active, setActive] = useState(false);
  const gltf = useLoader(GLTFLoader, "/car.glb");
  return (
    <mesh
      scale={active ? 1.5 : 1}
      onClick={(e) => {
        e.stopPropagation();
        setActive(!active);
      }}
    >
      <primitive object={gltf.scene} />
    </mesh>
  );
}

function Sophia3D() {
  const [active, setActive] = useState(false);
  const mixer = useRef<THREE.AnimationMixer>(null!);
  const gltf = useLoader(GLTFLoader, "/sophia.glb");
  useEffect(() => {
    mixer.current = new THREE.AnimationMixer(gltf.scene);
    mixer.current.clipAction(gltf.animations[0]).play();
  }, [gltf]);

  useFrame((_, delta) => {
    mixer.current.update(delta);
  });

  return (
    <mesh
      scale={active ? 0.0075 : 0.005}
      onClick={(e) => {
        e.stopPropagation();
        setActive(!active);
      }}
      position={[0, 0, 1]}
    >
      <primitive object={gltf.scene} />
    </mesh>
  );
}

function Box(props: ThreeElements["mesh"]) {
  // This reference will give us direct access to the mesh
  const meshRef = useRef<Mesh>(null!);
  // Set up state for the hovered and active state
  const [hovered, setHover] = useState(false);
  const [active, setActive] = useState(false);
  // Subscribe this component to the render-loop, rotate the mesh every frame
  useFrame((_, delta) => (meshRef.current.rotation.x += delta));
  // Return view, these are regular three.js elements expressed in JSX
  return (
    <mesh
      {...props}
      ref={meshRef}
      scale={active ? 1.5 : 1}
      onClick={(e) => {
        e.stopPropagation();
        setActive(!active);
      }}
      onPointerOver={(_) => setHover(true)}
      onPointerOut={(_) => setHover(false)}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={hovered ? "hotpink" : "orange"} />
    </mesh>
  );
}

function Scene3D() {
  const colorMap = useLoader(TextureLoader, "/outside.jpg");
  return (
    <Canvas>
      <ambientLight intensity={Math.PI / 2} />
      <spotLight
        position={[10, 10, 10]}
        angle={0.15}
        penumbra={1}
        decay={0}
        intensity={Math.PI}
      />
      <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
      <Box position={[-1.2, 0, 0]} />
      <Box position={[1.2, 0, 0]} />
      <Car3D />
      <Sophia3D />
      <OrbitControls />
      <mesh>
        <sphereGeometry args={[500, 60, 40]} />
        <meshBasicMaterial map={colorMap} side={THREE.BackSide} />
      </mesh>
      <Stats />
    </Canvas>
  );
}

export default Scene3D;
