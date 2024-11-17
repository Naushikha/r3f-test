import Model3D from "./content/Model3D";

const parseTransformV1 = (transform: string) => {
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

const parseSceneDataV1 = (data: any) => {
  return data.nodes.map((node: any) => ({
    type: node.type,
    config: {
      ...node.config,
      transform: parseTransformV1(node.config.transform),
    },
  }));
};

// Example parser for v2 (could include new fields or changes in data structure)
const parseSceneDataV2 = (data: any) => {
  return data.nodes.map((node: any) => ({
    type: node.type,
    config: {
      ...node.config,
      transform: parseTransformV1(node.config.transform), // Assuming same transform format
      newFeature: node.config.newFeature || "default", // Handle new data
    },
  }));
};

const sceneParsers: Record<string, (data: any) => any> = {
  v1: parseSceneDataV1,
  v2: parseSceneDataV2,
};

const componentMap: Record<string, React.FC<any>> = {
  content: Model3D, // Example: Add more mappings as needed
};

const SceneGraph = ({ data }: { data: any }) => {
  const parser = sceneParsers[data.version];
  if (!parser) {
    throw new Error(`Unsupported scene graph version: ${data.version}`);
  }

  const parsedData = parser(data);

  return (
    <>
      {parsedData.map((node: any, index: number) => {
        const Component = componentMap[node.type];
        if (!Component) {
          console.warn(`No component found for type: ${node.type}`);
          return null;
        }
        return <Component key={index} {...node.config} />;
      })}
    </>
  );
};

export default SceneGraph;
