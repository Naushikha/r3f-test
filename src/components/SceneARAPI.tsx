import { useEffect, useState } from "react";
import { ARCanvas, ARTarget } from "core/AR";
import { API, InitAPI } from "./core/LegacyAPI";
import { UserData } from "./core/types/app";
import SceneGraph from "./core/SceneGraph";
// import GreenScreenPlane from "./core/content/GreenScreenPlane";
// import YouTube from "./core/content/YouTube";

function useAPI() {
  const [userData, setUserData] = useState<UserData>(null!); // Store the API response userData
  const [loading, setLoading] = useState<boolean>(true); // Loading state
  const [error, setError] = useState<string | null>(null); // Error state

  useEffect(() => {
    const fetchData = async () => {
      try {
        await InitAPI();
        const result = API.userData;
        if (result) setUserData(result);
      } catch (error) {
        setError("Failed to load userData");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return { userData, loading, error };
}

function ARExperience() {
  const { userData, loading, error } = useAPI();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    userData && (
      <ARCanvas
        imageTargetURL={userData.targetDB}
        filterMinCF={0.001}
        filterBeta={0.001}
      >
        {Object.entries(userData.appSceneGraphs).length === 0 ? (
          <p>ERROR: No scenes available.</p>
        ) : (
          Object.entries(userData.appSceneGraphs).map(
            ([index, appSceneGraph]) => (
              <ARTarget
                key={index}
                index={Number(index)}
                onTargetFound={() => {
                  console.log(`Found image target [${index}]!`);
                }}
                onTargetLost={() => {
                  console.log(`Lost image target [${index}]!`);
                }}
              >
                <SceneGraph data={appSceneGraph} />
              </ARTarget>
            )
          )
        )}
      </ARCanvas>
    )
  );
}

export default ARExperience;

// TODO: convert to typescript
// TODO: add green screen shader and marki stock video
