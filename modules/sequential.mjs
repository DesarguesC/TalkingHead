
import * as THREE from 'three';



class SequencePlayer {
  constructor(armature, animClips, options = {}) {
    this.armature = armature;
    this.animClips = animClips; // [{ url, clip, pose }, ...]
    this.mixer = new THREE.AnimationMixer(armature); // 建议复用一个 mixer
    this.currentIndex = 0;
    this.isPlaying = false;
    this.tween = options.tween || false;
    this.dur = options.dur || 1000; // ms，供 pose tween 使用（注意单位）
    // 用于外部停止/清理
    this._onFinishedBound = this._onFinished.bind(this);
  }

  start() {
    if (!this.animClips || this.animClips.length === 0) return;
    if (this.isPlaying) return;
    this.isPlaying = true;
    this._playIndex(this.currentIndex);
  }

  stop() {
    this.isPlaying = false;
    // 停掉当前 action
    if (this.currentAction) {
      this.currentAction.stop();
      this.currentAction = null;
    }
    // 移除监听
    this.mixer.removeEventListener('finished', this._onFinishedBound);
  }

  _playIndex(idx) {
    if (!this.isPlaying) return;

    const item = this.animClips[idx];
    if (!item) return;

    // 设置 pose（和你原来代码一样）
    Object.entries(item.pose.props).forEach(([k, v]) => {
      this.poseBase.props[k] = v.clone();
      this.poseTarget.props[k] = v.clone();
      this.poseTarget.props[k].t = this.tween ? 0 : 1;
      this.poseTarget.props[k].d = this.tween ? Math.max(200, Math.min(this.dur, 1000)) : 0;
    });

    // 监听 finished （每次先移除再添加，防止重复）
    this.mixer.removeEventListener('finished', this._onFinishedBound);
    this.mixer.addEventListener('finished', this._onFinishedBound);

    // 创建 action 并播放一次（如果要每 clip 播放一次）
    const action = this.mixer.clipAction(item.clip);
    action.reset();
    action.clampWhenFinished = true;
    action.setLoop(THREE.LoopOnce, 0); // 播放一次
    action.fadeIn(0.2).play();

    this.currentAction = action;
    this.currentIndex = idx;
    this.LastTime = Date.now();
    this.animInterval = item.clip.duration; // 秒，注意你的代码中有单位问题
  }

  _onFinished(event) {
    // Three.js finished 事件可能在多个 action 完成时触发，检查来源 action
    // event.action 是触发完成的 action（不同版本可能是 event.action 或 event）
    const finishedAction = event.action || event; // 兼容写法
    // 可选：验证 finishedAction === this.currentAction

    // 计算下一个 index
    this.currentIndex = (this.currentIndex + 1) % this.animClips.length;

    // 如果仍然在播放状态，播放下一个
    if (this.isPlaying) {
      this._playIndex(this.currentIndex);
    } else {
      // 清理监听
      this.mixer.removeEventListener('finished', this._onFinishedBound);
    }
  }

  // 在你的渲染循环里每帧调用
  update(delta) {
    if (this.mixer) this.mixer.update(delta);
    // 这里也推进你的 pose 补间逻辑（如果有）
  }
}


export { SequencePlayer };