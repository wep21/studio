// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2018-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.
import type REGL from "regl";

type DoneCallback = (err: Error | undefined, texture?: REGL.Texture2D) => void;

class TextureCacheEntry {
  promise: Promise<REGL.Texture2D>;
  texture: REGL.Texture2D;

  constructor(regl: REGL.Regl, promise: Promise<REGL.Texture2D>) {
    this.promise = promise;
    this.texture = createNotFoundTexture(regl);
  }
}

export class TextureCache {
  private inlineTextures = new Map<Uint8Array, TextureCacheEntry>();
  private urlTextures = new Map<string, TextureCacheEntry>();
  private regl: REGL.Regl;

  constructor(regl: REGL.Regl) {
    this.regl = regl;
  }

  loadCompressed(data: Uint8Array, done: DoneCallback): REGL.Texture2D {
    const existingEntry = this.inlineTextures.get(data);
    if (existingEntry) {
      return existingEntry.texture;
    }
    const promise = loadTextureFromCompressed(this.regl, data);
    const newEntry = new TextureCacheEntry(this.regl, promise);
    promise
      .then((texture) => {
        newEntry.texture = texture;
        done(undefined, texture);
      })
      .catch(async (err) => done(err as Error));
    this.inlineTextures.set(data, newEntry);
    return newEntry.texture;
  }

  loadUrl(url: string, done: DoneCallback): REGL.Texture2D {
    const existingEntry = this.urlTextures.get(url);
    if (existingEntry) {
      return existingEntry.texture;
    }
    const promise = loadTextureFromUrl(this.regl, url);
    const newEntry = new TextureCacheEntry(this.regl, promise);
    promise
      .then((texture) => {
        newEntry.texture = texture;
        done(undefined, texture);
      })
      .catch(async (err) => done(err as Error));
    this.urlTextures.set(url, newEntry);
    return newEntry.texture;
  }
}

async function loadTextureFromUrl(regl: REGL.Regl, url: string): Promise<REGL.Texture2D> {
  return await new Promise<REGL.Texture2D>((resolve, reject) => {
    const image = new Image();
    image.src = url;
    image.onload = async () => {
      const bitmap = await createImageBitmap(image);
      resolve(regl.texture(bitmap));
    };
    image.onerror = (ev) => {
      reject(new Error(`Failed to load image from <${url}>: ${ev}`));
    };
  });
}

async function loadTextureFromCompressed(
  regl: REGL.Regl,
  data: Uint8Array,
): Promise<REGL.Texture2D> {
  return await new Promise<REGL.Texture2D>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(new Blob([data]));
    image.src = url;
    image.onload = async () => {
      const bitmap = await createImageBitmap(image);
      URL.revokeObjectURL(url);
      resolve(regl.texture(bitmap));
    };
    image.onerror = (ev) => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image from ${data.length} byte buffer: ${ev}`));
    };
  });
}

function createNotFoundTexture(regl: REGL.Regl): REGL.Texture2D {
  // Create a solid magenta 8x8 RGB texture
  const data = new Uint8Array(8 * 8 * 3);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const i = (y * 8 + x) * 3;
      data[i + 0] = 255;
      data[i + 1] = 0;
      data[i + 2] = 255;
    }
  }
  return regl.texture({ width: 8, height: 8, data, format: "rgb" });
}
