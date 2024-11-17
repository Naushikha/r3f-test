import { LunarScene } from "./scene";

export interface Experience {
  id: number;
  name: string;
  url: string;
  fileName: string;
  scenes: LunarScene[];
  createdAt: Date;
  updatedAt: Date;
}
