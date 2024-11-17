import { SceneGraphObject } from "./scene";

export interface UserData {
  name: string;
  targetDB: string;
  // scenes: LunarScene[];
  appSceneGraphs: Record<number, AppSceneGraphObject[]>;
}

export interface AppContent {
  contentName: string;
  URL: string;
  type: string;
}

export interface AppSceneGraphObject extends SceneGraphObject {
  URL: string;
}
