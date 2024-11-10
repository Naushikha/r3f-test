// const imageTargetExistsAtom = atom(false);
// const anchorsAtom = atom({});
// const flipUserCameraAtom = atom(true);
// const invisibleMatrix = new Matrix4().set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1);

// function ARAnchor({
//     children,
//     target = 0,
//     onAnchorFound,
//     onAnchorLost,
// }) {
//     const { controller } = useAR();
//     const ref = useRef();
//     const anchors = useAtomValue(anchorsAtom)
//     const flipUserCamera = useAtomValue(flipUserCameraAtom);

//     useEffect(() => {
//         if (ref.current) {
//             // TODO: Use imageTargetExists atom
//             if (controller.inputWidth === 0) {
//                 return;
//             }
//             if (anchors[target]) { // L#159
//                 if (ref.current.visible !== true && onAnchorFound) onAnchorFound();
//                 ref.current.visible = true;
//                 ref.current.matrix = new Matrix4().fromArray(anchors[target]);
//             } else {
//                 if (ref.current.visible !== false && onAnchorLost) onAnchorLost();
//                 ref.current.visible = false;
//             }
//         }

//     }, [anchors, target, onAnchorFound, onAnchorLost, controller])

//     return (
//         <group scale={[flipUserCamera ? -1 : 1, 1, 1]}>
//             <group ref={ref} visible={false} matrixAutoUpdate={false}>
//                 {children}
//             </group>
//         </group>
//     )

// }

// export { ARAnchor }