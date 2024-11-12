import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { Matrix4, Quaternion, Vector3 } from "three";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import Webcam from "react-webcam";
import { Controller as ImageTargetController } from "mind-ar/dist/mindar-image.prod.js";
import { atom, useAtomValue, useSetAtom } from "jotai";
import { GLTFLoader } from "three/examples/jsm/Addons.js";
import {
  Environment,
  GizmoHelper,
  GizmoViewport,
  OrbitControls,
  useProgress,
} from "@react-three/drei";

const targetsAtom = atom({});
const webcamReadyAtom = atom(false);
const isWebcamFacingUserAtom = atom(false);
const flipUserCameraAtom = atom(false);
const isViewingMode3DAtom = atom(false); // Switch between AR / 3D
const isAnyTargetVisibleAtom = atom(false);

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
  const isInitialRender = useRef(true);
  const targets = useAtomValue(targetsAtom);
  const setTargets = useSetAtom(targetsAtom);
  const setIsAnyTargetVisible = useSetAtom(isAnyTargetVisibleAtom);
  const isViewingMode3D = useAtomValue(isViewingMode3DAtom);
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

          setTargets((targets) => ({
            ...targets,
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
      const quaternion = new Quaternion()
        // this fixes the output and places content properly
        .setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);
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
      console.log("AR processing stopped.");
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

  useEffect(() => {
    // TODO: This could be moved to onUpdate function to reduce CPU cycles
    const isAnyVisible = Object.values(targets).some(
      (target) => !invisibleMatrix.equals(new Matrix4().fromArray(target))
    );
    setIsAnyTargetVisible(isAnyVisible);
  }, [targets]);

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      console.log(camera);
      return;
    }
    setIsAnyTargetVisible(false); // this doesnt get set automatically
    if (isViewingMode3D) {
      stopTracking();
      camera.position.set(1, 1, 3);
      camera.rotation.set(0, 0, 0);
      camera.lookAt(0, 0, 0);
    } else {
      camera.position.set(0, 0, 5);
      camera.rotation.set(0, 0, 0);
      startTracking();
    }
  }, [isViewingMode3D]);

  return <>{children}</>;
}

function ARCanvas({ children, imageTargetURL, filterMinCF, filterBeta }) {
  const webcamRef = useRef();
  const canvasContainerRef = useRef();
  const setWebcamReady = useSetAtom(webcamReadyAtom);
  const isAnyTargetVisible = useAtomValue(isAnyTargetVisibleAtom);
  const isViewingMode3D = useAtomValue(isViewingMode3DAtom);
  const isWebcamFacingUser = useAtomValue(isWebcamFacingUserAtom);
  const flipUserCamera = useAtomValue(flipUserCameraAtom);

  const handleWebcam = useCallback(() => {
    if (webcamRef.current) {
      webcamRef.current.video.addEventListener("loadedmetadata", () => {
        setWebcamReady(true);
        console.log("Webcam is ready");
      });
    }
  }, [webcamRef]);

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
      <UI_HUD />
      <Suspense fallback={<UI_Loading />}>
        <Canvas>
          {/* <GizmoHelper
            alignment="bottom-right" // widget alignment within scene
            margin={[80, 80]} // widget margins (X, Y)
          >
            <GizmoViewport
              axisColors={["red", "green", "blue"]}
              labelColor="black"
            />
          </GizmoHelper> */}
          <OrbitControls enabled={isViewingMode3D} />
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

function ARTarget({ children, index = 0, onTargetFound, onTargetLost }) {
  const groupRef = useRef();
  const targets = useAtomValue(targetsAtom);
  const flipUserCamera = useAtomValue(flipUserCameraAtom);
  const isViewingMode3D = useAtomValue(isViewingMode3DAtom);

  useEffect(() => {
    if (groupRef.current && !isViewingMode3D) {
      if (targets[index]) {
        groupRef.current.matrix = new Matrix4().fromArray(targets[index]);
        // Check if this is being hidden by the controller onUpdate function
        if (invisibleMatrix.equals(groupRef.current.matrix)) {
          if (groupRef.current.visible !== false && onTargetLost)
            onTargetLost();
          groupRef.current.visible = false;
        } else {
          if (groupRef.current.visible !== true && onTargetFound)
            onTargetFound();
          groupRef.current.visible = true;
        }
      } else {
        if (groupRef.current.visible !== false && onTargetLost) onTargetLost();
        groupRef.current.visible = false;
      }
    }
  }, [targets, index, onTargetFound, onTargetLost]);

  useEffect(() => {
    if (isViewingMode3D && groupRef.current.visible) {
      console.log("isViewingMode3D && groupRef.current.visible");

      groupRef.current.position.set(0, 0, 0);
      groupRef.current.rotation.set(0, 0, 0);
      groupRef.current.scale.set(1, 1, 1);
      groupRef.current.updateMatrix();
    }
    if (!isViewingMode3D && groupRef.current.visible) {
      console.log("!isViewingMode3D && groupRef.current.visible");
      groupRef.current.matrix = invisibleMatrix;
    }
  }, [isViewingMode3D]);

  return (
    <group scale={[flipUserCamera ? -1 : 1, 1, 1]}>
      <group ref={groupRef} visible={false} matrixAutoUpdate={false}>
        {children}
      </group>
    </group>
  );
}

const UI_ButtonStyle = {
  padding: "10px",
  fontSize: "16px",
  cursor: "pointer",
  border: "none",
  backgroundColor: "#000000",
  color: "#fff",
  borderRadius: "4px",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  pointerEvents: "auto",
};

function UI_HUD() {
  const isWebcamFacingUser = useAtomValue(isWebcamFacingUserAtom);
  const setIsWebcamFacingUser = useSetAtom(isWebcamFacingUserAtom);
  // You need to flip the camera in selfie mode
  const flipUserCamera = useAtomValue(flipUserCameraAtom);
  const setFlipUserCamera = useSetAtom(flipUserCameraAtom);

  const isViewingMode3D = useAtomValue(isViewingMode3DAtom);
  const setIsViewingMode3D = useSetAtom(isViewingMode3DAtom);

  const isAnyTargetVisible = useAtomValue(isAnyTargetVisibleAtom);

  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  const handleSwitchCam = () => {
    setIsWebcamFacingUser(!isWebcamFacingUser);
    setFlipUserCamera(!flipUserCamera);
  };

  const handleSwitch3DAR = () => {
    setIsViewingMode3D(!isViewingMode3D);
  };

  return (
    <div
      style={{
        position: "absolute",
        zIndex: 1,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          display: "flex",
          flexDirection: "row",
          gap: "16px",
        }}
      >
        <button onClick={handleSwitchCam} style={UI_ButtonStyle}>
          <span
            style={{
              display: "inline-block",
              transform: isWebcamFacingUser
                ? "rotateY(180deg)"
                : "rotateY(0deg)",
              transition: "transform 0.3s",
            }}
          >
            🔄
          </span>
          <b>SWITCH CAM</b>
        </button>
        {isAnyTargetVisible && (
          <button onClick={handleSwitch3DAR} style={UI_ButtonStyle}>
            <span
              style={{
                display: "inline-block",
                transform: isWebcamFacingUser
                  ? "rotateY(180deg)"
                  : "rotateY(0deg)",
                transition: "transform 0.3s",
              }}
            >
              {isViewingMode3D ? "🌐" : "📦"}
            </span>
            <b>{isViewingMode3D ? "AR" : "3D"}</b>
          </button>
        )}
      </div>
      {!isAnyTargetVisible && (
        <div
          style={{
            ...UI_ButtonStyle,
            position: "absolute",
            bottom: 0,
            left: 0,
            letterSpacing: "4px",
            cursor: "default",
          }}
        >
          <b>SCANNING...</b>
        </div>
      )}
      <button
        onClick={toggleFullscreen}
        style={{
          ...UI_ButtonStyle,
          position: "absolute",
          top: 0,
          right: 0,
        }}
      >
        {isFullscreen ? "🔲" : "🔳"}
      </button>
    </div>
  );
}

function UI_Loading() {
  // https://drei.docs.pmnd.rs/loaders/progress-use-progress
  const { active, progress, errors, item, loaded, total } = useProgress();

  useEffect(() => {
    console.log(
      `> Loading asset (${loaded}/${total}): ${item}\n | Progress: ${progress} | Active: ${active} | Errors: ${errors} |`
    );
  }, [active, progress, errors, item, loaded, total]);

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
        backgroundColor: "rgba(0, 0, 0, 1)",
        color: "#fff",
        fontSize: "2rem",
        textAlign: "center",
        zIndex: 1000,
      }}
    >
      Loading... <br />
      {progress}%
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
