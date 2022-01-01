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

import Logger from "@foxglove/log";
import { Command, withPose, defaultBlend, CommonCommandProps } from "@foxglove/regl-worldview";
import { MapTileMessage } from "@foxglove/studio-base/types/Messages";
import sendNotification from "@foxglove/studio-base/util/sendNotification";

import { TextureCache } from "./TextureCache";

const log = Logger.getLogger(__filename);

type Uniforms = {
  width: number;
  height: number;
  resolution: number;
  elevationScale: number;
  data: REGL.Texture2D;
  elevation: REGL.Texture2D;
};
type Attributes = {
  point: REGL.Buffer;
};
type CommandProps = MapTileMessage;

const mapTiles = (regl: REGL.Regl) => {
  const cache = new TextureCache(regl);

  return withPose<Uniforms, Attributes, CommandProps, Record<string, never>, REGL.DefaultContext>({
    primitive: "triangles",

    vert: `
    precision lowp float;

    uniform mat4 projection, view;
    uniform float width, height, resolution, elevationScale;
    uniform sampler2D elevation;

    attribute vec3 point;

    #WITH_POSE

    varying vec2 uv;

    void main () {
      // set the texture uv to the unscaled vertex point
      uv = vec2(point.x, point.y);

      // compute the plane vertex dimensions
      float planeWidth = width * resolution;
      float planeHeight = height * resolution;

      float elevation = texture2D(elevation, uv).r * elevationScale;
      vec3 loc = applyPose(vec3(point.x, point.y, elevation) * vec3(planeWidth, planeHeight, 1.));
      gl_Position = projection * view * vec4(loc, 1);
    }
    `,
    frag: `
    precision lowp float;

    varying vec2 uv;

    uniform sampler2D data;

    void main () {
      gl_FragColor = texture2D(data, uv);
    }
    `,
    blend: defaultBlend,

    depth: { enable: true, mask: true },

    attributes: {
      point: (_context: unknown, props: MapTileMessage) => {
        const vertices = new Float32Array(props.width * props.height * 18);
        // Generate a triangle list for the props.width x props.height grid
        for (let yi = 0; yi < props.height; yi++) {
          for (let xi = 0; xi < props.width; xi++) {
            const i = (yi * props.width + xi) * 18;
            const x1 = xi / props.width;
            const x2 = (xi + 1) / props.width;
            const y1 = yi / props.height;
            const y2 = (yi + 1) / props.height;

            // triangle 1
            vertices[i + 0] = x1;
            vertices[i + 1] = y1;
            vertices[i + 2] = 0;

            vertices[i + 3] = x2;
            vertices[i + 4] = y1;
            vertices[i + 5] = 0;

            vertices[i + 6] = x1;
            vertices[i + 7] = y2;
            vertices[i + 8] = 0;

            // triangle 2
            vertices[i + 9] = x1;
            vertices[i + 10] = y2;
            vertices[i + 11] = 0;

            vertices[i + 12] = x2;
            vertices[i + 13] = y1;
            vertices[i + 14] = 0;

            vertices[i + 15] = x2;
            vertices[i + 16] = y2;
            vertices[i + 17] = 0;
          }
        }

        return regl.buffer(vertices);
      },
    },

    uniforms: {
      width: regl.prop("width"),
      height: regl.prop("height"),
      resolution: regl.prop("resolution"),
      elevationScale: regl.prop("elevation_scale"),
      data: (_context: unknown, props: MapTileMessage) => {
        return cache.loadCompressed(props.albedo.data, (err, texture) => {
          if (err) {
            sendNotification(
              `Failed to load MapTile texture`,
              `Could not decompress texture from ${props.albedo.data.byteLength} bytes of albedo data`,
              "app",
              "warn",
            );
            return;
          }
          log.debug(`Loaded ${texture!.width}x${texture!.height} MapTile albedo`);
        });
      },
      elevation: (_context: unknown, props: MapTileMessage) => {
        return cache.loadCompressed(props.elevation.data, (err, texture) => {
          if (err) {
            sendNotification(
              `Failed to load MapTile elevation`,
              `Could not decompress texture from ${props.elevation.data.byteLength} bytes of elevation data`,
              "app",
              "warn",
            );
            return;
          }
          log.debug(`Loaded ${texture!.width}x${texture!.height} MapTile elevation`);
        });
      },
    },

    count: (_context: unknown, props: MapTileMessage) => {
      return props.width * props.height * 6;
    },
  });
};

type Props = CommonCommandProps & {
  // TypeScript doesn't allow us to pass an array variable if `children` is set to an array type here
  // https://github.com/microsoft/TypeScript/issues/30711#issuecomment-485013588
  children: React.ReactNode;
};

export default function MapTiles(props: Props): JSX.Element {
  // We can click through MapTiles.
  return <Command getChildrenForHitmap={undefined} {...props} reglCommand={mapTiles} />;
}
