// Ported legacy API from JS to TS
// TODO: Do a better implementation for the service

import { Content } from "./types/content";
import { Experience } from "./types/experience";
import { LunarScene } from "./types/scene";
import { AppContent, AppSceneGraphObject, UserData } from "./types/app";

const DEVMODE = import.meta.env.VITE_DEV_MODE;

const APISample = {
  id: 1,
  name: "Demo XP",
  url: "any-url",
  fileName: "/car.mind", // map to the car
  scenes: [
    {
      id: 1,
      name: "Demo Scene",
      graph: [
        {
          type: "content",
          config: {
            id: 1,
            transform: "0 0 0 0 -1.570 0 1 1 1",
            // transform: "0 0 0 -1.570 0 0 1.777 1 1",
            // transform: "0 0 0 -1.570 0 0 1.77 1.77 1",
          },
        },
      ],
      target: {
        id: 1,
        name: "Orange Car",
        fileName: "/car.jpg",
      },
      contents: [
        {
          id: 1,
          name: "Orange Car",
          fileName: "/car.glb",
        },
        // {
        //   id: 1,
        //   name: "Big Buck",
        //   fileName: "./assets/bigbuck.mp4",
        // },
        // {
        //   id: 1,
        //   name: "Limp Bizkit",
        //   fileName: "ZpUYjpKg9KY/560/315/.yt",
        // },
      ],
    } as LunarScene,
  ],
};

class API {
  url = DEVMODE
    ? `https://${window.location.hostname}:3000`
    : "https://api.lunarxr.com";
  userData?: UserData;
  constructor() {}
  async init() {
    try {
      let experienceSlug = window.location.hash.slice(1);
      if (experienceSlug) {
        if (DEVMODE)
          console.log("[API-Handler] Experience slug: " + experienceSlug);
        let apiResponse: Experience = await this.getDatafromAPI(
          "token",
          experienceSlug
        );
        if (DEVMODE) {
          console.log(
            "[API-Handler] Server response: " +
              JSON.stringify(apiResponse, null, 2)
          );
        }
        this.userData = {
          name: apiResponse.name,
          targetDB: `${this.url}/uploads/${apiResponse.fileName}`,
          // scenes: apiResponse.scenes,
          appSceneGraphs: this.processSceneGraphs(apiResponse.scenes),
        };
      } else {
        console.log(
          "[API-Handler] No data was found in URI fragment, proceeding using API sample data."
        );
        this.url = "demo"; // hack to fallback into demo mode
        this.userData = {
          name: APISample.name,
          targetDB: APISample.fileName,
          // scenes: APISample.scenes,
          appSceneGraphs: this.processSceneGraphs(APISample.scenes),
        };
      }
    } catch (e) {
      console.log(e);
      console.log(
        "[API-Handler] Error in parsing URI fragment data!, falling back to API sample data."
      );
      this.url = "demo"; // hack to fallback into demo mode
      this.userData = {
        name: APISample.name,
        targetDB: APISample.fileName,
        // scenes: APISample.scenes,
        appSceneGraphs: this.processSceneGraphs(APISample.scenes),
      };
    }
    if (DEVMODE) console.log(this.userData);
  }
  getIndexedContents(contents: Content[]) {
    let indexedContents: Record<number, AppContent> = {};
    for (let content of contents) {
      indexedContents[content.id] = {
        contentName: content.name,
        URL: this.determineContentURL(content.fileName),
        type: this.determineContentType(content.fileName),
      };
    }
    return indexedContents;
  }
  // TODO: change the name 'URL' as now it refers to where the content is located/meta info etc
  determineContentURL(fileName: string) {
    if (this.determineContentType(fileName) == "youtube") return `${fileName}`; // "1jCwBC1TKIM/560/315/.yt"
    if (this.url == "demo") return fileName; // demo mode
    else return `${this.url}/uploads/${fileName}`;
  }
  // TODO: remove this stuff man
  processSceneGraphs(scenes: LunarScene[]) {
    let appSceneGraphMap: Record<number, AppSceneGraphObject[]> = {};
    scenes.map((scene, index) => {
      let indexedContents = this.getIndexedContents(scene.contents);
      let appSceneGraphs: AppSceneGraphObject[] = [];
      for (let sceneGraphObject of scene.graph) {
        let appSceneGraph: AppSceneGraphObject = {
          type: sceneGraphObject.type,
          config: sceneGraphObject.config,
          URL: indexedContents[sceneGraphObject.config.id].URL,
        };
        appSceneGraphs.push(appSceneGraph);
      }
      appSceneGraphMap[index] = appSceneGraphs;
    });
    return appSceneGraphMap;
  }
  determineContentType(fileName: string) {
    var fileExtension = fileName.split(".").pop()?.toLowerCase() || "";
    switch (fileExtension) {
      case "mp4":
        return "video";
      case "glb":
        return "model";
      case "yt":
        return "youtube";
      default:
        return "unknown";
    }
  }
  async getDatafromAPI(token: string, experienceSlug: string) {
    let request = `${this.url}/experiences/url/${experienceSlug}`;
    try {
      const response = await fetch(request, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        // body: JSON.stringify(body),
      });

      if (!response.ok) {
        console.log(response);
        throw new Error("API response was not ok");
      }
      const data = await response.json();
      return data;
    } catch (error) {
      throw new Error(String(error));
    }
  }
}

var APIInstance: API;

const InitAPI = async () => {
  APIInstance = new API();
  await APIInstance.init();
};

export { InitAPI, APIInstance as API };
