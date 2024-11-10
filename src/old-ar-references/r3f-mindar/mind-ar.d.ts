declare module "mind-ar/src/face-target/face-geometry/face-data" {
  const positions: number[][];
  const uvs: number[][];
  const faces: number[];
  const landmarkBasis: number[][];
  export { positions, uvs, faces, landmarkBasis };
}

declare module "mind-ar/src/face-target/controller" {
  import { OneEuroFilter } from "mind-ar/src/libs/one-euro-filter.js";
  import { Estimator } from "mind-ar/src/face-target/face-geometry/estimator.js";
  import { FaceMeshHelper } from "mind-ar/src/face-target/face-mesh-helper.js";

  interface FaceGeometry {
    updatePositions(positions: number[][]): void;
  }

  interface EstimateResult {
    metricLandmarks: number[][];
    faceMatrix: number[];
    faceScale: number;
    blendshapes: any;
  }

  interface OnUpdateCallback {
    (data: { hasFace: boolean; estimateResult?: EstimateResult }): void;
  }

  interface CameraParams {
    fov: number;
    aspect: number;
    near: number;
    far: number;
  }

  interface ControllerOptions {
    onUpdate?: OnUpdateCallback | null;
    filterMinCF?: number | null;
    filterBeta?: number | null;
  }

  class Controller {
    private customFaceGeometries: FaceGeometry[];
    private estimator: Estimator | null;
    private lastEstimateResult: EstimateResult | null;
    private filterMinCF: number;
    private filterBeta: number;
    public onUpdate: OnUpdateCallback | null;
    private flipFace: boolean;
    private landmarkFilters: OneEuroFilter[];
    private faceMatrixFilter: OneEuroFilter;
    private faceScaleFilter: OneEuroFilter;
    public processingVideo: boolean;
    private faceMeshHelper: FaceMeshHelper;

    constructor(options: ControllerOptions);

    setup(flipFace: boolean): Promise<void>;
    onInputResized(input: any): void;
    getCameraParams(): CameraParams;
    dummyRun(input: any): Promise<void>;
    processVideo(input: HTMLVideoElement | HTMLImageElement): void;
    stopProcessVideo(): void;
    createThreeFaceGeometry(THREE: any): FaceGeometry;
    getLandmarkMatrix(landmarkIndex: number): number[];
  }

  export { Controller };
}

declare module "mind-ar/src/image-target/controller" {
  interface ControllerOptions {
    inputWidth: number;
    inputHeight: number;
    onUpdate?: ((data: any) => void) | null;
    debugMode?: boolean;
    maxTrack?: number;
    warmupTolerance?: number | null;
    missTolerance?: number | null;
    filterMinCF?: number | null;
    filterBeta?: number | null;
  }

  interface ProcessVideoInput {
    width: number;
    height: number;
  }

  interface TrackingState {
    showing: boolean;
    isTracking: boolean;
    currentModelViewTransform: any | null;
    trackCount: number;
    trackMiss: number;
    filter: any;
  }

  class Controller {
    inputWidth: number;
    inputHeight: number;
    maxTrack: number;
    filterMinCF: number;
    filterBeta: number;
    warmupTolerance: number;
    missTolerance: number;
    cropDetector: CropDetector;
    inputLoader: InputLoader;
    markerDimensions: Array<[number, number]> | null;
    onUpdate: ((data: any) => void) | null;
    debugMode: boolean;
    public processingVideo: boolean;
    interestedTargetIndex: number;
    trackingStates: TrackingState[];
    projectionTransform: number[][];
    projectionMatrix: number[];
    worker: Worker;
    workerMatchDone: ((data: any) => void) | null;
    workerTrackDone: ((data: any) => void) | null;
    tracker: Tracker | null;

    constructor(options: ControllerOptions);

    showTFStats(): void;

    addImageTargets(fileURL: string): Promise<{
      dimensions: Array<[number, number]>;
      matchingDataList: any[];
      trackingDataList: any[];
    }>;

    addImageTargetsFromBuffer(buffer: ArrayBuffer): {
      dimensions: Array<[number, number]>;
      matchingDataList: any[];
      trackingDataList: any[];
    };

    dispose(): void;

    dummyRun(input: ProcessVideoInput): void;

    getProjectionMatrix(): number[];

    getRotatedZ90Matrix(m: number[]): number[];

    getWorldMatrix(modelViewTransform: any, targetIndex: number): any;

    processVideo(input: ProcessVideoInput): void;

    stopProcessVideo(): void;

    detect(input: ProcessVideoInput): Promise<{
      featurePoints: any[];
      debugExtra: any;
    }>;

    match(
      featurePoints: any[],
      targetIndex: number
    ): Promise<{
      modelViewTransform: any;
      debugExtra: any;
    }>;

    track(
      input: ProcessVideoInput,
      modelViewTransform: any,
      targetIndex: number
    ): Promise<any>;

    trackUpdate(modelViewTransform: any, trackFeatures: any): Promise<any>;

    private _workerMatch(
      featurePoints: any[],
      targetIndexes: number[]
    ): Promise<any>;

    private _workerTrackUpdate(
      modelViewTransform: any,
      trackingFeatures: any
    ): Promise<any>;

    private _glModelViewMatrix(
      modelViewTransform: any,
      targetIndex: number
    ): number[];

    private _glProjectionMatrix(params: {
      projectionTransform: number[][];
      width: number;
      height: number;
      near: number;
      far: number;
    }): number[];
  }

  export { Controller };
}
