// src/components/core/AR.d.ts

declare module "core/AR" {
  import { FunctionComponent } from "react";

  export const ARCanvas: FunctionComponent<{
    children?: React.ReactNode;
    imageTargetURL?: string;
    filterMinCF?: number;
    filterBeta?: number;
  }>;

  export const ARTarget: FunctionComponent<{
    children?: React.ReactNode;
    index?: number;
    onTargetFound?: () => void;
    onTargetLost?: () => void;
  }>;
}
