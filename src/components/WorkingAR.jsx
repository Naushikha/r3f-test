import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { Matrix4, Quaternion, Vector3 } from "three";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import Webcam from "react-webcam";
import { Controller as ImageTargetController } from "mind-ar/dist/mindar-image.prod.js";
import { atom, useAtomValue, useSetAtom } from "jotai";
import { GLTFLoader } from "three/examples/jsm/Addons.js";
import { Environment, OrbitControls } from "@react-three/drei";

const anchorsAtom = atom({});
const webcamReadyAtom = atom(false);
const isWebcamFacingUserAtom = atom(false);
const flipUserCameraAtom = atom(false);

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

function ARProvider({
  children,
  imageTargetURL = "/car.mind",
  filterMinCF = null,
  filterBeta = null,
  warmupTolerance = null,
  missTolerance = null,
  maxTrack = 1,
  webcamRef,
  containerRef,
}) {
  const { camera } = useThree();
  const setAnchors = useSetAtom(anchorsAtom);
  const webcamReady = useAtomValue(webcamReadyAtom);
  const controllerRef = useRef(null);

  const resize = useCallback(() => {
    console.log("Resizing view");

    // This bit is very important!
    webcamRef.current.video.setAttribute(
      "width",
      webcamRef.current.video.videoWidth
    );
    webcamRef.current.video.setAttribute(
      "height",
      webcamRef.current.video.videoHeight
    );

    let vw, vh; // display css width, height
    const videoRatio =
      webcamRef.current.video.videoWidth / webcamRef.current.video.videoHeight;
    const containerRatio =
      containerRef.current.clientWidth / containerRef.current.clientHeight;
    if (videoRatio > containerRatio) {
      vh = containerRef.current.clientHeight;
      vw = vh * videoRatio;
    } else {
      vw = containerRef.current.clientWidth;
      vh = vw / videoRatio;
    }
    const proj = controllerRef.current.getProjectionMatrix();

    // TODO: move this logic to controller
    // Handle when phone is rotated, video width and height are swapped
    const inputRatio =
      controllerRef.current.inputWidth / controllerRef.current.inputHeight;
    let inputAdjust;
    if (inputRatio > containerRatio) {
      inputAdjust =
        webcamRef.current.video.width / controllerRef.current.inputWidth;
    } else {
      inputAdjust =
        webcamRef.current.video.height / controllerRef.current.inputHeight;
    }
    let videoDisplayHeight;
    let videoDisplayWidth;
    if (inputRatio > containerRatio) {
      videoDisplayHeight = containerRef.current.clientHeight;
      videoDisplayHeight *= inputAdjust;
    } else {
      videoDisplayWidth = containerRef.current.clientWidth;
      videoDisplayHeight =
        (videoDisplayWidth / controllerRef.current.inputWidth) *
        controllerRef.current.inputHeight;
      videoDisplayHeight *= inputAdjust;
    }
    let fovAdjust = containerRef.current.clientHeight / videoDisplayHeight;

    // const fov = 2 * Math.atan(1 / proj[5] / vh * containerRef.clientHeight) * 180 / Math.PI; // vertical fov
    const fov = (2 * Math.atan((1 / proj[5]) * fovAdjust) * 180) / Math.PI; // vertical fov
    const near = proj[14] / (proj[10] - 1.0);
    const far = proj[14] / (proj[10] + 1.0);
    const ratio = proj[5] / proj[0]; // (r-1) / (t -b)

    camera.fov = fov;
    // camera.near = near; // This clips out 3d objects in the canvas!
    camera.far = far;
    camera.aspect =
      containerRef.current.clientWidth / containerRef.current.clientHeight;
    camera.updateProjectionMatrix();

    webcamRef.current.video.style.top =
      -(vh - containerRef.current.clientHeight) / 2 + "px";
    webcamRef.current.video.style.left =
      -(vw - containerRef.current.clientWidth) / 2 + "px";
    webcamRef.current.video.style.width = vw + "px";
    webcamRef.current.video.style.height = vh + "px";
  }, [controllerRef, containerRef, webcamRef, camera]);

  const startTracking = useCallback(async () => {
    console.log("Starting AR...");

    const controller = new ImageTargetController({
      inputWidth: webcamRef.current.video.videoWidth,
      inputHeight: webcamRef.current.video.videoHeight,
      filterMinCF: filterMinCF,
      filterBeta: filterBeta,
      warmupTolerance: warmupTolerance,
      missTolerance: missTolerance,
      maxTrack: maxTrack,
      onUpdate: (data) => {
        if (data.type === "updateMatrix") {
          const { targetIndex, worldMatrix } = data;

          setAnchors((anchors) => ({
            ...anchors,
            [targetIndex]:
              worldMatrix !== null
                ? new Matrix4()
                    .fromArray([...worldMatrix])
                    .multiply(postMatrixs[targetIndex])
                    .toArray()
                : invisibleMatrix.toArray(),
          }));
        }
      },
    });

    controllerRef.current = controller;
    resize();

    const { dimensions: imageTargetDimensions } =
      await controller.addImageTargets(imageTargetURL);

    let postMatrixs = [];
    for (let i = 0; i < imageTargetDimensions.length; i++) {
      const position = new Vector3();
      const quaternion = new Quaternion();
      const scale = new Vector3();
      const [markerWidth, markerHeight] = imageTargetDimensions[i];
      position.x = markerWidth / 2;
      position.y = markerWidth / 2 + (markerHeight - markerWidth) / 2;
      scale.x = markerWidth;
      scale.y = markerWidth;
      scale.z = markerWidth;
      const postMatrix = new Matrix4();
      postMatrix.compose(position, quaternion, scale);
      postMatrixs.push(postMatrix);
    }

    await controller.dummyRun(webcamRef.current.video);
    controller.processVideo(webcamRef.current.video);
    console.log("AR processing started.");
  }, [imageTargetURL, resize]);

  const stopTracking = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.stopProcessVideo();
    }
  }, [controllerRef]);

  useEffect(() => {
    const resizeHandler = () => {
      resize();
    };
    window.addEventListener("resize", resizeHandler);
    return () => {
      window.removeEventListener("resize", resizeHandler);
      stopTracking();
    };
  }, [startTracking]);

  useEffect(() => {
    if (webcamReady) {
      startTracking();
    }
  }, [webcamReady, startTracking]);

  return <>{children}</>;
}

function ARAnchor({ children, target = 0, onAnchorFound, onAnchorLost }) {
  const ref = useRef();
  const anchors = useAtomValue(anchorsAtom);
  const flipUserCamera = useAtomValue(flipUserCameraAtom);

  useEffect(() => {
    if (ref.current) {
      if (anchors[target]) {
        ref.current.matrix = new Matrix4().fromArray(anchors[target]);
        // Check if this is being hidden by the controller onUpdate function
        if (invisibleMatrix.equals(ref.current.matrix)) {
          if (ref.current.visible !== false && onAnchorLost) onAnchorLost();
          ref.current.visible = false;
        } else {
          if (ref.current.visible !== true && onAnchorFound) onAnchorFound();
          ref.current.visible = true;
        }
      } else {
        if (ref.current.visible !== false && onAnchorLost) onAnchorLost();
        ref.current.visible = false;
      }
    }
  }, [anchors, target, onAnchorFound, onAnchorLost]);

  return (
    <group scale={[flipUserCamera ? -1 : 1, 1, 1]}>
      <group ref={ref} visible={false} matrixAutoUpdate={false}>
        {children}
      </group>
    </group>
  );
}

const UI_SwitchCamButton = () => {
  const isWebcamFacingUser = useAtomValue(isWebcamFacingUserAtom);
  const setIsWebcamFacingUser = useSetAtom(isWebcamFacingUserAtom);
  // You need to flip the camera in selfie mode
  const flipUserCamera = useAtomValue(flipUserCameraAtom);
  const setFlipUserCamera = useSetAtom(flipUserCameraAtom);

  const handleClick = () => {
    setIsWebcamFacingUser(!isWebcamFacingUser);
    setFlipUserCamera(!flipUserCamera);
  };

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        right: 0,
        zIndex: 1,
      }}
    >
    <button
      onClick={handleClick}
      style={{
        padding: "10px",
        fontSize: "16px",
        cursor: "pointer",
        border: "none",
        backgroundColor: "#007bff",
        color: "#fff",
        borderRadius: "4px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}
    >
      <span
        style={{
          display: "inline-block",
          transform: isWebcamFacingUser ? "rotateY(180deg)" : "rotateY(0deg)",
          transition: "transform 0.3s",
        }}
      >
        🔄
      </span>
        <b>SWITCH CAM</b>
    </button>
    </div>
  );
};

function UI_Scan() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
      }}
    >
      <h1 style={{ color: "white" }}>Scanning...</h1>
    </div>
  );
}

function UI_Loading() {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        color: "#fff",
        fontSize: "2rem",
        zIndex: 1000,
      }}
    >
      Loading...
    </div>
  );
}

function ARCanvas({ children, imageTargetURL, filterMinCF, filterBeta }) {
  const webcamRef = useRef();
  const canvasContainerRef = useRef();
  const setWebcamReady = useSetAtom(webcamReadyAtom);
  const anchors = useAtomValue(anchorsAtom);
  const isWebcamFacingUser = useAtomValue(isWebcamFacingUserAtom);
  const flipUserCamera = useAtomValue(flipUserCameraAtom);
  const [UIScanVisibility, setUIScanVisibility] = useState(false);

  const handleWebcam = useCallback(() => {
    if (webcamRef.current) {
      webcamRef.current.video.addEventListener("loadedmetadata", () => {
        setWebcamReady(true);
        console.log("Webcam is ready");
      });
    }
  }, [webcamRef]);

  useEffect(() => {
    const isAnyVisible = Object.values(anchors).some(
      (anchor) => !invisibleMatrix.equals(new Matrix4().fromArray(anchor))
    );
    setUIScanVisibility(!isAnyVisible);
  }, [anchors]);

  return (
    <div
      id="ar-canvas-container"
      ref={canvasContainerRef}
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <UI_SwitchCamButton />
      {UIScanVisibility && <UI_Scan />}
      <Suspense fallback={<UI_Loading />}>
        <Canvas>
          <Environment files="/metro_vijzelgracht_1k.hdr" />
          <ARProvider
            imageTargetURL={imageTargetURL}
            webcamRef={webcamRef}
            containerRef={canvasContainerRef}
            filterMinCF={filterMinCF}
            filterBeta={filterBeta}
          />
            {children}
        </Canvas>
      </Suspense>
      <Webcam
        ref={webcamRef}
        onUserMedia={handleWebcam}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: -2,
        }}
        videoConstraints={{
          facingMode: isWebcamFacingUser ? "user" : "environment",
        }}
        mirrored={isWebcamFacingUser && flipUserCamera}
      />
    </div>
  );
}

// for testing
// https://stackoverflow.com/questions/68813736/use-the-same-gltf-model-twice-in-react-three-fiber-drei-three-js
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
      <primitive object={gltf.scene.clone()} />
    </mesh>
  );
}

function ARParent() {
  return (
    <ARCanvas imageTargetURL="/car.mind" filterMinCF={0.001} filterBeta={0.001}>
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <ARAnchor
        target={0}
        onAnchorFound={() => console.log("Found image target!")}
        onAnchorLost={() => console.log("Lost image target!")}
      >
        <Car3D />
        {/* <mesh>
                    <boxGeometry args={[1, 1, 0.1]} />
                    <meshStandardMaterial color="orange" />
                </mesh> */}
      </ARAnchor>
      <group scale={[1, 1, 1]} position={[0, 0, 0]} rotation={[0, 0, 0]}>
        <Car3D />
      </group>
      <OrbitControls />
    </ARCanvas>
  );
}

export default ARParent;

// TODO: convert to typescript
// TODO: rename anchors to targets

// on anchor lost >> returns to 3D, activates orbitcontrols
// on anchor found >> returns to AR

// manually switch to 3D / AR
