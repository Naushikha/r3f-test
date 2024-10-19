import "./App.css";
import Scene3D from "./components/Scene3D";
import SceneVR from "./components/SceneVR";
import SceneRollerCoaster from "./components/SceneRollerCoaster";
import SceneVR360 from "./components/SceneVR360";

function App() {
  return (
    <div id="canvas">
      {/* <Scene3D /> */}
      {/* <SceneVR /> */}
      {/* <SceneRollerCoaster /> */}
      <SceneVR360 />
    </div>
  );
}

export default App;
