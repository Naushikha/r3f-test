import { Canvas, useThree } from "@react-three/fiber";
import {
  forwardRef,
  ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Group, Matrix4, PerspectiveCamera, Quaternion, Vector3 } from "three";
import { atom, useAtomValue, useSetAtom } from "jotai";
import Webcam from "react-webcam";
import { useWindowSize } from "usehooks-ts";
// import { Controller as FaceTargetController } from "mind-ar/src/face-target/controller";
import { Html } from "@react-three/drei";
import { Controller as ImageTargetController } from "mind-ar/src/image-target/controller";

const imageTargetExistsAtom = atom(false);
const anchorsAtom = atom<Matrix4[]>([]);
const flipUserCameraAtom = atom(true);

const invisibleMatrix = new Matrix4().set(
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1
);

interface ARProviderProps {
  children: ReactNode;
  autoplay?: boolean;
  imageTargetURL: string;
  maxTrack?: number;
  filterMinCF?: number | null;
  filterBeta?: number | null;
  warmupTolerance?: number | null;
  missTolerance?: number | null;
  flipUserCamera?: boolean;
  onReady?: () => void;
  onError?: (error: string) => void;
}

interface ARProviderRef {
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  switchCamera: () => void;
}

interface ARViewProps {
  children: ReactNode;
  autoplay?: boolean;
  imageTargetURL: string;
  maxTrack?: number;
  filterMinCF?: number;
  filterBeta?: number;
  warmupTolerance?: number;
  missTolerance?: number;
  flipUserCamera?: boolean;
  onReady?: () => void;
  onError?: (error: Error) => void;
  // Add any other props you might want to spread
  [key: string]: any; // To allow other props (`...rest`)
}

interface ARViewRef {
  startTracking: () => void;
  stopTracking: () => void;
  switchCamera: () => void;
  current: HTMLCanvasElement | null;
}

interface ARAnchorProps {
  children: ReactNode;
  target?: number;
  onAnchorFound?: () => void;
  onAnchorLost?: () => void;
  // Add other props you want to spread (`...rest`) if needed
  [key: string]: any; // To allow other props (like the rest)
}

const ARProvider = forwardRef<ARProviderRef, ARProviderProps>(
  (
    {
      children,
      autoplay = true,
      imageTargetURL,
      maxTrack,
      filterMinCF = null,
      filterBeta = null,
      warmupTolerance = null,
      missTolerance = null,
      flipUserCamera = true,
      onReady = null,
      onError = null,
    },
    ref
  ) => {
    const [isWebcamFacingUser, switchCamera] = useState(
      !Boolean(imageTargetURL)
    );
    const webcamRef = useRef<Webcam>(null); // Type for the webcam ref
    const [ready, setReady] = useState(false);
    const controllerRef = useRef<any>(null); // Use a specific type for your controller if available
    const { camera } = useThree();
    const setImageTargetExists = useSetAtom(imageTargetExistsAtom);
    const setAnchors = useSetAtom(anchorsAtom);
    // const setFaceMesh = useSetAtom(faceMeshAtom);
    const setFlipUserCamera = useSetAtom(flipUserCameraAtom);

    const { width = 0, height = 0 } = useWindowSize();

    useEffect(() => {
      setFlipUserCamera(flipUserCamera);
    }, [flipUserCamera, setFlipUserCamera]);

    useEffect(() => {
      setImageTargetExists(Boolean(imageTargetURL));
    }, [imageTargetURL, setImageTargetExists]);

    const handleStream = useCallback(() => {
      if (webcamRef.current && webcamRef.current.video) {
        webcamRef.current.video.addEventListener("loadedmetadata", () =>
          setReady(true)
        );
      }
    }, [webcamRef]);

    const startTracking = useCallback(async () => {
      if (ready) {
        if (!(imageTargetURL && webcamRef.current && webcamRef.current.video))
          return;
        let controller;
        controller = new ImageTargetController({
          inputWidth: webcamRef.current.video.videoWidth,
          inputHeight: webcamRef.current.video.videoHeight,
          maxTrack,
          filterMinCF,
          filterBeta,
          missTolerance,
          warmupTolerance,
        });

        const { dimensions: imageTargetDimensions } =
          await controller.addImageTargets(imageTargetURL);

        const postMatrices = imageTargetDimensions.map(
          ([markerWidth, markerHeight]) =>
            new Matrix4().compose(
              new Vector3(
                markerWidth / 2,
                markerWidth / 2 + (markerHeight - markerWidth) / 2
              ),
              new Quaternion(),
              new Vector3(markerWidth, markerWidth, markerWidth)
            )
        );

        const ARprojectionMatrix = controller.getProjectionMatrix();
        (camera as PerspectiveCamera).fov =
          (2 * Math.atan(1 / ARprojectionMatrix[5]) * 180) / Math.PI;
        camera.near = ARprojectionMatrix[14] / (ARprojectionMatrix[10] - 1.0);
        camera.far = ARprojectionMatrix[14] / (ARprojectionMatrix[10] + 1.0);
        camera.updateProjectionMatrix();

        controller.onUpdate = ({ type, targetIndex, worldMatrix }) => {
          if (type === "updateMatrix") {
            setAnchors((anchors) => ({
              ...anchors,
              [targetIndex]:
                worldMatrix !== null
                  ? new Matrix4()
                      .fromArray([...worldMatrix])
                      .multiply(postMatrices[targetIndex])
                  : invisibleMatrix,
            }));
          }
        };

        // else {
        //   controller = new FaceTargetController({
        //     filterMinCF,
        //     filterBeta,
        //   });

        //   controller.onUpdate = ({ hasFace, estimateResult }) =>
        //     setFaceMesh(hasFace ? estimateResult : null);

        //   await controller.setup(webcamRef.current.video);

        //   const { fov, aspect, near, far } = controller.getCameraParams();
        //   camera.fov = fov;
        //   camera.aspect = aspect;
        //   camera.near = near;
        //   camera.far = far;
        //   camera.updateProjectionMatrix();
        // }

        await controller.dummyRun(webcamRef.current.video);
        controller.processVideo(webcamRef.current.video);
        controllerRef.current = controller;

        onReady && onReady();
      }
    }, [
      ready,
      imageTargetURL,
      onReady,
      maxTrack,
      filterMinCF,
      filterBeta,
      missTolerance,
      warmupTolerance,
      camera,
      setAnchors,
      //   setFaceMesh,
    ]);

    const stopTracking = useCallback(() => {
      if (controllerRef.current) {
        controllerRef.current.stopProcessVideo();
      }
    }, [controllerRef]);

    useImperativeHandle(
      ref,
      () => ({
        startTracking,
        stopTracking,
        switchCamera: () => {
          const wasTracking =
            controllerRef.current && controllerRef.current.processingVideo;
          wasTracking && stopTracking();
          setReady(false);
          switchCamera((isWebcamFacingUser) => !isWebcamFacingUser);
          wasTracking && startTracking();
        },
      }),
      [startTracking, stopTracking]
    );

    useEffect(() => {
      if (ready && autoplay) {
        startTracking();
      }
    }, [autoplay, ready, startTracking]);

    const feedStyle = useMemo(() => {
      if (webcamRef.current && webcamRef.current.video) {
        return {
          width: "auto",
          maxWidth: "none",
          height: "inherit",
          marginLeft: `${
            webcamRef.current.video.clientWidth > 0 && ready
              ? (width - webcamRef.current.video.clientWidth) / 2
              : 0
          }px`,
        };
      }
    }, [width, ready, webcamRef]);

    return (
      <>
        <Html
          fullscreen
          zIndexRange={[-1, -1]}
          calculatePosition={() => [0, 0]}
          style={{
            top: 0,
            left: 0,
          }}
        >
          <Webcam
            ref={webcamRef}
            onUserMedia={handleStream}
            onUserMediaError={(e) => {
              onError && onError(e.toString());
            }}
            height={height}
            width={width}
            videoConstraints={{
              facingMode: isWebcamFacingUser ? "user" : "environment",
            }}
            style={feedStyle}
            mirrored={isWebcamFacingUser && flipUserCamera}
          />
        </Html>
        {children}
      </>
    );
  }
);

const ARView = forwardRef<ARViewRef, ARViewProps>(
  (
    {
      children,
      autoplay = true,
      imageTargetURL,
      maxTrack = 1,
      filterMinCF,
      filterBeta,
      warmupTolerance,
      missTolerance,
      flipUserCamera = true,
      onReady,
      onError,
      ...rest
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null); // Use a type for the canvas ref
    const ARRef = useRef<any>(null); // Use a generic type for ARRef, or you can replace `any` with the specific type of your ARProvider

    useImperativeHandle(ref, () => ({
      startTracking: () => ARRef.current?.startTracking(),
      stopTracking: () => ARRef.current?.stopTracking(),
      switchCamera: () => ARRef.current?.switchCamera(),
      current: canvasRef.current,
    }));

    return (
      <Canvas
        style={{ position: "absolute", minWidth: "100vw", minHeight: "100vh" }}
        {...rest}
        ref={canvasRef}
      >
        <Suspense fallback={null}>
          <ARProvider
            autoplay={autoplay}
            imageTargetURL={imageTargetURL}
            maxTrack={maxTrack}
            filterMinCF={filterMinCF}
            filterBeta={filterBeta}
            warmupTolerance={warmupTolerance}
            missTolerance={missTolerance}
            flipUserCamera={flipUserCamera}
            onReady={onReady}
            onError={onError}
            ref={ARRef}
          >
            {children}
          </ARProvider>
        </Suspense>
      </Canvas>
    );
  }
);

const ARAnchor: React.FC<ARAnchorProps> = ({
  children,
  target = 0,
  onAnchorFound,
  onAnchorLost,
  ...rest
}) => {
  const ref = useRef<Group>(null);
  const anchors = useAtomValue(anchorsAtom);
  const imageTargetExists = useAtomValue(imageTargetExistsAtom);
  const flipUserCamera = useAtomValue(flipUserCameraAtom);
  //   const faceMesh = useAtomValue(faceMeshAtom);

  useEffect(() => {
    if (ref.current) {
      if (imageTargetExists) {
        if (anchors[target]) {
          if (ref.current.visible !== true && onAnchorFound) onAnchorFound();
          ref.current.visible = true;
          //   ref.current.matrix = new Matrix4().fromArray(anchors[target]);
          ref.current.matrix = anchors[target];
        } else {
          if (ref.current.visible !== false && onAnchorLost) onAnchorLost();
          ref.current.visible = false;
        }
      } else {
        if (ref.current.visible !== false && onAnchorLost) onAnchorLost();
        ref.current.visible = false;
      }
    }
  }, [anchors, target, onAnchorFound, onAnchorLost, imageTargetExists]);

  return (
    <group scale={[flipUserCamera ? -1 : 1, 1, 1]}>
      <group ref={ref} visible={false} matrixAutoUpdate={false} {...rest}>
        {children}
      </group>
    </group>
  );
};

function MyAR() {
  return (
    <ARView
      imageTargetURL="https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.1.4/examples/image-tracking/assets/card-example/card.mind"
      filterMinCF={1}
      filterBeta={10000}
      missTolerance={0}
      warmupTolerance={0}
    >
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <ARAnchor target={0}>
        <mesh>
          <boxGeometry args={[1, 1, 0.1]} />
          <meshStandardMaterial color="orange" />
        </mesh>
      </ARAnchor>
    </ARView>
  );
}

export default MyAR;
