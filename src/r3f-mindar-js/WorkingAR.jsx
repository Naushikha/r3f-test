import { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Matrix4, Quaternion, Vector3 } from "three";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import Webcam from "react-webcam";
import { Controller as ImageTargetController } from "mind-ar/dist/mindar-image.prod.js";
import { atom, useAtomValue, useSetAtom } from "jotai";
import { GLTFLoader } from "three/examples/jsm/Addons.js";
import { Environment } from "@react-three/drei";

const ARContext = createContext();
const anchorsAtom = atom({});
const webcamReadyAtom = atom(false);
const invisibleMatrix = new Matrix4().set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1);

const AR = memo(function AR({
    children,
    imageTargets,
    filterMinCF = null,
    filterBeta = null,
    warmupTolerance = null,
    missTolerance = null,
    maxTrack,
    webcamRef,
    containerRef,
}) {

    const { camera } = useThree();
    // const [ready, setReady] = useState(false);
    const setAnchors = useSetAtom(anchorsAtom);
    const webcamReady = useAtomValue(webcamReadyAtom);


    const arContext = useMemo(() => {
        const controller = new ImageTargetController({
            inputWidth: webcamRef.current.video.videoWidth,
            inputHeight: webcamRef.current.video.videoHeight,
            filterMinCF,
            filterBeta,
            warmupTolerance,
            missTolerance,
            maxTrack,
        });
        return { controller };
    }, [filterMinCF, filterBeta, warmupTolerance, missTolerance, maxTrack, webcamRef.current.video.videoWidth, webcamRef.current.video.videoHeight]);

    const resize = useCallback(() => {
        const { controller } = arContext;

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
        const proj = controller.getProjectionMatrix();

        // TODO: move this logic to controller
        // Handle when phone is rotated, video width and height are swapped
        const inputRatio = controller.inputWidth / controller.inputHeight;
        let inputAdjust;
        if (inputRatio > containerRatio) {
            inputAdjust = webcamRef.current.video.width / controller.inputWidth;
        } else {
            inputAdjust = webcamRef.current.video.height / controller.inputHeight;
        }
        let videoDisplayHeight;
        let videoDisplayWidth;
        if (inputRatio > containerRatio) {
            videoDisplayHeight = containerRef.current.clientHeight;
            videoDisplayHeight *= inputAdjust;
        } else {
            videoDisplayWidth = containerRef.current.clientWidth;
            videoDisplayHeight = videoDisplayWidth / controller.inputWidth * controller.inputHeight;
            videoDisplayHeight *= inputAdjust;
        }
        let fovAdjust = containerRef.current.clientHeight / videoDisplayHeight;

        // const fov = 2 * Math.atan(1 / proj[5] / vh * containerRef.clientHeight) * 180 / Math.PI; // vertical fov
        const fov = 2 * Math.atan(1 / proj[5] * fovAdjust) * 180 / Math.PI; // vertical fov
        const near = proj[14] / (proj[10] - 1.0);
        const far = proj[14] / (proj[10] + 1.0);
        const ratio = proj[5] / proj[0]; // (r-1) / (t -b)

        camera.fov = fov;
        camera.near = near;
        camera.far = far;
        camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
        camera.updateProjectionMatrix();

        webcamRef.current.video.style.top = (-(vh - containerRef.current.clientHeight) / 2) + "px";
        webcamRef.current.video.style.left = (-(vw - containerRef.current.clientWidth) / 2) + "px";
        webcamRef.current.video.style.width = vw + "px";
        webcamRef.current.video.style.height = vh + "px";
    }, [arContext, camera])

    // const onUmount = useCallback(() => {
    //     window.removeEventListener("resize", resize);
    // }, [resize]);

    const startAR = useCallback(async () => {
        console.log('👾 Start AR');

        const { controller } = arContext;

        //////////////////////////////////////////////////////////////////////////////////////////
        webcamRef.current.video.setAttribute('width', webcamRef.current.video.videoWidth);
        webcamRef.current.video.setAttribute('height', webcamRef.current.video.videoHeight);
        controller.inputWidth = webcamRef.current.video.videoWidth;
        controller.inputHeight = webcamRef.current.video.videoHeight;
        //////////////////////////////////////////////////////////////////////////////////////////

        controller.onUpdate = (data) => {
            if (data.type === 'updateMatrix') {
                // console.log("detected")
                const { targetIndex, worldMatrix } = data;

                setAnchors((anchors) => ({
                    ...anchors, [targetIndex]: worldMatrix !== null ?
                        new Matrix4().fromArray([...worldMatrix]).multiply(postMatrixs[targetIndex]).toArray() :
                        invisibleMatrix.toArray()
                }));
            }
        }

        resize();

        const { dimensions: imageTargetDimensions } = await controller.addImageTargets(imageTargets);

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
    }, [arContext, imageTargets, resize]);

    const stopTracking = useCallback(() => {
        const { controller } = arContext;
        controller.stopProcessVideo();
    }, [arContext]);

    useEffect(() => {
        // const loadedMetadataHandler = () => {
        //     console.log('📹 Ready');
        //     webcamRef.current.video.setAttribute('width', webcamRef.current.video.videoWidth);
        //     webcamRef.current.video.setAttribute('height', webcamRef.current.video.videoHeight);
        //     // const { controller } = arContext;
        //     // controller.inputWidth = webcamRef.current.video.videoWidth;
        //     // controller.inputHeight = webcamRef.current.video.videoHeight;
        //     setReady(true);
        //     console.log("???")
        // };

        const resizeHandler = () => {
            console.log('📐 Resize')
            resize();
        };


        // webcamRef.current.video.addEventListener('loadedmetadata', loadedMetadataHandler);
        window.addEventListener("resize", resizeHandler);

        return () => {
            // webcamRef.current.video.removeEventListener('loadedmetadata', loadedMetadataHandler);
            window.removeEventListener("resize", resizeHandler);
            stopTracking();
        };
    }, [startAR]);


    useEffect(() => {
        if (webcamReady) {
            startAR();
        }
    }, [webcamReady, startAR])

    const value = useMemo(() => ({ controller: arContext.controller }), [arContext])

    return <ARContext.Provider value={value}>{children}</ARContext.Provider>
});

// const useAR = () => {
//     const arValue = useContext(ARContext)
//     return useMemo(() => ({ ...arValue }), [arValue])
// }

function ARAnchor({
    children,
    target = 0,
}) {
    // const { controller } = useAR(); // Can we omit this?
    const ref = useRef();
    const anchors = useAtomValue(anchorsAtom)

    useEffect(() => {
        if (ref.current) {
            // if (controller.inputWidth === 0) {
            //     return;
            // }
            if (anchors[target]) { // L#159
                //if (ref.current.visible !== true && onAnchorFound) onAnchorFound();
                ref.current.visible = true;
                ref.current.matrix = new Matrix4().fromArray(anchors[target]);
            } else {
                //if (ref.current.visible !== false && onAnchorLost) onAnchorLost();
                ref.current.visible = false;
            }
        }

    }, [
        // controller, 
        anchors, target])

    return (
        <group ref={ref} visible={false} matrixAutoUpdate={false}>
            {children}
        </group>
    )

}


function ARCanvas({
    children,
    imageTargets,
    filterMinCF,
    filterBeta
}) {
    const webcamRef = useRef();
    const canvasContainerRef = useRef();
    const setWebcamReady = useSetAtom(webcamReadyAtom);

    const handleWebcam = useCallback(() => {
        if (webcamRef.current) {
            webcamRef.current.video.addEventListener("loadedmetadata", () => {
                setWebcamReady(true)
                console.log("Webcam is ready")
            }
            );
        }
    }, [webcamRef]);

    return (
        <div id="ar-canvas-container" ref={canvasContainerRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
            <Canvas
            >
                {/* <Environment files="/metro_vijzelgracht_1k.hdr" /> */}
                <AR imageTargets={imageTargets} webcamRef={webcamRef} containerRef={canvasContainerRef} filterMinCF={filterMinCF} filterBeta={filterBeta}>
                    {children}
                </AR>
            </Canvas>
            <Webcam
                ref={webcamRef}
                onUserMedia={handleWebcam}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    zIndex: -2,
                }}
            />
        </div>
    )
}

// for testing
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

function ARParent() {
    return (
        <ARCanvas
            imageTargets="/car.mind"
            filterMinCF={0.001}
            filterBeta={0.001}
        >
            <ambientLight />
            <pointLight position={[10, 10, 10]} />
            <ARAnchor target={0}>
                {/* <Car3D /> */}
                <mesh>
                    <boxGeometry args={[1, 1, 0.1]} />
                    <meshStandardMaterial color="orange" />
                </mesh>
            </ARAnchor>
        </ARCanvas>
    )
}

export default ARParent;

// TODO: fix events; on anchor found/lost, ui loading/scanning etc.
// TODO: remove useAR 