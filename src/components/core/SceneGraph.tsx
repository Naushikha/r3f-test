import Model3D from "./content/Model3D";
import { AppSceneGraphObject } from "./types/app";

const parseTransform = (transform: string) => {
  const [
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
  ] = transform.split(" ").map(Number);

  return {
    position: [positionX, positionY, positionZ],
    rotation: [rotationX, rotationY, rotationZ],
    scale: [scaleX, scaleY, scaleZ],
  };
};
const nodeMap: Record<string, React.FC<any>> = {
  content: Model3D, // Example: Add more mappings as needed
};

const SceneGraph = ({ data }: { data: AppSceneGraphObject[] }) => {
  return (
    <>
      {data.map((node, index) => {
        const Node = nodeMap[node.type];
        if (!Node) {
          console.warn(`No node found for type: ${node.type}`);
          return null;
        }
        const transform = parseTransform(node.config.transform);
        return (
          <Node
            key={index}
            URL={node.URL}
            {...node.config}
            position={transform.position}
            rotation={transform.rotation}
            scale={transform.scale}
          />
        );
      })}
    </>
  );
};

export default SceneGraph;
