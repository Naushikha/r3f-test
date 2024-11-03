import { Canvas, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { atom, useAtomValue, useSetAtom } from "jotai";
import Webcam from "react-webcam";
import { Matrix4, Quaternion, Vector3 } from "three";
import { Html } from "@react-three/drei";
import { Controller as ImageTargetController } from "mind-ar/dist/mindar-image.prod.js";
import { forwardRef } from "react";
import { useWindowSize } from "usehooks-ts";
import { useImperativeHandle } from "react";
import { Suspense } from "react";
// import './App.css'

const imageTargetExistsAtom = atom(false);
const anchorsAtom = atom({});
const flipUserCameraAtom = atom(false);
const invisibleMatrix = new Matrix4().set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1);
// NEED TO IMPLEMENT TO SHOW SCANNING UI WHEN NO ANCHORS VISIBLE

const ARProvider = forwardRef(
    (
        {
            children,
            autoplay,
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
        const [isWebcamFacingUser, switchCamera] = useState(!Boolean(imageTargetURL));
        const webcamRef = useRef(null);
        const containerRef = useRef(null);
        const [ready, setReady] = useState(false);
        const controllerRef = useRef(null);
        const { camera } = useThree();
        const setImageTargetExists = useSetAtom(imageTargetExistsAtom);
        const setAnchors = useSetAtom(anchorsAtom);
        const setFlipUserCamera = useSetAtom(flipUserCameraAtom);

        const { width = 0, height = 0 } = useWindowSize();

        // useEffect(
        //     () => setFlipUserCamera(flipUserCamera),
        //     [flipUserCamera, setFlipUserCamera]
        // );

        useEffect(() => {
            if (webcamRef.current && controllerRef.current) {
                resize()
                console.log(width, height)
            }
        }, [width, height])


        const resize = useCallback(() => {
            let vw, vh; // display css width, height
            const videoRatio = webcamRef.current.video.videoWidth / webcamRef.current.video.videoHeight;
            const containerRatio = containerRef.current.clientWidth / containerRef.current.clientHeight;
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
            const inputRatio = controllerRef.current.inputWidth / controllerRef.current.inputHeight;
            let inputAdjust;
            if (inputRatio > containerRatio) {
                inputAdjust = webcamRef.current.video.width / controllerRef.current.inputWidth;
            } else {
                inputAdjust = webcamRef.current.video.height / controllerRef.current.inputHeight;
            }
            let videoDisplayHeight;
            let videoDisplayWidth;
            if (inputRatio > containerRatio) {
                videoDisplayHeight = containerRef.current.clientHeight;
                videoDisplayHeight *= inputAdjust;
            } else {
                videoDisplayWidth = containerRef.current.clientWidth;
                videoDisplayHeight = videoDisplayWidth / controllerRef.current.inputWidth * controllerRef.current.inputHeight;
                videoDisplayHeight *= inputAdjust;
            }
            let fovAdjust = containerRef.current.clientHeight / videoDisplayHeight;

            // const fov = 2 * Math.atan(1 / proj[5] / vh * container.clientHeight) * 180 / Math.PI; // vertical fov
            const fov = 2 * Math.atan(1 / proj[5] * fovAdjust) * 180 / Math.PI; // vertical fov
            const near = proj[14] / (proj[10] - 1.0);
            const far = proj[14] / (proj[10] + 1.0);
            const ratio = proj[5] / proj[0]; // (r-1) / (t -b)

            camera.fov = fov;
            camera.near = near;
            camera.far = far;
            camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
            camera.updateProjectionMatrix();

            webcamRef.current.video.style.top = (-(vh - height) / 2) + "px";
            webcamRef.current.video.style.left = (-(vw - width) / 2) + "px";
            webcamRef.current.video.style.width = vw + "px";
            webcamRef.current.video.style.height = vh + "px";
        }, [controllerRef, containerRef, webcamRef, camera])

        useEffect(() => {
            setImageTargetExists(Boolean(imageTargetURL));
        }, [imageTargetURL, setImageTargetExists]);

        const handleStream = useCallback(() => {
            if (webcamRef.current) {
                webcamRef.current.video.addEventListener("loadedmetadata", () =>
                    setReady(true)
                );
            }
        }, [webcamRef]);

        const startTracking = useCallback(async () => {
            if (ready) {
                let controller;
                if (imageTargetURL) {
                    controller = new ImageTargetController({
                        inputWidth: webcamRef.current.video.videoWidth,
                        inputHeight: webcamRef.current.video.videoHeight,
                        filterMinCF: filterMinCF,
                        filterBeta: filterBeta,
                        warmupTolerance: warmupTolerance,
                        missTolerance: missTolerance,
                        maxTrack: maxTrack,
                        onUpdate: ({ type, targetIndex, worldMatrix }) => {
                            if (type === "updateMatrix") {
                                setAnchors((anchors) => ({
                                    ...anchors,
                                    [targetIndex]:
                                        worldMatrix !== null
                                            ? new Matrix4()
                                                .fromArray([...worldMatrix])
                                                .multiply(postMatrices[targetIndex])
                                                .toArray()
                                            : invisibleMatrix.toArray(),
                                }));
                            }
                        }
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

                    // const ARprojectionMatrix = controller.getProjectionMatrix();
                    // camera.fov =
                    //     (2 * Math.atan(1 / ARprojectionMatrix[5]) * 180) / Math.PI;
                    // camera.near = ARprojectionMatrix[14] / (ARprojectionMatrix[10] - 1.0);
                    // camera.far = ARprojectionMatrix[14] / (ARprojectionMatrix[10] + 1.0);
                    // camera.updateProjectionMatrix();
                }

                await controller.dummyRun(webcamRef.current.video);
                controller.processVideo(webcamRef.current.video);
                controllerRef.current = controller;
                resize();
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

        // Resizes the webcam
        const feedStyle = useMemo(
            () => ({
                width: "auto",
                maxWidth: "none",
                height: "inherit",
                marginLeft: `${webcamRef.current?.video?.clientWidth > 0 && ready
                    ? parseInt((width - webcamRef.current.video.clientWidth) / 2)
                    : 0
                    }px`,
            }),
            [width, ready, webcamRef]
        );

        return (
            <>
                <Html
                    fullscreen
                    ref={containerRef}
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
                            onError && onError(e);
                        }}
                        height={height}
                        width={width}
                        // style={feedStyle}
                        videoConstraints={{
                            facingMode: isWebcamFacingUser ? "user" : "environment",
                        }}
                        mirrored={isWebcamFacingUser && flipUserCamera}
                    />
                </Html >
                {children}
            </>
        );
    }
);

const ARCanvas = forwardRef(
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
        const canvasRef = useRef(null);
        const ARRef = useRef(null);
        useImperativeHandle(ref, () => ({
            startTracking: () => ARRef?.current?.startTracking(),
            stopTracking: () => ARRef?.current?.stopTracking(),
            switchCamera: () => ARRef?.current?.switchCamera(),
            current: canvasRef.current,
        }));

        return (
            <Canvas
                style={{ position: "absolute", width: "100vw", height: "100vh" }}
                {...rest}
                ref={canvasRef}
            >
                <Suspense fallback={null}>
                    <ARProvider
                        {...{
                            autoplay,
                            imageTargetURL,
                            maxTrack,
                            filterMinCF,
                            filterBeta,
                            warmupTolerance,
                            missTolerance,
                            flipUserCamera,
                            onReady,
                            onError,
                        }}
                        ref={ARRef}
                    >
                        {children}
                    </ARProvider>
                </Suspense>
            </Canvas>
        );
    }
);

const ARAnchor = ({
    children,
    target = 0,
    onAnchorFound,
    onAnchorLost,
    ...rest
}) => {
    const ref = useRef();
    const anchors = useAtomValue(anchorsAtom);
    const imageTargetExists = useAtomValue(imageTargetExistsAtom);
    const flipUserCamera = useAtomValue(flipUserCameraAtom);

    useEffect(() => {
        if (ref.current) {
            if (imageTargetExists) {
                if (anchors[target]) {
                    console.log("wtf")
                    if (ref.current.visible !== true && onAnchorFound) onAnchorFound();
                    ref.current.visible = true;
                    ref.current.matrix = new Matrix4().fromArray(anchors[target]);
                    // ref.current.matrix = anchors[target];
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


function ARParent() {
    return (
        <ARCanvas
            imageTargetURL="/car.mind"
            filterMinCF={1}
            filterBeta={10000}
            missTolerance={0}
            warmupTolerance={0}
        >
            <ambientLight />
            <pointLight position={[10, 10, 10]} />
            <ARAnchor target={0} onAnchorFound={() => console.log("anchor found!")} onAnchorLost={() => console.log("anchor lost!")}>
                <mesh>
                    <boxGeometry args={[1, 1, 0.1]} />
                    <meshStandardMaterial color="orange" />
                </mesh>
            </ARAnchor>
            <mesh>
                <boxGeometry args={[1, 1, 0.1]} />
                <meshStandardMaterial color="orange" />
            </mesh>
        </ARCanvas>
    )
}

export default ARParent;