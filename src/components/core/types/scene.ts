import { Content } from "./content";
import { Target } from "./target";

export interface SceneGraphConfigBase {
  id: number;
  transform: string;
}

export interface SceneGraphConfigContent extends SceneGraphConfigBase {
  id: number;
}

export interface SceneGraphConfigLabel extends SceneGraphConfigBase {
  text: string;
}

export interface SceneGraphConfigButton extends SceneGraphConfigBase {
  action: string;
}

export interface SceneGraphConfigIframe extends SceneGraphConfigBase {
  link: string;
  size: string;
}

export interface SceneGraphObject {
  type: "content" | "label" | "button" | "iframe";
  config:
    | SceneGraphConfigContent
    | SceneGraphConfigLabel
    | SceneGraphConfigButton
    | SceneGraphConfigIframe;
}

export interface LunarScene {
  id: number;
  name: string;
  graph: SceneGraphObject[];
  target: Target;
  contents: Content[];
  createdAt?: Date;
  updatedAt?: Date;
}
