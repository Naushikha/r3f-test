import { Html } from "@react-three/drei";
import ReactPlayer from "react-player";

interface YouTubeProps {
  URL?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  playing?: boolean;
}

const YouTube: React.FC<YouTubeProps> = ({
  URL = "https://www.youtube.com/watch?v=ZpUYjpKg9KY",
  position = [0.5, 0.5, -0.5],
  rotation = [0, 0, 0],
  scale = [0.1, 0.1, 0.1],
  playing = false,
}) => {
  return (
    <Html
      style={{ userSelect: "none" }}
      occlude="blending"
      zIndexRange={[10, 0]}
      position={position}
      rotation={rotation}
      scale={scale}
      transform
      className="testing-html"
    >
      <ReactPlayer
        url={URL}
        playing={playing}
        loop={true}
        style={{ visibility: playing ? "visible" : "hidden" }} // https://github.com/pmndrs/drei/issues/1323
      />
    </Html>
  );
};

export default YouTube;
