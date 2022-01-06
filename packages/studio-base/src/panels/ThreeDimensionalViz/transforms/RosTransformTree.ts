// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Duration, Time } from "@foxglove/rostime";
import { MutablePose, Pose, TF } from "@foxglove/studio-base/types/Messages";

import { CoordinateFrame } from "./CoordinateFrame";
import { Transform } from "./Transform";
import { TransformTree } from "./TransformTree";
import { quatFromValues, vec3FromValues } from "./geometry";

/**
 * RosTransformTree is a wrapper for TransformTree that normalizes transform
 * names according to the ROS convention of always prefixing "/" to transforms.
 */
export class RosTransformTree {
  private _tree = new TransformTree();

  addTransform(frameId: string, parentFrameId: string, time: Time, transform: Transform): void {
    this._tree.addTransform(rosFrameId(frameId), rosFrameId(parentFrameId), time, transform);
  }

  addTransformMessage(tf: TF): void {
    const t = tf.transform.translation;
    const q = tf.transform.rotation;
    const transform = new Transform(
      vec3FromValues(t.x, t.y, t.z),
      quatFromValues(q.x, q.y, q.z, q.w),
    );
    this.addTransform(tf.child_frame_id, tf.header.frame_id, tf.header.stamp, transform);
  }

  hasFrame(id: string): boolean {
    return this._tree.hasFrame(rosFrameId(id));
  }

  frame(id: string): CoordinateFrame | undefined {
    return this._tree.frame(rosFrameId(id));
  }

  getOrCreateFrame(id: string): CoordinateFrame {
    return this._tree.getOrCreateFrame(rosFrameId(id));
  }

  frames(): ReadonlyMap<string, CoordinateFrame> {
    return this._tree.frames();
  }

  apply(
    output: MutablePose,
    input: Pose,
    frameId: string,
    rootFrameId: string | undefined,
    srcFrameId: string,
    dstTime: Time,
    srcTime: Time,
    maxDelta?: Duration,
  ): MutablePose | undefined {
    return this._tree.apply(
      output,
      input,
      rosFrameId(frameId),
      rootFrameId != undefined ? rosFrameId(rootFrameId) : undefined,
      rosFrameId(srcFrameId),
      dstTime,
      srcTime,
      maxDelta,
    );
  }

  static Clone(tree: RosTransformTree): RosTransformTree {
    const newTree = new RosTransformTree();
    // eslint-disable-next-line no-underscore-dangle
    newTree._tree = tree._tree;
    return newTree;
  }
}

function rosFrameId(frameId: string): string {
  return frameId[0] === "/" ? frameId : "/" + frameId;
}
