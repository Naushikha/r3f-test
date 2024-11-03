import "./App.css";
// import Scene3D from "./components/Scene3D";
// import SceneVR from "./components/SceneVR";
// import SceneRollerCoaster from "./components/SceneRollerCoaster";
// import SceneVR360 from "./components/SceneVR360";
// import MyAR from "./r3f-mindar/MyAR";
import AR from "./r3f-mindar-js/WorkingAR.jsx";
// import AR from "./r3f-mindar-js/Proper.jsx";

function App() {
  return (
    <div id="canvas">
      {/* <Scene3D /> */}
      {/* <SceneVR /> */}
      {/* <SceneRollerCoaster /> */}
      {/* <SceneVR360 /> */}
      {/* <MyAR /> */}
      <AR />
    </div>
  );
}

export default App;
