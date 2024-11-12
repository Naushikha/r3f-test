/**
 * THREE.JS ShaderMaterial that removes a specified color (e.g. greens screen)
 * from a texture. Shader code by https://github.com/Mugen87 on THREE.js forum:
 * https://discourse.threejs.org/t/production-ready-green-screen-with-three-js/23113/2
 */
import * as THREE from "three";
import * as constants from "./ChromaKeyConstants";

// eslint-disable-next-line new-cap
class ChromaKeyMaterial extends THREE.ShaderMaterial {
  videoElem: HTMLVideoElement;
  texture: THREE.VideoTexture;

  constructor(
    videoElem: HTMLVideoElement,
    keyColor: number,
    width: number,
    height: number,
    similarity = 0.01,
    smoothness = 0.18,
    spill = 0.1
  ) {
    super();

    this.videoElem = videoElem;
    this.texture = new THREE.VideoTexture(this.videoElem);
    const chromaKeyColor = new THREE.Color(keyColor);

    this.setValues({
      uniforms: {
        tex: {
          value: this.texture,
        },
        keyColor: { value: chromaKeyColor },
        texWidth: { value: width },
        texHeight: { value: height },
        similarity: { value: similarity },
        smoothness: { value: smoothness },
        spill: { value: spill },
      },
      vertexShader: constants.VERTEX_SHADER,
      fragmentShader: constants.FRAGMENT_SHADER,
      transparent: true,
    });
  }
}

export { ChromaKeyMaterial as default };
