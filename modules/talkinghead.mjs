/**
* MIT License
*
* Copyright (c) 2024 Mika Suominen
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
*/

/**
 * TODO: 控制动作、手势、表情、姿势的方法
 * playAnimation
 * playPose
 * playGesture
 * setMood
 */


import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import Stats from 'three/addons/libs/stats.module.js';

import{ DynamicBones } from './dynamicbones.mjs';

import { segment, OutputFormat, addDict} from 'pinyin-pro';
import CompleteDict from './complete.mjs';
import { TechnicolorShader } from 'three/examples/jsm/Addons.js';

// import { linearToneMapping } from 'three/tsl';
// import CompleteDict from "https://cdn.jsdelivr.net/npm/@pinyin-pro/data@1.2.0/dist/complete.min.js";
addDict(CompleteDict);
//  TODO: 就算加不了，分词以后把数字手动合并，给这部分做this.ReplaceNumberInString


// Temporary objects for animation loop
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const v = new THREE.Vector3();
const w = new THREE.Vector3();
const box = new THREE.Box3();
const m = new THREE.Matrix4();
const minv = new THREE.Matrix4();
const origin = new THREE.Vector3();
const forward = new THREE.Vector3(0, 0, 1);
const axisx = new THREE.Vector3(1, 0, 0);
const axisy = new THREE.Vector3(0, 1, 0);
const axisz = new THREE.Vector3(0, 0, 1);

class TalkingHead {

  /**
  * Avatar.
  * @typedef {Object} Avatar
  * @property {string} url URL for the GLB file
  * @property {string} [body] Body form 'M' or 'F'
  * @property {string} [lipsyncLang] Lip-sync language, e.g. 'fi', 'en'
  * @property {string} [ttsLang] Text-to-speech language, e.g. "fi-FI"
  * @property {voice} [ttsVoice] Voice name.
  * @property {numeric} [ttsRate] Voice rate.
  * @property {numeric} [ttsPitch] Voice pitch.
  * @property {numeric} [ttsVolume] Voice volume.
  * @property {string} [avatarMood] Initial mood.
  * @property {boolean} [avatarMute] If true, muted.
  * @property {numeric} [avatarIdleEyeContact] Eye contact while idle [0,1]
  * @property {numeric} [avatarIdleHeadMove] Eye contact while idle [0,1]
  * @property {numeric} [avatarSpeakingEyeContact] Eye contact while speaking [0,1]
  * @property {numeric} [avatarSpeakingHeadMove] Eye contact while speaking [0,1]
  * @property {Object[]} [modelDynamicBones] Config for Dynamic Bones feature
  */

  /**
  * Loading progress.
  * @callback progressfn
  * @param {string} url URL of the resource
  * @param {Object} event Progress event
  * @param {boolean} event.lengthComputable If false, total is not known
  * @param {number} event.loaded Number of loaded items
  * @param {number} event.total Number of total items
  */

  /**
  * Callback when new subtitles have been written to the DOM node.
  * @callback subtitlesfn
  * @param {Object} node DOM node
  */

  /**
  * Callback when the speech queue processes this marker item.
  * @callback markerfn
  */

  /**
  * Audio object.
  * @typedef {Object} Audio
  * @property {ArrayBuffer|ArrayBuffer[]} audio Audio buffer or array of buffers
  * @property {string[]} words Words
  * @property {number[]} wtimes Starting times of words
  * @property {number[]} wdurations Durations of words
  * @property {string[]} [visemes] Oculus lip-sync viseme IDs
  * @property {number[]} [vtimes] Starting times of visemes
  * @property {number[]} [vdurations] Durations of visemes
  * @property {string[]} [markers] Timed callback functions
  * @property {number[]} [mtimes] Starting times of markers
  */

  /**
  * Lip-sync object.
  * @typedef {Object} Lipsync
  * @property {string[]} visemes Oculus lip-sync visemes
  * @property {number[]} times Starting times in relative units
  * @property {number[]} durations Durations in relative units
  */

  /**
  * @constructor
  * @param {Object} node DOM element of the avatar
  * @param {Object} [opt=null] Global/default options
  */
  constructor(node, opt = null ) {
    this.nodeAvatar = node;
    this.opt = {
      jwtGet: null, // Function to get JSON Web Token
      ttsEndpoint: null,
      ttsApikey: null,
      ttsTrimStart: 0,
      ttsTrimEnd: 400,
      ttsLang: "fi-FI",
      ttsVoice: "fi-FI-Standard-A",
      ttsRate: 1,
      ttsPitch: 0,
      ttsVolume: 0,
      mixerGainSpeech: null,
      mixerGainBackground: null,
      lipsyncLang: 'fi',
      lipsyncModules: ['fi','en','lt'],
      pcmSampleRate: 22050,
      modelRoot: "Armature",
      modelPixelRatio: 1,
      modelFPS: 30,
      modelMovementFactor: 1,
      cameraView: 'full',
      cameraDistance: 0,
      cameraX: 0,
      cameraY: 0,
      cameraRotateX: 0,
      cameraRotateY: 0,
      cameraRotateEnable: true,
      cameraPanEnable: false,
      cameraZoomEnable: false,
      lightAmbientColor: 0xffffff,
      lightAmbientIntensity: 2,
      lightDirectColor: 0x8888aa,
      lightDirectIntensity: 30,
      lightDirectPhi: 1,
      lightDirectTheta: 2,
      lightSpotIntensity: 0,
      lightSpotColor: 0x3388ff,
      lightSpotPhi: 0.1,
      lightSpotTheta: 4,
      lightSpotDispersion: 1,
      avatarMood: "neutral",
      avatarMute: false,
      avatarIdleEyeContact: 0.2,
      avatarIdleHeadMove: 0.5,
      avatarSpeakingEyeContact: 0.5,
      avatarSpeakingHeadMove: 0.5,
      avatarIgnoreCamera: false,
      listeningSilenceThresholdLevel: 40,
      listeningSilenceThresholdMs: 2000,
      listeningSilenceDurationMax: 10000,
      listeningActiveThresholdLevel: 75,
      listeningActiveThresholdMs: 300,
      listeningActiveDurationMax: 240000,
      statsNode: null,
      statsStyle: null
    };
    Object.assign( this.opt, opt || {} );

    // Statistics
    if ( this.opt.statsNode ) {
      this.stats = new Stats();
      if ( this.opt.statsStyle ) {
        this.stats.dom.style.cssText = this.opt.statsStyle;
      }
      this.opt.statsNode.appendChild( this.stats.dom );
    }

    this.ChineseNumber = {'0': '零','1': '一','2': '二','3': '三','4': '四','5': '五','6': '六','7': '七','8': '八','9': '九'}
    this.ChineseUnit = ['十','百','千','万','亿']
    

    // Pose templates
    // NOTE: The body weight on each pose should be on left foot
    // for most natural result.
    this.poseTrace = [];
    this.AnimationFA_route = {
      'standby0': ['U_Idle_01_Cycle.glb'],
      'standby1': ['Idle_01to03.glb', 'U_Idle_03_Cycle.glb', 'Idle_03to01.glb'],
      'standby2': ['Idle_01to04.glb', 'Idle_04_Cycle.glb', 'Idle_04to01.glb'],
      'talk-1': ['Idle_01to04.glb', 'Idle_04_Cycle.glb', 'Idle_04to01.glb', 'U_Speech_08_Cycle_T1_02.glb'],
      'talk-2': ['Idle_01to04.glb', 'Idle_04_Cycle.glb', 'Idle_04to01.glb', 'U_Speech_08_Cycle_T1_04.glb'],
      'talk-3': ['Idle_01to04.glb', 'Idle_04_Cycle.glb', 'Idle_04to01.glb', 'U_Speech_08_Cycle_T1_06.glb'],
      'talk-4': ['Idle_01to04.glb', 'Idle_04_Cycle.glb', 'Idle_04to01.glb', 'U_Speech_08_Cycle_T1_08.glb'],
      'speech-1': ['5Talk_03_01.glb'],
      'speech-2': ['5Talk_03_02.glb']
    }
    this.DefaultTimeList = {
      'standby0': 7.10,
      'standby1': 21.27,
      'standby2': 9.49,
    }
    this.TalkTimeList = {
      'talk-1': 15.12,
      'talk-2': 14.09,
      'talk-3': 15.32,
      'talk-4': 15.32,
      'speech-1': 14.50,
      'speech-2': 7.53
    }

    
    
    this.MetaTimeList = {
      'Idle_04_Cycle.glb': 0.53,
      'Idle_01to02.glb': 2.43,
      'Idle_04to01': 4.17,
      'U_Speech_08_Cycle_T1_04.glb': 4.60,
      'Idle_01to04': 4.80,
      'U_Speech_08_Cycle_T1_02.glb': 5.63,
      'U_Speech_08_Cycle_T1_06.glb': 5.83,
      'U_Speech_08_Cycle_T1_08.glb': 5.83,
      'Idle_03to01': 6.67,
      'U_Idle_03_Cycle': 7.10,
      'U_Idle_02_Cycle': 7.10,
      'U_Idle_01_Cycle': 7.10,
      'Idle_01to03': 7.50,
      '5Talk_03_02': 7.53,
      '5Talk_03_01': 14.50
    }
    this.poseTransfer = { // 这里按照可待机的默认动作加
      'default': '',  // 默认动作
      'side': 'standby0',
      'hip': 'standby2',
      'turn': '',
      'bend': '',
      'back': '',
      'straight': 'standby1',
      'wide': '',
      'oneknee': '',
      'kneel': '',
      'sitting': '',
      'handup': '',
      'index': '',
      'ok': '',
      'thumbup': '',
      'thumbdown': '',
      'shrug': '',
      'namaste': ''
    }; // 无填充的自动补全default
    this.singlePose = {
      'default': 'U_Idle_01_Cycle',
      'standby0': 'U_Idle_01_Cycle',
      'standby1': 'U_Idle_02_Cycle',
      'standby2': 'U_Idle_03_Cycle'
    }
    this.PoseGLB = true;



    // useless
    this.poseTemplates = {

      'default': {
        standing: true,
        props: {
          // position字段不变，rotation全0
          // 'pelvis.position':{'x':0,'y':0,'z':0}, 'pelvis.rotation':{'x':0,'y':0,'z':0}, 'spine_01.rotation':{'x':0,'y':0,'z':0}, 'spine_02.rotation':{'x':0,'y':0,'z':0}, 'spine_03.rotation':{'x':0,'y':0,'z':0}, 'neck_01.rotation':{'x':0,'y':0,'z':0}, 'head.rotation':{'x':0,'y':0,'z':0}, 'clavicle_l.rotation':{'x':0,'y':0,'z':0}, 'upperarm_l.rotation':{'x':0,'y':0,'z':0}, 'lowerarm_l.rotation':{'x':0,'y':0,'z':0}, 'hand_l.rotation':{'x':0,'y':0,'z':0}, 'thumb_01_l.rotation':{'x':0,'y':0,'z':0}, 'thumb_02_l.rotation':{'x':0,'y':0,'z':0}, 'thumb_03_l.rotation':{'x':0,'y':0,'z':0}, 'index_01_l.rotation':{'x':0,'y':0,'z':0}, 'index_02_l.rotation':{'x':0,'y':0,'z':0}, 'index_03_l.rotation':{'x':0,'y':0,'z':0}, 'middle_01_l.rotation':{'x':0,'y':0,'z':0}, 'middle_02_l.rotation':{'x':0,'y':0,'z':0}, 'middle_03_l.rotation':{'x':0,'y':0,'z':0}, 'ring_01_l.rotation':{'x':0,'y':0,'z':0}, 'ring_02_l.rotation':{'x':0,'y':0,'z':0}, 'ring_03_l.rotation':{'x':0,'y':0,'z':0}, 'pinky_01_l.rotation':{'x':0,'y':0,'z':0}, 'pinky_02_l.rotation':{'x':0,'y':0,'z':0}, 'pinky_03_l.rotation':{'x':0,'y':0,'z':0}, 'clavicle_r.rotation':{'x':0,'y':0,'z':0}, 'upperarm_r.rotation':{'x':0,'y':0,'z':0}, 'lowerarm_r.rotation':{'x':0,'y':0,'z':0}, 'hand_r.rotation':{'x':0,'y':0,'z':0}, 'thumb_01_r.rotation':{'x':0,'y':0,'z':0}, 'thumb_02_r.rotation':{'x':0,'y':0,'z':0}, 'thumb_03_r.rotation':{'x':0,'y':0,'z':0}, 'index_01_r.rotation':{'x':0,'y':0,'z':0}, 'index_02_r.rotation':{'x':0,'y':0,'z':0}, 'index_03_r.rotation':{'x':0,'y':0,'z':0}, 'middle_01_r.rotation':{'x':0,'y':0,'z':0}, 'middle_02_r.rotation':{'x':0,'y':0,'z':0}, 'middle_03_r.rotation':{'x':0,'y':0,'z':0}, 'ring_01_r.rotation':{'x':0,'y':0,'z':0}, 'ring_02_r.rotation':{'x':0,'y':0,'z':0}, 'ring_03_r.rotation':{'x':0,'y':0,'z':0}, 'pinky_01_r.rotation':{'x':0,'y':0,'z':0}, 'pinky_02_r.rotation':{'x':0,'y':0,'z':0}, 'pinky_03_r.rotation':{'x':0,'y':0,'z':0}, 'thigh_l.rotation':{'x':0,'y':0,'z':0}, 'calf_l.rotation':{'x':0,'y':0,'z':0}, 'foot_l.rotation':{'x':0,'y':0,'z':0}, 'ball_l.rotation':{'x':0,'y':0,'z':0}, 'thigh_r.rotation':{'x':0,'y':0,'z':0}, 'calf_r.rotation':{'x':0,'y':0,'z':0}, 'foot_r.rotation':{'x':0,'y':0,'z':0}, 'ball_r.rotation':{'x':0,'y':0,'z':0}
          'pelvis.position':{'x':0,'y':0,'z':0}, 'pelvis.rotation':{'x':-0.003,'y':-0.017,'z':0.1}, 'spine_01.rotation':{'x':-0.103,'y':-0.002,'z':-0.063}, 'spine_02.rotation':{'x':0.042,'y':-0.02,'z':-0.069}, 'spine_03.rotation':{'x':0.131,'y':-0.012,'z':-0.065}, 'neck_01.rotation':{'x':0.027,'y':0.006,'z':0}, 'head.rotation':{'x':0.077,'y':-0.065,'z':0}, 'clavicle_l.rotation':{x:1.599, y:0.084, z:-1.77}, 'upperarm_l.rotation':{'x':0,'y':0,'z':0}, 'lowerarm_l.rotation':{'x':0,'y':0,'z':0}, 'hand_l.rotation':{'x':-Math.PI/2,'y':0,'z':0}, 'thumb_01_l.rotation':{'x':0,'y':0,'z':0}, 'thumb_02_l.rotation':{'x':0,'y':0,'z':0}, 'thumb_03_l.rotation':{'x':0,'y':0,'z':0}, 'index_01_l.rotation':{'x':0,'y':0,'z':0}, 'index_02_l.rotation':{'x':0,'y':0,'z':0}, 'index_03_l.rotation':{'x':0,'y':0,'z':0}, 'middle_01_l.rotation':{'x':0,'y':0,'z':0}, 'middle_02_l.rotation':{'x':0,'y':0,'z':0}, 'middle_03_l.rotation':{'x':0,'y':0,'z':0}, 'ring_01_l.rotation':{'x':0,'y':0,'z':0}, 'ring_02_l.rotation':{'x':0,'y':0,'z':0}, 'ring_03_l.rotation':{'x':0,'y':0,'z':0}, 'pinky_01_l.rotation':{'x':0,'y':0,'z':0}, 'pinky_02_l.rotation':{'x':0,'y':0,'z':0}, 'pinky_03_l.rotation':{'x':0,'y':0,'z':0}, 'clavicle_r.rotation':{'x':-Math.PI/2,'y':Math.PI/2,'z':-Math.PI/2}, 'upperarm_r.rotation':{'x':0,'y':0,'z':0}, 'lowerarm_r.rotation':{'x':0,'y':0,'z':0}, 'hand_r.rotation':{'x':-Math.PI/2,'y':0,'z':0}, 'thumb_01_r.rotation':{'x':0,'y':0,'z':0}, 'thumb_02_r.rotation':{'x':0,'y':0,'z':0}, 'thumb_03_r.rotation':{'x':0,'y':0,'z':0}, 'index_01_r.rotation':{'x':0,'y':0,'z':0}, 'index_02_r.rotation':{'x':0,'y':0,'z':0}, 'index_03_r.rotation':{'x':0,'y':0,'z':0}, 'middle_01_r.rotation':{'x':0,'y':0,'z':0}, 'middle_02_r.rotation':{'x':0,'y':0,'z':0}, 'middle_03_r.rotation':{'x':0,'y':0,'z':0}, 'ring_01_r.rotation':{'x':0,'y':0,'z':0}, 'ring_02_r.rotation':{'x':0,'y':0,'z':0}, 'ring_03_r.rotation':{'x':0,'y':0,'z':0}, 'pinky_01_r.rotation':{'x':0,'y':0,'z':0}, 'pinky_02_r.rotation':{'x':0,'y':0,'z':0}, 'pinky_03_r.rotation':{'x':0,'y':0,'z':0}, 'thigh_l.rotation':{'x':0,'y':0,'z':0}, 'calf_l.rotation':{'x':0,'y':0,'z':0}, 'foot_l.rotation':{'x':0,'y':0,'z':0}, 'ball_l.rotation':{'x':0,'y':0,'z':Math.PI/2}, 'thigh_r.rotation':{'x':0,'y':0,'z':Math.PI}, 'calf_r.rotation':{'x':0,'y':0,'z':0}, 'foot_r.rotation':{'x':0,'y':0,'z':0}, 'ball_r.rotation':{'x':0,'y':0,'z':Math.PI/2}
          // TODO: 先找到将其变为正常的变换
        }
      },

      'side': {
        standing: true,
        props: {
          // 'pelvis.position':{'x':0,'y':0,'z':0}, 'pelvis.rotation':{'x':-0.003,'y':-0.017,'z':0.1}, 'spine_01.rotation':{'x':-0.103,'y':-0.002,'z':-0.063}, 'spine_02.rotation':{'x':0.042,'y':-0.02,'z':-0.069}, 'spine_03.rotation':{'x':0.131,'y':-0.012,'z':-0.065}, 'neck_01.rotation':{'x':0.027,'y':0.006,'z':0}, 'head.rotation':{'x':0.077,'y':-0.065,'z':0}, 'clavicle_l.rotation':{x:1.599, y:0.084, z:-1.77}, 'upperarm_l.rotation':{'x':0,'y':0,'z':0}, 'lowerarm_l.rotation':{'x':0,'y':0,'z':0}, 'hand_l.rotation':{'x':-Math.PI/2,'y':0,'z':0}, 'thumb_01_l.rotation':{'x':0,'y':0,'z':0}, 'thumb_02_l.rotation':{'x':0,'y':0,'z':0}, 'thumb_03_l.rotation':{'x':0,'y':0,'z':0}, 'index_01_l.rotation':{'x':0,'y':0,'z':0}, 'index_02_l.rotation':{'x':0,'y':0,'z':0}, 'index_03_l.rotation':{'x':0,'y':0,'z':0}, 'middle_01_l.rotation':{'x':0,'y':0,'z':0}, 'middle_02_l.rotation':{'x':0,'y':0,'z':0}, 'middle_03_l.rotation':{'x':0,'y':0,'z':0}, 'ring_01_l.rotation':{'x':0,'y':0,'z':0}, 'ring_02_l.rotation':{'x':0,'y':0,'z':0}, 'ring_03_l.rotation':{'x':0,'y':0,'z':0}, 'pinky_01_l.rotation':{'x':0,'y':0,'z':0}, 'pinky_02_l.rotation':{'x':0,'y':0,'z':0}, 'pinky_03_l.rotation':{'x':0,'y':0,'z':0}, 'clavicle_r.rotation':{'x':-Math.PI/2,'y':Math.PI/2,'z':-Math.PI/2}, 'upperarm_r.rotation':{'x':0,'y':0,'z':0}, 'lowerarm_r.rotation':{'x':0,'y':0,'z':0}, 'hand_r.rotation':{'x':-Math.PI/2,'y':0,'z':0}, 'thumb_01_r.rotation':{'x':0,'y':0,'z':0}, 'thumb_02_r.rotation':{'x':0,'y':0,'z':0}, 'thumb_03_r.rotation':{'x':0,'y':0,'z':0}, 'index_01_r.rotation':{'x':0,'y':0,'z':0}, 'index_02_r.rotation':{'x':0,'y':0,'z':0}, 'index_03_r.rotation':{'x':0,'y':0,'z':0}, 'middle_01_r.rotation':{'x':0,'y':0,'z':0}, 'middle_02_r.rotation':{'x':0,'y':0,'z':0}, 'middle_03_r.rotation':{'x':0,'y':0,'z':0}, 'ring_01_r.rotation':{'x':0,'y':0,'z':0}, 'ring_02_r.rotation':{'x':0,'y':0,'z':0}, 'ring_03_r.rotation':{'x':0,'y':0,'z':0}, 'pinky_01_r.rotation':{'x':0,'y':0,'z':0}, 'pinky_02_r.rotation':{'x':0,'y':0,'z':0}, 'pinky_03_r.rotation':{'x':0,'y':0,'z':0}, 'thigh_l.rotation':{'x':0,'y':0,'z':0}, 'calf_l.rotation':{'x':0,'y':0,'z':0}, 'foot_l.rotation':{'x':0,'y':0,'z':0}, 'ball_l.rotation':{'x':0,'y':0,'z':Math.PI/2}, 'thigh_r.rotation':{'x':0,'y':0,'z':Math.PI}, 'calf_r.rotation':{'x':0,'y':0,'z':0}, 'foot_r.rotation':{'x':0,'y':0,'z':0}, 'ball_r.rotation':{'x':0,'y':0,'z':Math.PI/2}
          'pelvis.position':{'x':0,'y':0,'z':0}, 'pelvis.rotation':{'x':0,'y':0,'z':0}, 'spine_01.rotation':{'x':0,'y':0,'z':0}, 'spine_02.rotation':{'x':0,'y':0,'z':0}, 'spine_03.rotation':{'x':0,'y':0,'z':0}, 'neck_01.rotation':{'x':0,'y':0,'z':0}, 'head.rotation':{'x':0,'y':0,'z':0}, 'clavicle_l.rotation':{'x':0,'y':-Math.PI/2,'z':0}, 'upperarm_l.rotation':{'x':0,'y':0,'z':0}, 'lowerarm_l.rotation':{'x':0,'y':0,'z':0}, 'hand_l.rotation':{'x':-Math.PI/2,'y':0,'z':0}, 'thumb_01_l.rotation':{'x':0,'y':0,'z':0}, 'thumb_02_l.rotation':{'x':0,'y':0,'z':0}, 'thumb_03_l.rotation':{'x':0,'y':0,'z':0}, 'index_01_l.rotation':{'x':0,'y':0,'z':0}, 'index_02_l.rotation':{'x':0,'y':0,'z':0}, 'index_03_l.rotation':{'x':0,'y':0,'z':0}, 'middle_01_l.rotation':{'x':0,'y':0,'z':0}, 'middle_02_l.rotation':{'x':0,'y':0,'z':0}, 'middle_03_l.rotation':{'x':0,'y':0,'z':0}, 'ring_01_l.rotation':{'x':0,'y':0,'z':0}, 'ring_02_l.rotation':{'x':0,'y':0,'z':0}, 'ring_03_l.rotation':{'x':0,'y':0,'z':0}, 'pinky_01_l.rotation':{'x':0,'y':0,'z':0}, 'pinky_02_l.rotation':{'x':0,'y':0,'z':0}, 'pinky_03_l.rotation':{'x':0,'y':0,'z':0}, 'clavicle_r.rotation':{'x':-Math.PI/2,'y':Math.PI/2,'z':-Math.PI/2}, 'upperarm_r.rotation':{'x':0,'y':0,'z':0}, 'lowerarm_r.rotation':{'x':0,'y':0,'z':0}, 'hand_r.rotation':{'x':-Math.PI/2,'y':0,'z':0}, 'thumb_01_r.rotation':{'x':0,'y':0,'z':0}, 'thumb_02_r.rotation':{'x':0,'y':0,'z':0}, 'thumb_03_r.rotation':{'x':0,'y':0,'z':0}, 'index_01_r.rotation':{'x':0,'y':0,'z':0}, 'index_02_r.rotation':{'x':0,'y':0,'z':0}, 'index_03_r.rotation':{'x':0,'y':0,'z':0}, 'middle_01_r.rotation':{'x':0,'y':0,'z':0}, 'middle_02_r.rotation':{'x':0,'y':0,'z':0}, 'middle_03_r.rotation':{'x':0,'y':0,'z':0}, 'ring_01_r.rotation':{'x':0,'y':0,'z':0}, 'ring_02_r.rotation':{'x':0,'y':0,'z':0}, 'ring_03_r.rotation':{'x':0,'y':0,'z':0}, 'pinky_01_r.rotation':{'x':0,'y':0,'z':0}, 'pinky_02_r.rotation':{'x':0,'y':0,'z':0}, 'pinky_03_r.rotation':{'x':0,'y':0,'z':0}, 'thigh_l.rotation':{'x':0,'y':0,'z':0}, 'calf_l.rotation':{'x':0,'y':0,'z':0}, 'foot_l.rotation':{'x':0,'y':0,'z':0}, 'ball_l.rotation':{'x':0,'y':0,'z':Math.PI/2}, 'thigh_r.rotation':{'x':0,'y':0,'z':Math.PI}, 'calf_r.rotation':{'x':0,'y':0,'z':0}, 'foot_r.rotation':{'x':0,'y':0,'z':0}, 'ball_r.rotation':{'x':0,'y':0,'z':0}
        }
      },

      'hip':{
        standing: true,
        props: {
          'pelvis.position':{x:0,y:1,z:0}, 'pelvis.rotation':{x:-0.036,y:0.09,z:0.135}, 'spine_01.rotation':{x:0.076,y:-0.035,z:0.01}, 'spine_02.rotation':{x:-0.096,y:0.013,z:-0.094}, 'spine_03.rotation':{x:-0.014,y:0.002,z:-0.097}, 'neck_01.rotation':{x:0.034,y:-0.051,z:-0.075}, 'head.rotation':{x:0.298,y:-0.1,z:0.154}, 'clavicle_l.rotation':{x:1.694,y:0.011,z:-1.68}, 'upperarm_l.rotation':{x:1.343,y:0.177,z:-0.153}, 'lowerarm_l.rotation':{x:-0.049,y:0.134,z:0.351}, 'hand_l.rotation':{x:0.057,y:-0.189,z:-0.026}, 'thumb_01_l.rotation':{x:0.368,y:-0.066,z:0.438}, 'thumb_02_l.rotation':{x:-0.156,y:0.029,z:-0.369}, 'thumb_03_l.rotation':{x:0.034,y:-0.009,z:0.016}, 'index_01_l.rotation':{x:0.157,y:-0.002,z:-0.171}, 'index_02_l.rotation':{x:0.099,y:0,z:0}, 'index_03_l.rotation':{x:0.1,y:0,z:0}, 'middle_01_l.rotation':{x:0.222,y:-0.019,z:-0.16}, 'middle_02_l.rotation':{x:0.142,y:0,z:0}, 'middle_03_l.rotation':{x:0.141,y:0,z:0}, 'ring_01_l.rotation':{x:0.333,y:-0.039,z:-0.174}, 'ring_02_l.rotation':{x:0.214,y:0,z:0}, 'ring_03_l.rotation':{x:0.213,y:0,z:0}, 'pinky_01_l.rotation':{x:0.483,y:-0.069,z:-0.189}, 'pinky_02_l.rotation':{x:0.312,y:0,z:0}, 'pinky_03_l.rotation':{x:0.309,y:0,z:0}, 'clavicle_r.rotation':{x:1.597,y:0.012,z:1.816}, 'upperarm_r.rotation':{x:0.618,y:-1.274,z:-0.266}, 'lowerarm_r.rotation':{x:-0.395,y:-0.097,z:-1.342}, 'hand_r.rotation':{x:-0.816,y:-0.057,z:-0.976}, 'thumb_01_r.rotation':{x:0.42,y:0.23,z:-1.172}, 'thumb_02_r.rotation':{x:-0.027,y:0.361,z:0.122}, 'thumb_03_r.rotation':{x:0.076,y:0.125,z:-0.371}, 'index_01_r.rotation':{x:-0.158,y:-0.045,z:0.033}, 'index_02_r.rotation':{x:0.391,y:0.051,z:0.025}, 'index_03_r.rotation':{x:0.317,y:0.058,z:0.07}, 'middle_01_r.rotation':{x:0.486,y:0.066,z:0.014}, 'middle_02_r.rotation':{x:0.718,y:0.055,z:0.07}, 'middle_03_r.rotation':{x:0.453,y:0.019,z:0.013}, 'ring_01_r.rotation':{x:0.591,y:0.241,z:0.11}, 'ring_02_r.rotation':{x:1.014,y:0.023,z:0.097}, 'ring_03_r.rotation':{x:0.708,y:0.008,z:0.066}, 'pinky_01_r.rotation':{x:1.02,y:0.305,z:0.051}, 'pinky_02_r.rotation':{x:1.187,y:-0.028,z:0.191}, 'pinky_03_r.rotation':{x:0.872,y:-0.031,z:0.121}, 'thigh_l.rotation':{x:-0.095,y:-0.058,z:-3.338}, 'calf_l.rotation':{x:-0.366,y:0.287,z:-0.021}, 'foot_l.rotation':{x:1.131,y:0.21,z:0.176}, 'ball_l.rotation':{x:0.739,y:-0.068,z:-0.001}, 'thigh_r.rotation':{x:-0.502,y:0.362,z:3.153}, 'calf_r.rotation':{x:-1.002,y:0.109,z:0.008}, 'foot_r.rotation':{x:0.626,y:-0.097,z:-0.194}, 'ball_r.rotation':{x:1.33,y:0.288,z:-0.078}
        }
      },

      'turn':{
        standing: true,
        props: {
          'pelvis.position':{x:0,y:1,z:0}, 'pelvis.rotation':{x:-0.07,y:-0.604,z:-0.004}, 'spine_01.rotation':{x:-0.007,y:0.003,z:0.071}, 'spine_02.rotation':{x:-0.053,y:0.024,z:-0.06}, 'spine_03.rotation':{x:0.074,y:0.013,z:-0.068}, 'neck_01.rotation':{x:0.03,y:0.186,z:-0.077}, 'head.rotation':{x:0.045,y:0.243,z:-0.086}, 'clavicle_l.rotation':{x:1.717,y:-0.085,z:-1.761}, 'upperarm_l.rotation':{x:1.314,y:0.07,z:-0.057}, 'lowerarm_l.rotation':{x:-0.151,y:0.714,z:0.302}, 'hand_l.rotation':{x:-0.069,y:0.003,z:-0.118}, 'thumb_01_l.rotation':{x:0.23,y:0.258,z:0.354}, 'thumb_02_l.rotation':{x:-0.107,y:-0.338,z:-0.455}, 'thumb_03_l.rotation':{x:-0.015,y:-0.142,z:0.002}, 'index_01_l.rotation':{x:0.145,y:0.032,z:-0.069}, 'index_02_l.rotation':{x:0.323,y:-0.049,z:-0.028}, 'index_03_l.rotation':{x:0.249,y:-0.053,z:-0.074}, 'middle_01_l.rotation':{x:0.235,y:-0.057,z:-0.088}, 'middle_02_l.rotation':{x:0.468,y:-0.036,z:-0.081}, 'middle_03_l.rotation':{x:0.203,y:-0.015,z:-0.017}, 'ring_01_l.rotation':{x:0.185,y:-0.118,z:-0.157}, 'ring_02_l.rotation':{x:0.578,y:0.02,z:-0.097}, 'ring_03_l.rotation':{x:0.27,y:0.021,z:-0.063}, 'pinky_01_l.rotation':{x:0.404,y:-0.182,z:-0.138}, 'pinky_02_l.rotation':{x:0.612,y:0.128,z:-0.144}, 'pinky_03_l.rotation':{x:0.267,y:0.094,z:-0.081}, 'clavicle_r.rotation':{x:1.605,y:0.17,z:1.625}, 'upperarm_r.rotation':{x:1.574,y:-0.655,z:0.388}, 'lowerarm_r.rotation':{x:-0.36,y:-0.849,z:-0.465}, 'hand_r.rotation':{x:0.114,y:0.416,z:-0.069}, 'thumb_01_r.rotation':{x:0.486,y:0.009,z:-0.492}, 'thumb_02_r.rotation':{x:-0.073,y:-0.01,z:0.284}, 'thumb_03_r.rotation':{x:-0.054,y:-0.006,z:0.209}, 'index_01_r.rotation':{x:0.245,y:-0.014,z:0.052}, 'index_02_r.rotation':{x:0.155,y:0,z:0}, 'index_03_r.rotation':{x:0.153,y:0,z:0}, 'middle_01_r.rotation':{x:0.238,y:0.004,z:0.028}, 'middle_02_r.rotation':{x:0.15,y:0,z:0}, 'middle_03_r.rotation':{x:0.149,y:0,z:0}, 'ring_01_r.rotation':{x:0.267,y:0.012,z:0.007}, 'ring_02_r.rotation':{x:0.169,y:0,z:0}, 'ring_03_r.rotation':{x:0.167,y:0,z:0}, 'pinky_01_r.rotation':{x:0.304,y:0.018,z:-0.021}, 'pinky_02_r.rotation':{x:0.192,y:0,z:0}, 'pinky_03_r.rotation':{x:0.19,y:0,z:0}, 'thigh_l.rotation':{x:-0.001,y:-0.058,z:-3.238}, 'calf_l.rotation':{x:-0.29,y:0.058,z:-0.021}, 'foot_l.rotation':{x:1.288,y:0.168,z:0.183}, 'ball_l.rotation':{x:0.363,y:-0.09,z:-0.01}, 'thigh_r.rotation':{x:-0.100,y:0.36,z:3.062}, 'calf_r.rotation':{x:-0.67,y:-0.304,z:0.043}, 'foot_r.rotation':{x:1.195,y:-0.159,z:-0.294}, 'ball_r.rotation':{x:0.737,y:0.164,z:-0.002}
        }
      },

      'bend':{
        bend: true, standing: true,
        props: {
          'pelvis.position':{x:-0.007, y:0.943, z:-0.001}, 'pelvis.rotation':{x:1.488, y:-0.633, z:1.435}, 'spine_01.rotation':{x:-0.126, y:0.007, z:-0.057}, 'spine_02.rotation':{x:-0.134, y:0.009, z:0.01}, 'spine_03.rotation':{x:-0.019, y:0, z:-0.002}, 'neck_01.rotation':{x:-0.159, y:0.572, z:-0.108}, 'head.rotation':{x:-0.064, y:0.716, z:-0.257}, 'clavicle_r.rotation':{x:1.625, y:-0.043, z:1.382}, 'upperarm_r.rotation':{x:0.746, y:-0.96, z:-1.009}, 'lowerarm_r.rotation':{x:-0.199, y:-0.528, z:-0.38}, 'hand_r.rotation':{x:-0.261, y:-0.043, z:-0.027}, 'thumb_01_r.rotation':{x:0.172, y:-0.138, z:-0.445}, 'thumb_02_r.rotation':{x:-0.158, y:0.327, z:0.545}, 'thumb_03_r.rotation':{x:-0.062, y:0.138, z:0.152}, 'index_01_r.rotation':{x:0.328, y:-0.005, z:0.132}, 'index_02_r.rotation':{x:0.303, y:0.049, z:0.028}, 'index_03_r.rotation':{x:0.241, y:0.046, z:0.077}, 'middle_01_r.rotation':{x:0.309, y:0.074, z:0.089}, 'middle_02_r.rotation':{x:0.392, y:0.036, z:0.081}, 'middle_03_r.rotation':{x:0.199, y:0.014, z:0.019}, 'ring_01_r.rotation':{x:0.239, y:0.143, z:0.091}, 'ring_02_r.rotation':{x:0.275, y:-0.02, z:0.097}, 'ring_03_r.rotation':{x:0.248, y:-0.023, z:0.061}, 'pinky_01_r.rotation':{x:0.211, y:0.154, z:0.029}, 'pinky_02_r.rotation':{x:0.348, y:-0.128, z:0.144}, 'pinky_03_r.rotation':{x:0.21, y:-0.091, z:0.065}, 'clavicle_l.rotation':{x:1.626, y:-0.027, z:-1.367}, 'upperarm_l.rotation':{x:1.048, y:0.737, z:0.712}, 'lowerarm_l.rotation':{x:-0.508, y:0.879, z:0.625}, 'hand_l.rotation':{x:0.06, y:-0.243, z:-0.079}, 'thumb_01_l.rotation':{x:0.187, y:-0.072, z:0.346}, 'thumb_02_l.rotation':{x:-0.066, y:0.008, z:-0.256}, 'thumb_03_l.rotation':{x:-0.085, y:0.014, z:-0.334}, 'index_01_l.rotation':{x:-0.1, y:0.016, z:-0.058}, 'index_02_l.rotation':{x:0.334, y:0, z:0}, 'index_03_l.rotation':{x:0.281, y:0, z:0}, 'middle_01_l.rotation':{x:-0.056, y:0, z:0}, 'middle_02_l.rotation':{x:0.258, y:0, z:0}, 'middle_03_l.rotation':{x:0.26, y:0, z:0}, 'ring_01_l.rotation':{x:-0.067, y:-0.002, z:0.008}, 'ring_02_l.rotation':{x:0.259, y:0, z:0}, 'ring_03_l.rotation':{x:0.276, y:0, z:0}, 'pinky_01_l.rotation':{x:-0.128, y:-0.007, z:0.042}, 'pinky_02_l.rotation':{x:0.227, y:0, z:0}, 'pinky_03_l.rotation':{x:0.145, y:0, z:0}, 'thigh_r.rotation':{x:-1.507, y:0.2, z:-3.043}, 'calf_r.rotation':{x:-0.689, y:-0.124, z:0.017}, 'foot_r.rotation':{x:0.909, y:0.008, z:-0.093}, 'ball_r.rotation':{x:0.842, y:0.075, z:-0.008}, 'thigh_l.rotation':{x:-1.449, y:-0.2, z:3.018}, 'calf_l.rotation':{x:-0.74, y:-0.115, z:-0.008}, 'foot_l.rotation':{x:1.048, y:-0.058, z:0.117}, 'ball_l.rotation':{x:0.807, y:-0.067, z:0.003}
        }
      },

      'back':{
        standing: true,
        props: {
          'pelvis.position':{x:0,y:1,z:0}, 'pelvis.rotation':{x:-0.732,y:-1.463,z:-0.637}, 'spine_01.rotation':{x:-0.171,y:0.106,z:0.157}, 'spine_02.rotation':{x:-0.044,y:0.138,z:-0.059}, 'spine_03.rotation':{x:0.082,y:0.133,z:-0.074}, 'neck_01.rotation':{x:0.39,y:0.591,z:-0.248}, 'head.rotation':{x:-0.001,y:0.596,z:-0.057}, 'clavicle_l.rotation':{x:1.676,y:0.007,z:-1.892}, 'upperarm_l.rotation':{x:-5.566,y:1.188,z:-0.173}, 'lowerarm_l.rotation':{x:-0.673,y:-0.105,z:1.702}, 'hand_l.rotation':{x:-0.469,y:-0.739,z:0.003}, 'thumb_01_l.rotation':{x:0.876,y:0.274,z:0.793}, 'thumb_02_l.rotation':{x:0.161,y:-0.23,z:-0.172}, 'thumb_03_l.rotation':{x:0.078,y:0.027,z:0.156}, 'index_01_l.rotation':{x:-0.085,y:-0.002,z:0.009}, 'index_02_l.rotation':{x:0.176,y:0,z:-0.002}, 'index_03_l.rotation':{x:-0.036,y:0.001,z:-0.035}, 'middle_01_l.rotation':{x:0.015,y:0.144,z:-0.076}, 'middle_02_l.rotation':{x:0.378,y:-0.007,z:-0.077}, 'middle_03_l.rotation':{x:-0.141,y:-0.001,z:0.031}, 'ring_01_l.rotation':{x:0.039,y:0.02,z:-0.2}, 'ring_02_l.rotation':{x:0.25,y:-0.002,z:-0.073}, 'ring_03_l.rotation':{x:0.236,y:0.006,z:-0.075}, 'pinky_01_l.rotation':{x:0.172,y:-0.033,z:-0.275}, 'pinky_02_l.rotation':{x:0.216,y:0.043,z:-0.054}, 'pinky_03_l.rotation':{x:0.325,y:0.078,z:-0.13}, 'clavicle_r.rotation':{x:2.015,y:-0.168,z:1.706}, 'upperarm_r.rotation':{x:0.203,y:-1.258,z:-0.782}, 'lowerarm_r.rotation':{x:-0.658,y:-0.133,z:-1.401}, 'hand_r.rotation':{x:-1.504,y:0.375,z:-0.005}, 'thumb_01_r.rotation':{x:0.413,y:-0.158,z:-1.121}, 'thumb_02_r.rotation':{x:-0.142,y:-0.008,z:0.209}, 'thumb_03_r.rotation':{x:-0.091,y:0.021,z:0.142}, 'index_01_r.rotation':{x:-0.167,y:0.014,z:-0.072}, 'index_02_r.rotation':{x:0.474,y:0.009,z:0.051}, 'index_03_r.rotation':{x:0.115,y:0.006,z:0.047}, 'middle_01_r.rotation':{x:0.385,y:0.019,z:0.144}, 'middle_02_r.rotation':{x:0.559,y:0.035,z:0.101}, 'middle_03_r.rotation':{x:0.229,y:0,z:0.027}, 'ring_01_r.rotation':{x:0.48,y:0.026,z:0.23}, 'ring_02_r.rotation':{x:0.772,y:0.038,z:0.109}, 'ring_03_r.rotation':{x:0.622,y:0.039,z:0.106}, 'pinky_01_r.rotation':{x:0.767,y:0.288,z:0.353}, 'pinky_02_r.rotation':{x:0.886,y:0.049,z:0.122}, 'pinky_03_r.rotation':{x:0.662,y:0.044,z:0.113}, 'thigh_l.rotation':{x:-0.206,y:-0.268,z:-3.343}, 'calf_l.rotation':{x:-0.333,y:0.757,z:-0.043}, 'foot_l.rotation':{x:1.049,y:0.167,z:0.287}, 'ball_l.rotation':{x:0.672,y:-0.069,z:-0.004}, 'thigh_r.rotation':{x:0.055,y:-0.226,z:3.037}, 'calf_r.rotation':{x:-0.559,y:0.39,z:-0.001}, 'foot_r.rotation':{x:1.2,y:0.133,z:0.085}, 'ball_r.rotation':{x:0.92,y:0.093,z:-0.013}
        }
      },

      'straight':{
        standing: true,
        props: {
          'pelvis.position':{x:0, y:0.989, z:0.001}, 'pelvis.rotation':{x:0.047, y:0.007, z:-0.007}, 'spine_01.rotation':{x:-0.143, y:-0.007, z:0.005}, 'spine_02.rotation':{x:-0.043, y:-0.014, z:0.012}, 'spine_03.rotation':{x:0.072, y:-0.013, z:0.013}, 'neck_01.rotation':{x:0.048, y:-0.003, z:0.012}, 'head.rotation':{x:0.05, y:-0.02, z:-0.017}, 'clavicle_l.rotation':{x:1.62, y:-0.166, z:-1.605}, 'upperarm_l.rotation':{x:1.275, y:0.544, z:-0.092}, 'lowerarm_l.rotation':{x:0, y:0, z:0.302}, 'hand_l.rotation':{x:-0.225, y:-0.154, z:0.11}, 'thumb_01_l.rotation':{x:0.435, y:-0.044, z:0.457}, 'thumb_02_l.rotation':{x:-0.028, y:0.002, z:-0.246}, 'thumb_03_l.rotation':{x:-0.236, y:-0.025, z:0.113}, 'index_01_l.rotation':{x:0.218, y:0.008, z:-0.081}, 'index_02_l.rotation':{x:0.165, y:-0.001, z:-0.017}, 'index_03_l.rotation':{x:0.165, y:-0.001, z:-0.017}, 'middle_01_l.rotation':{x:0.235, y:-0.011, z:-0.065}, 'middle_02_l.rotation':{x:0.182, y:-0.002, z:-0.019}, 'middle_03_l.rotation':{x:0.182, y:-0.002, z:-0.019}, 'ring_01_l.rotation':{x:0.316, y:-0.017, z:0.008}, 'ring_02_l.rotation':{x:0.253, y:-0.003, z:-0.026}, 'ring_03_l.rotation':{x:0.255, y:-0.003, z:-0.026}, 'pinky_01_l.rotation':{x:0.336, y:-0.062, z:0.088}, 'pinky_02_l.rotation':{x:0.276, y:-0.004, z:-0.028}, 'pinky_03_l.rotation':{x:0.276, y:-0.004, z:-0.028}, 'clavicle_r.rotation':{x:1.615, y:0.064, z:1.53}, 'upperarm_r.rotation':{x:1.313, y:-0.424, z:0.131}, 'lowerarm_r.rotation':{x:0, y:0, z:-0.317}, 'hand_r.rotation':{x:-0.158, y:-0.639, z:-0.196}, 'thumb_01_r.rotation':{x:0.44, y:0.048, z:-0.549}, 'thumb_02_r.rotation':{x:-0.056, y:-0.008, z:0.274}, 'thumb_03_r.rotation':{x:-0.258, y:0.031, z:-0.095}, 'index_01_r.rotation':{x:0.169, y:-0.011, z:0.105}, 'index_02_r.rotation':{x:0.134, y:0.001, z:0.011}, 'index_03_r.rotation':{x:0.134, y:0.001, z:0.011}, 'middle_01_r.rotation':{x:0.288, y:0.014, z:0.092}, 'middle_02_r.rotation':{x:0.248, y:0.003, z:0.02}, 'middle_03_r.rotation':{x:0.249, y:0.003, z:0.02}, 'ring_01_r.rotation':{x:0.369, y:0.019, z:0.006}, 'ring_02_r.rotation':{x:0.321, y:0.004, z:0.026}, 'ring_03_r.rotation':{x:0.323, y:0.004, z:0.026}, 'pinky_01_r.rotation':{x:0.468, y:0.085, z:-0.03}, 'pinky_02_r.rotation':{x:0.427, y:0.007, z:0.034}, 'pinky_03_r.rotation':{x:0.142, y:0.001, z:0.012}, 'thigh_l.rotation':{x:-0.077, y:-0.058, z:3.126}, 'calf_l.rotation':{x:-0.252, y:0.001, z:-0.018}, 'foot_l.rotation':{x:1.315, y:-0.064, z:0.315}, 'ball_l.rotation':{x:0.577, y:-0.07, z:-0.009}, 'thigh_r.rotation':{x:-0.083, y:-0.032, z:3.124}, 'calf_r.rotation':{x:-0.272, y:-0.003, z:0.021}, 'foot_r.rotation':{x:1.342, y:0.076, z:-0.222}, 'ball_r.rotation':{x:0.44, y:0.069, z:0.016}
        }
      },

      'wide':{
        standing: true,
        props: {
          'pelvis.position':{x:0, y:1.017, z:0.016}, 'pelvis.rotation':{x:0.064, y:-0.048, z:0.059}, 'spine_01.rotation':{x:-0.123, y:0, z:-0.018}, 'spine_02.rotation':{x:0.014, y:0.003, z:-0.006}, 'spine_03.rotation':{x:0.04, y:0.003, z:-0.007}, 'neck_01.rotation':{x:0.101, y:0.007, z:-0.035}, 'head.rotation':{x:-0.091, y:-0.049, z:0.105}, 'clavicle_r.rotation':{x:1.831, y:0.017, z:1.731}, 'upperarm_r.rotation':{x:-1.673, y:-1.102, z:-3.132}, 'lowerarm_r.rotation':{x:0.265, y:0.23, z:-0.824}, 'hand_r.rotation':{x:-0.52, y:0.345, z:-0.061}, 'thumb_01_r.rotation':{x:0.291, y:0.056, z:-0.428}, 'thumb_02_r.rotation':{x:0.025, y:0.005, z:0.166}, 'thumb_03_r.rotation':{x:-0.089, y:0.009, z:0.068}, 'index_01_r.rotation':{x:0.392, y:-0.015, z:0.11}, 'index_02_r.rotation':{x:0.391, y:0.001, z:0.004}, 'index_03_r.rotation':{x:0.326, y:0, z:0.003}, 'middle_01_r.rotation':{x:0.285, y:0.068, z:0.081}, 'middle_02_r.rotation':{x:0.519, y:0.004, z:0.011}, 'middle_03_r.rotation':{x:0.252, y:0, z:0.001}, 'ring_01_r.rotation':{x:0.207, y:0.133, z:0.146}, 'ring_02_r.rotation':{x:0.597, y:0.004, z:0.004}, 'ring_03_r.rotation':{x:0.292, y:0.002, z:0.012}, 'pinky_01_r.rotation':{x:0.338, y:0.182, z:0.136}, 'pinky_02_r.rotation':{x:0.533, y:0.002, z:0.004}, 'pinky_03_r.rotation':{x:0.194, y:0, z:0.002}, 'clavicle_l.rotation':{x:1.83, y:-0.063, z:-1.808}, 'upperarm_l.rotation':{x:-1.907, y:1.228, z:-2.959}, 'lowerarm_l.rotation':{x:-0.159, y:0.268, z:0.572}, 'hand_l.rotation':{x:0.069, y:-0.498, z:-0.025}, 'thumb_01_l.rotation':{x:0.738, y:0.123, z:0.178}, 'thumb_02_l.rotation':{x:-0.26, y:0.028, z:-0.477}, 'thumb_03_l.rotation':{x:-0.448, y:0.093, z:-0.661}, 'index_01_l.rotation':{x:1.064, y:0.005, z:-0.13}, 'index_02_l.rotation':{x:1.55, y:-0.143, z:-0.136}, 'index_03_l.rotation':{x:0.722, y:-0.076, z:-0.127}, 'middle_01_l.rotation':{x:1.095, y:-0.091, z:0.006}, 'middle_02_l.rotation':{x:1.493, y:-0.174, z:-0.151}, 'middle_03_l.rotation':{x:0.651, y:-0.031, z:-0.087}, 'ring_01_l.rotation':{x:1.083, y:-0.224, z:0.072}, 'ring_02_l.rotation':{x:1.145, y:-0.107, z:-0.195}, 'ring_03_l.rotation':{x:1.208, y:-0.134, z:-0.158}, 'pinky_01_l.rotation':{x:0.964, y:-0.383, z:0.128}, 'pinky_02_l.rotation':{x:1.457, y:-0.146, z:-0.159}, 'pinky_03_l.rotation':{x:1.019, y:-0.102, z:-0.141}, 'thigh_r.rotation':{x:-0.221, y:-0.233, z:2.87}, 'calf_r.rotation':{x:-0.339, y:-0.043, z:-0.041}, 'foot_r.rotation':{x:1.081, y:0.177, z:0.114}, 'ball_r.rotation':{x:0.775, y:0, z:0}, 'thigh_l.rotation':{x:-0.185, y:0.184, z:3.131}, 'calf_l.rotation':{x:-0.408, y:0.129, z:0.02}, 'foot_l.rotation':{x:1.167, y:-0.002, z:-0.007}, 'ball_l.rotation':{x:0.723, y:0, z:0}
        }
      },

      'oneknee':{
        kneeling: true,
        props: {
          'pelvis.position':{x:-0.005, y:0.415, z:-0.017}, 'pelvis.rotation':{x:-0.25, y:0.04, z:-0.238}, 'spine_01.rotation':{x:0.037, y:0.043, z:0.047}, 'spine_02.rotation':{x:0.317, y:0.103, z:0.066}, 'spine_03.rotation':{x:0.433, y:0.109, z:0.054}, 'neck_01.rotation':{x:-0.156, y:-0.092, z:0.059}, 'head.rotation':{x:-0.398, y:-0.032, z:0.018}, 'clavicle_r.rotation':{x:1.546, y:0.119, z:1.528}, 'upperarm_r.rotation':{x:0.896, y:-0.247, z:-0.512}, 'lowerarm_r.rotation':{x:0.007, y:0, z:-1.622}, 'hand_r.rotation':{x:1.139, y:-0.853, z:0.874}, 'thumb_01_r.rotation':{x:0.176, y:0.107, z:-0.311}, 'thumb_02_r.rotation':{x:-0.047, y:-0.003, z:0.12}, 'thumb_03_r.rotation':{x:0, y:0, z:0}, 'index_01_r.rotation':{x:0.186, y:0.005, z:0.125}, 'index_02_r.rotation':{x:0.454, y:0.005, z:0.015}, 'index_03_r.rotation':{x:0, y:0, z:0}, 'middle_01_r.rotation':{x:0.444, y:0.035, z:0.127}, 'middle_02_r.rotation':{x:0.403, y:-0.006, z:-0.04}, 'middle_03_r.rotation':{x:0, y:0, z:0}, 'ring_01_r.rotation':{x:0.543, y:0.074, z:0.121}, 'ring_02_r.rotation':{x:0.48, y:-0.018, z:-0.063}, 'ring_03_r.rotation':{x:0, y:0, z:0}, 'pinky_01_r.rotation':{x:0.464, y:0.086, z:0.113}, 'pinky_02_r.rotation':{x:0.667, y:-0.06, z:-0.128}, 'pinky_03_r.rotation':{x:0, y:0, z:0}, 'clavicle_l.rotation':{x:1.545, y:-0.116, z:-1.529}, 'upperarm_l.rotation':{x:0.799, y:0.631, z:0.556}, 'lowerarm_l.rotation':{x:-0.002, y:0.007, z:0.926}, 'hand_l.rotation':{x:-0.508, y:0.439, z:0.502}, 'thumb_01_l.rotation':{x:0.651, y:-0.035, z:0.308}, 'thumb_02_l.rotation':{x:-0.053, y:0.008, z:-0.11}, 'thumb_03_l.rotation':{x:0, y:0, z:0}, 'index_01_l.rotation':{x:0.662, y:-0.053, z:-0.116}, 'index_02_l.rotation':{x:0.309, y:-0.004, z:-0.02}, 'index_03_l.rotation':{x:0, y:0, z:0}, 'middle_01_l.rotation':{x:0.501, y:-0.062, z:-0.12}, 'middle_02_l.rotation':{x:0.144, y:-0.002, z:0.016}, 'middle_03_l.rotation':{x:0, y:0, z:0}, 'ring_01_l.rotation':{x:0.397, y:-0.029, z:-0.143}, 'ring_02_l.rotation':{x:0.328, y:0.01, z:0.059}, 'ring_03_l.rotation':{x:0, y:0, z:0}, 'pinky_01_l.rotation':{x:0.194, y:0.008, z:-0.164}, 'pinky_02_l.rotation':{x:0.38, y:0.031, z:0.128}, 'pinky_03_l.rotation':{x:0, y:0, z:0}, 'thigh_r.rotation':{x:-1.594, y:-0.251, z:2.792}, 'calf_r.rotation':{x:-2.301, y:-0.073, z:0.055}, 'foot_r.rotation':{x:1.553, y:-0.207, z:-0.094}, 'ball_r.rotation':{x:0.459, y:0.069, z:0.016}, 'thigh_l.rotation':{x:-0.788, y:-0.236, z:-2.881}, 'calf_l.rotation':{x:-2.703, y:0.012, z:-0.047}, 'foot_l.rotation':{x:2.191, y:-0.102, z:0.019}, 'ball_l.rotation':{x:1.215, y:-0.027, z:0.01}
        }
      },

      'kneel':{
        kneeling: true, lying: true,
        props: {
          'pelvis.position':{x:0, y:0.532, z:-0.002}, 'pelvis.rotation':{x:0.018, y:-0.008, z:-0.017}, 'spine_01.rotation':{x:-0.139, y:-0.01, z:0.002}, 'spine_02.rotation':{x:0.002, y:-0.002, z:0.001}, 'spine_03.rotation':{x:0.028, y:-0.002, z:0.001}, 'neck_01.rotation':{x:-0.007, y:0, z:-0.002}, 'head.rotation':{x:-0.02, y:-0.008, z:-0.004}, 'clavicle_l.rotation':{x:1.77, y:-0.428, z:-1.588}, 'upperarm_l.rotation':{x:0.911, y:0.343, z:0.083}, 'lowerarm_l.rotation':{x:0, y:0, z:0.347}, 'hand_l.rotation':{x:0.033, y:-0.052, z:-0.105}, 'thumb_01_l.rotation':{x:0.508, y:-0.22, z:0.708}, 'thumb_02_l.rotation':{x:-0.323, y:-0.139, z:-0.56}, 'thumb_03_l.rotation':{x:-0.328, y:0.16, z:-0.301}, 'index_01_l.rotation':{x:0.178, y:0.248, z:0.045}, 'index_02_l.rotation':{x:0.236, y:-0.002, z:-0.019}, 'index_03_l.rotation':{x:-0.062, y:0, z:0.005}, 'middle_01_l.rotation':{x:0.123, y:-0.005, z:-0.019}, 'middle_02_l.rotation':{x:0.589, y:-0.014, z:-0.045}, 'middle_03_l.rotation':{x:0.231, y:-0.002, z:-0.019}, 'ring_01_l.rotation':{x:0.196, y:-0.008, z:-0.091}, 'ring_02_l.rotation':{x:0.483, y:-0.009, z:-0.038}, 'ring_03_l.rotation':{x:0.367, y:-0.005, z:-0.029}, 'pinky_01_l.rotation':{x:0.191, y:-0.269, z:-0.246}, 'pinky_02_l.rotation':{x:0.37, y:-0.006, z:-0.029}, 'pinky_03_l.rotation':{x:0.368, y:-0.005, z:-0.029}, 'clavicle_r.rotation':{x:1.73, y:0.434, z:1.715}, 'upperarm_r.rotation':{x:0.841, y:-0.508, z:-0.155}, 'lowerarm_r.rotation':{x:0, y:0, z:-0.355}, 'hand_r.rotation':{x:0.091, y:0.137, z:0.197}, 'thumb_01_r.rotation':{x:0.33, y:0.051, z:-0.753}, 'thumb_02_r.rotation':{x:-0.113, y:0.075, z:0.612}, 'thumb_03_r.rotation':{x:-0.271, y:-0.166, z:0.164}, 'index_01_r.rotation':{x:0.073, y:0.001, z:-0.093}, 'index_02_r.rotation':{x:0.338, y:0.006, z:0.034}, 'index_03_r.rotation':{x:0.131, y:0.001, z:0.013}, 'middle_01_r.rotation':{x:0.13, y:0.005, z:-0.017}, 'middle_02_r.rotation':{x:0.602, y:0.018, z:0.058}, 'middle_03_r.rotation':{x:-0.031, y:0, z:-0.003}, 'ring_01_r.rotation':{x:0.351, y:0.019, z:0.045}, 'ring_02_r.rotation':{x:0.19, y:0.002, z:0.019}, 'ring_03_r.rotation':{x:0.21, y:0.002, z:0.021}, 'pinky_01_r.rotation':{x:0.256, y:0.17, z:0.118}, 'pinky_02_r.rotation':{x:0.451, y:0.01, z:0.045}, 'pinky_03_r.rotation':{x:0.346, y:0.006, z:0.035}, 'thigh_l.rotation':{x:-0.06, y:0.1, z:-2.918}, 'calf_l.rotation':{x:-1.933, y:-0.01, z:0.011}, 'foot_l.rotation':{x:0.774, y:-0.162, z:-0.144}, 'ball_l.rotation':{x:1.188, y:0, z:0}, 'thigh_r.rotation':{x:-0.099, y:-0.057, z:2.922}, 'calf_r.rotation':{x:-1.93, y:0.172, z:-0.02}, 'foot_r.rotation':{x:0.644, y:0.251, z:0.212}, 'ball_r.rotation':{x:0.638, y:-0.034, z:-0.001}
        }
      },

      'sitting': {
        sitting: true, lying: true,
        props: {
          'pelvis.position':{x:0, y:0.117, z:0.005}, 'pelvis.rotation':{x:-0.411, y:-0.049, z:0.056}, 'spine_01.rotation':{x:0.45, y:-0.039, z:-0.116}, 'spine_02.rotation':{x:0.092, y:-0.076, z:0.08}, 'spine_03.rotation':{x:0.073, y:0.035, z:0.066}, 'neck_01.rotation':{x:0.051, y:0.053, z:-0.079}, 'head.rotation':{x:-0.169, y:0.009, z:0.034}, 'clavicle_l.rotation':{x:1.756, y:-0.037, z:-1.301}, 'upperarm_l.rotation':{x:-0.098, y:0.016, z:1.006}, 'lowerarm_l.rotation':{x:-0.089, y:0.08, z:0.837}, 'hand_l.rotation':{x:0.262, y:-0.399, z:0.3}, 'thumb_01_l.rotation':{x:0.149, y:-0.043, z:0.452}, 'thumb_02_l.rotation':{x:0.032, y:0.006, z:-0.162}, 'thumb_03_l.rotation':{x:-0.086, y:-0.005, z:-0.069}, 'index_01_l.rotation':{x:0.145, y:0.032, z:-0.069}, 'index_02_l.rotation':{x:0.325, y:-0.001, z:-0.004}, 'index_03_l.rotation':{x:0.253, y:0, z:-0.003}, 'middle_01_l.rotation':{x:0.186, y:-0.051, z:-0.091}, 'middle_02_l.rotation':{x:0.42, y:-0.003, z:-0.011}, 'middle_03_l.rotation':{x:0.153, y:0.001, z:-0.001}, 'ring_01_l.rotation':{x:0.087, y:-0.19, z:-0.078}, 'ring_02_l.rotation':{x:0.488, y:-0.004, z:-0.005}, 'ring_03_l.rotation':{x:0.183, y:-0.001, z:-0.012}, 'pinky_01_l.rotation':{x:0.205, y:-0.262, z:0.051}, 'pinky_02_l.rotation':{x:0.407, y:-0.002, z:-0.004}, 'pinky_03_l.rotation':{x:0.068, y:0, z:-0.002}, 'clavicle_r.rotation':{x:1.619, y:-0.139, z:1.179}, 'upperarm_r.rotation':{x:0.17, y:-0.037, z:-1.07}, 'lowerarm_r.rotation':{x:-0.044, y:-0.056, z:-0.665}, 'hand_r.rotation':{x:0.278, y:0.454, z:-0.253}, 'thumb_01_r.rotation':{x:0.173, y:0.089, z:-0.584}, 'thumb_02_r.rotation':{x:-0.003, y:-0.004, z:0.299}, 'thumb_03_r.rotation':{x:-0.133, y:-0.002, z:0.235}, 'index_01_r.rotation':{x:0.393, y:-0.023, z:0.108}, 'index_02_r.rotation':{x:0.391, y:0.001, z:0.004}, 'index_03_r.rotation':{x:0.326, y:0, z:0.003}, 'middle_01_r.rotation':{x:0.285, y:0.062, z:0.086}, 'middle_02_r.rotation':{x:0.519, y:0.003, z:0.011}, 'middle_03_r.rotation':{x:0.252, y:-0.001, z:0.001}, 'ring_01_r.rotation':{x:0.207, y:0.122, z:0.155}, 'ring_02_r.rotation':{x:0.597, y:0.004, z:0.005}, 'ring_03_r.rotation':{x:0.292, y:0.001, z:0.012}, 'pinky_01_r.rotation':{x:0.338, y:0.171, z:0.149}, 'pinky_02_r.rotation':{x:0.533, y:0.002, z:0.004}, 'pinky_03_r.rotation':{x:0.194, y:0, z:0.002}, 'thigh_l.rotation':{x:-1.957, y:0.083, z:-2.886}, 'calf_l.rotation':{x:-1.46, y:0.123, z:0.005}, 'foot_l.rotation':{x:-0.013, y:0.016, z:0.09}, 'ball_l.rotation':{x:0.744, y:0, z:0}, 'thigh_r.rotation':{x:-1.994, y:0.125, z:2.905}, 'calf_r.rotation':{x:-1.5, y:-0.202, z:-0.006}, 'foot_r.rotation':{x:-0.012, y:-0.065, z:0.081}, 'ball_r.rotation':{x:0.758, y:0, z:0}
        }
      }
    };

    // Gestures | useless
    // NOTE: For one hand gestures, use left left
    this.gestureTemplates = {
      'default': {
        'clavicle_l.rotation':{x:0,y:0,z:0}, 'upperarm_l.rotation':{x:0,y:0,z:0}, 'lowerarm_l.rotation':{x:0,y:0,z:0}, 'hand_l.rotation':{x:0,y:0,z:0}, 'thumb_01_l.rotation':{x:0,y:0,z:0}, 'thumb_02_l.rotation':{x:0,y:0,z:0}, 'thumb_03_l.rotation':{x:0,y:0,z:0}, 'index_01_l.rotation':{x:0,y:0,z:0}, 'index_02_l.rotation':{x:0,y:0,z:0}, 'index_03_l.rotation':{x:0,y:0,z:0}, 'middle_01_l.rotation':{x:0,y:0,z:0}, 'middle_02_l.rotation':{x:0,y:0,z:0}, 'middle_03_l.rotation':{x:0,y:0,z:0}, 'ring_01_l.rotation':{x:0,y:0,z:0}, 'ring_02_l.rotation':{x:0,y:0,z:0}, 'ring_03_l.rotation':{x:0,y:0,z:0}, 'pinky_01_l.rotation':{x:0,y:0,z:0}, 'pinky_02_l.rotation':{x:0,y:0,z:0}, 'pinky_03_l.rotation':{x:0,y:0,z:0}
      },
      'handup': {
        'clavicle_l.rotation':{x:[1.5,2,1,2], y:[0.2,0.4,1,2], z:[-1.5,-1.3,1,2]}, 'upperarm_l.rotation':{x:[1.5,1.7,1,2], y:[-0.6,-0.4,1,2], z:[1,1.2,1,2]}, 'lowerarm_l.rotation':{x:-0.815, y:[-0.4,0,1,2], z:1.575}, 'hand_l.rotation':{x:-0.529, y:-0.2, z:0.022}, 'thumb_01_l.rotation':{x:0.745, y:-0.526, z:0.604}, 'thumb_02_l.rotation':{x:-0.107, y:-0.01, z:-0.142}, 'thumb_03_l.rotation':{x:0, y:0.001, z:0}, 'index_01_l.rotation':{x:-0.126, y:-0.035, z:-0.087}, 'index_02_l.rotation':{x:0.255, y:0.007, z:-0.085}, 'index_03_l.rotation':{x:0, y:0, z:0}, 'middle_01_l.rotation':{x:-0.019, y:-0.128, z:-0.082}, 'middle_02_l.rotation':{x:0.233, y:0.019, z:-0.074}, 'middle_03_l.rotation':{x:0, y:0, z:0}, 'ring_01_l.rotation':{x:0.005, y:-0.241, z:-0.122}, 'ring_02_l.rotation':{x:0.261, y:0.021, z:-0.076}, 'ring_03_l.rotation':{x:0, y:0, z:0}, 'pinky_01_l.rotation':{x:0.059, y:-0.336, z:-0.2}, 'pinky_02_l.rotation':{x:0.153, y:0.019, z:0.001}, 'pinky_03_l.rotation':{x:0, y:0, z:0}
      },
      'index': {
        'clavicle_l.rotation':{x:[1.5,2,1,2], y:[0.2,0.4,1,2], z:[-1.5,-1.3,1,2]}, 'upperarm_l.rotation':{x:[1.5,1.7,1,2], y:[-0.6,-0.4,1,2], z:[1,1.2,1,2]}, 'lowerarm_l.rotation':{x:-0.815, y:[-0.4,0,1,2], z:1.575}, 'hand_l.rotation':{x:-0.276, y:-0.506, z:-0.208}, 'thumb_01_l.rotation':{x:0.579, y:0.228, z:0.363}, 'thumb_02_l.rotation':{x:-0.027, y:-0.04, z:-0.662}, 'thumb_03_l.rotation':{x:0, y:0.001, z:0}, 'index_01_l.rotation':{x:0, y:-0.105, z:0.225}, 'index_02_l.rotation':{x:0.256, y:-0.103, z:-0.213}, 'index_03_l.rotation':{x:0, y:0, z:0}, 'middle_01_l.rotation':{x:1.453, y:0.07, z:0.021}, 'middle_02_l.rotation':{x:1.599, y:0.062, z:0.07}, 'middle_03_l.rotation':{x:0, y:0, z:0}, 'ring_01_l.rotation':{x:1.528, y:-0.073, z:0.052}, 'ring_02_l.rotation':{x:1.386, y:0.044, z:0.053}, 'ring_03_l.rotation':{x:0, y:0, z:0}, 'pinky_01_l.rotation':{x:1.65, y:-0.204, z:0.031}, 'pinky_02_l.rotation':{x:1.302, y:0.071, z:0.085}, 'pinky_03_l.rotation':{x:0, y:0, z:0}
      },
      'ok': {
        'clavicle_l.rotation':{x:[1.5,2,1,2], y:[0.2,0.4,1,2], z:[-1.5,-1.3,1,2]}, 'upperarm_l.rotation':{x:[1.5,1.7,1,1], y:[-0.6,-0.4,1,2], z:[1,1.2,1,2]}, 'lowerarm_l.rotation':{x:-0.415, y:[-0.4,0,1,2], z:1.575}, 'hand_l.rotation':{x:-0.476, y:-0.506, z:-0.208}, 'thumb_01_l.rotation':{x:0.703, y:0.445, z:0.899}, 'thumb_02_l.rotation':{x:-0.312, y:-0.04, z:-0.938}, 'thumb_03_l.rotation':{x:-0.37, y:0.024, z:-0.393}, 'index_01_l.rotation':{x:0.8, y:-0.086, z:-0.091}, 'index_02_l.rotation':{x:1.123, y:-0.046, z:-0.074}, 'index_03_l.rotation':{x:0.562, y:-0.013, z:-0.043}, 'middle_01_l.rotation':{x:-0.019, y:-0.128, z:-0.082}, 'middle_02_l.rotation':{x:0.233, y:0.019, z:-0.074}, 'middle_03_l.rotation':{x:0, y:0, z:0}, 'ring_01_l.rotation':{x:0.005, y:-0.241, z:-0.122}, 'ring_02_l.rotation':{x:0.261, y:0.021, z:-0.076}, 'ring_03_l.rotation':{x:0, y:0, z:0}, 'pinky_01_l.rotation':{x:0.059, y:-0.336, z:-0.2}, 'pinky_02_l.rotation':{x:0.153, y:0.019, z:0.001}, 'pinky_03_l.rotation':{x:0, y:0, z:0}
      },
      'thumbup': {
        'clavicle_l.rotation':{x:[1.5,2,1,2], y:[0.2,0.4,1,2], z:[-1.5,-1.3,1,2]}, 'upperarm_l.rotation':{x:[1.5,1.7,1,2], y:[-0.6,-0.4,1,2], z:[1,1.2,1,2]}, 'lowerarm_l.rotation':{x:-0.415, y:0.206, z:1.575}, 'hand_l.rotation':{x:-0.276, y:-0.506, z:-0.208}, 'thumb_01_l.rotation':{x:0.208, y:-0.189, z:0.685}, 'thumb_02_l.rotation':{x:0.129, y:-0.285, z:-0.163}, 'thumb_03_l.rotation':{x:-0.047, y:0.068, z:0.401}, 'index_01_l.rotation':{x:1.412, y:-0.102, z:-0.152}, 'index_02_l.rotation':{x:1.903, y:-0.16, z:-0.114}, 'index_03_l.rotation':{x:0.535, y:-0.017, z:-0.062}, 'middle_01_l.rotation':{x:1.424, y:-0.103, z:-0.12}, 'middle_02_l.rotation':{x:1.919, y:-0.162, z:-0.114}, 'middle_03_l.rotation':{x:0.44, y:-0.012, z:-0.051}, 'ring_01_l.rotation':{x:1.619, y:-0.127, z:-0.053}, 'ring_02_l.rotation':{x:1.898, y:-0.16, z:-0.115}, 'ring_03_l.rotation':{x:0.262, y:-0.004, z:-0.031}, 'pinky_01_l.rotation':{x:1.661, y:-0.131, z:-0.016}, 'pinky_02_l.rotation':{x:1.715, y:-0.067, z:-0.13}, 'pinky_03_l.rotation':{x:0.627, y:-0.023, z:-0.071}
      },
      'thumbdown': {
        'clavicle_l.rotation':{x:[1.5,2,1,2], y:[0.2,0.4,1,2], z:[-1.5,-1.3,1,2]}, 'upperarm_l.rotation':{x:[1.5,1.7,1,2], y:[-0.6,-0.4,1,2], z:[1,1.2,1,2]}, 'lowerarm_l.rotation':{x:-2.015, y:0.406, z:1.575}, 'hand_l.rotation':{x:-0.176, y:-0.206, z:-0.208}, 'thumb_01_l.rotation':{x:0.208, y:-0.189, z:0.685}, 'thumb_02_l.rotation':{x:0.129, y:-0.285, z:-0.163}, 'thumb_03_l.rotation':{x:-0.047, y:0.068, z:0.401}, 'index_01_l.rotation':{x:1.412, y:-0.102, z:-0.152}, 'index_02_l.rotation':{x:1.903, y:-0.16, z:-0.114}, 'index_03_l.rotation':{x:0.535, y:-0.017, z:-0.062}, 'middle_01_l.rotation':{x:1.424, y:-0.103, z:-0.12}, 'middle_02_l.rotation':{x:1.919, y:-0.162, z:-0.114}, 'middle_03_l.rotation':{x:0.44, y:-0.012, z:-0.051}, 'ring_01_l.rotation':{x:1.619, y:-0.127, z:-0.053}, 'ring_02_l.rotation':{x:1.898, y:-0.16, z:-0.115}, 'ring_03_l.rotation':{x:0.262, y:-0.004, z:-0.031}, 'pinky_01_l.rotation':{x:1.661, y:-0.131, z:-0.016}, 'pinky_02_l.rotation':{x:1.715, y:-0.067, z:-0.13}, 'pinky_03_l.rotation':{x:0.627, y:-0.023, z:-0.071}
      },
      'side': {
        'clavicle_l.rotation':{x:1.755, y:-0.035, z:-1.63}, 'upperarm_l.rotation':{x:1.263, y:-0.955, z:1.024}, 'lowerarm_l.rotation':{x:0, y:0, z:0.8}, 'hand_l.rotation':{x:-0.36, y:-1.353, z:-0.184}, 'thumb_01_l.rotation':{x:0.137, y:-0.049, z:0.863}, 'thumb_02_l.rotation':{x:-0.293, y:0.153, z:-0.193}, 'thumb_03_l.rotation':{x:-0.271, y:-0.17, z:0.18}, 'index_01_l.rotation':{x:-0.018, y:0.007, z:0.28}, 'index_02_l.rotation':{x:0.247, y:-0.003, z:-0.025}, 'index_03_l.rotation':{x:0.13, y:-0.001, z:-0.013}, 'middle_01_l.rotation':{x:0.333, y:-0.015, z:0.182}, 'middle_02_l.rotation':{x:0.313, y:-0.005, z:-0.032}, 'middle_03_l.rotation':{x:0.294, y:-0.004, z:-0.03}, 'ring_01_l.rotation':{x:0.456, y:-0.028, z:-0.092}, 'ring_02_l.rotation':{x:0.53, y:-0.014, z:-0.052}, 'ring_03_l.rotation':{x:0.478, y:-0.012, z:-0.047}, 'pinky_01_l.rotation':{x:0.647, y:-0.049, z:-0.184}, 'pinky_02_l.rotation':{x:0.29, y:-0.004, z:-0.029}, 'pinky_03_l.rotation':{x:0.501, y:-0.013, z:-0.049}
      },
      'shrug': {
        'neck_01.rotation':{x:[-0.3,0.3,1,2], y:[-0.3,0.3,1,2], z:[-0.1,0.1]}, 'head.rotation':{x:[-0.3,0.3], y:[-0.3,0.3], z:[-0.1,0.1]}, 'clavicle_r.rotation':{x:1.732, y:-0.058, z:1.407}, 'upperarm_r.rotation':{x:1.305, y:0.46, z:0.118}, 'lowerarm_r.rotation':{x:[0,2.0], y:[-1,0.2], z:-1.637}, 'hand_r.rotation':{x:-0.048, y:0.165, z:-0.39}, 'thumb_01_r.rotation':{x:1.467, y:0.599, z:-1.315}, 'thumb_02_r.rotation':{x:-0.255, y:-0.123, z:0.119}, 'thumb_03_r.rotation':{x:0, y:-0.002, z:0}, 'index_01_r.rotation':{x:-0.293, y:-0.066, z:-0.112}, 'index_02_r.rotation':{x:0.181, y:0.007, z:0.069}, 'index_03_r.rotation':{x:0, y:0, z:0}, 'middle_01_r.rotation':{x:-0.063, y:-0.041, z:0.032}, 'middle_02_r.rotation':{x:0.149, y:0.005, z:0.05}, 'middle_03_r.rotation':{x:0, y:0, z:0}, 'ring_01_r.rotation':{x:0.152, y:-0.03, z:0.132}, 'ring_02_r.rotation':{x:0.194, y:0.007, z:0.058}, 'ring_03_r.rotation':{x:0, y:0, z:0}, 'pinky_01_r.rotation':{x:0.306, y:-0.015, z:0.257}, 'pinky_02_r.rotation':{x:0.15, y:-0.003, z:-0.003}, 'pinky_03_r.rotation':{x:0, y:0, z:0}, 'clavicle_l.rotation':{x:1.713, y:0.141, z:-1.433}, 'upperarm_l.rotation':{x:1.136, y:-0.422, z:-0.416}, 'lowerarm_l.rotation':{x:1.42, y:0.123, z:1.506}, 'hand_l.rotation':{x:0.073, y:-0.138, z:0.064}, 'thumb_01_l.rotation':{x:1.467, y:-0.599, z:1.314}, 'thumb_02_l.rotation':{x:-0.255, y:0.123, z:-0.119}, 'thumb_03_l.rotation':{x:0, y:0.001, z:0}, 'index_01_l.rotation':{x:-0.293, y:0.066, z:0.112}, 'index_02_l.rotation':{x:0.181, y:-0.007, z:-0.069}, 'index_03_l.rotation':{x:0, y:0, z:0}, 'middle_01_l.rotation':{x:-0.062, y:0.041, z:-0.032}, 'middle_02_l.rotation':{x:0.149, y:-0.005, z:-0.05}, 'middle_03_l.rotation':{x:0, y:0, z:0}, 'ring_01_l.rotation':{x:0.152, y:0.03, z:-0.132}, 'ring_02_l.rotation':{x:0.194, y:-0.007, z:-0.058}, 'ring_03_l.rotation':{x:0, y:0, z:0}, 'pinky_01_l.rotation':{x:0.306, y:0.015, z:-0.257}, 'pinky_02_l.rotation':{x:0.15, y:0.003, z:0.003}, 'pinky_03_l.rotation':{x:0, y:0, z:0}
      },
      'namaste': {
        'clavicle_r.rotation':{x:1.758, y:0.099, z:1.604}, 'upperarm_r.rotation':{x:0.862, y:-0.292, z:-0.932}, 'lowerarm_r.rotation':{x:0.083, y:0.066, z:-1.791}, 'hand_r.rotation':{x:-0.52, y:-0.001, z:-0.176}, 'thumb_01_r.rotation':{x:0.227, y:0.418, z:-0.776}, 'thumb_02_r.rotation':{x:-0.011, y:-0.003, z:0.171}, 'thumb_03_r.rotation':{x:-0.041, y:-0.001, z:-0.013}, 'index_01_r.rotation':{x:-0.236, y:0.003, z:-0.028}, 'index_02_r.rotation':{x:0.004, y:0, z:0.001}, 'index_03_r.rotation':{x:0.002, y:0, z:0}, 'middle_01_r.rotation':{x:-0.236, y:0.003, z:-0.028}, 'middle_02_r.rotation':{x:0.004, y:0, z:0.001}, 'middle_03_r.rotation':{x:0.002, y:0, z:0}, 'ring_01_r.rotation':{x:-0.236, y:0.003, z:-0.028}, 'ring_02_r.rotation':{x:0.004, y:0, z:0.001}, 'ring_03_r.rotation':{x:0.002, y:0, z:0}, 'pinky_01_r.rotation':{x:-0.236, y:0.003, z:-0.028}, 'pinky_02_r.rotation':{x:0.004, y:0, z:0.001}, 'pinky_03_r.rotation':{x:0.002, y:0, z:0}, 'clavicle_l.rotation':{x:1.711, y:-0.002, z:-1.625}, 'upperarm_l.rotation':{x:0.683, y:0.334, z:0.977}, 'lowerarm_l.rotation':{x:0.086, y:-0.066, z:1.843}, 'hand_l.rotation':{x:-0.595, y:-0.229, z:0.096}, 'thumb_01_l.rotation':{x:0.404, y:-0.05, z:0.537}, 'thumb_02_l.rotation':{x:-0.02, y:0.004, z:-0.154}, 'thumb_03_l.rotation':{x:-0.049, y:0.002, z:-0.019}, 'index_01_l.rotation':{x:-0.113, y:-0.001, z:0.014}, 'index_02_l.rotation':{x:0.003, y:0, z:0}, 'index_03_l.rotation':{x:0.002, y:0, z:0}, 'middle_01_l.rotation':{x:-0.113, y:-0.001, z:0.014}, 'middle_02_l.rotation':{x:0.004, y:0, z:0}, 'middle_03_l.rotation':{x:0.002, y:0, z:0}, 'ring_01_l.rotation':{x:-0.113, y:-0.001, z:0.014}, 'ring_02_l.rotation':{x:0.003, y:0, z:0}, 'ring_03_l.rotation':{x:0.002, y:0, z:0}, 'pinky_01_l.rotation':{x:-0.122, y:-0.001, z:-0.057}, 'pinky_02_l.rotation':{x:0.012, y:0.001, z:0.07}, 'pinky_03_l.rotation':{x:0.002, y:0, z:0}
      }
    }


    // Pose deltas
    // NOTE: In this object (x,y,z) are always Euler rotations despite the name!!
    // NOTE: This object should include all the used delta properties.
    // Pose deltas
    // NOTE: In this object (x,y,z) are always Euler rotations despite the name!!
    // NOTE: This object should include all the used delta properties.
    this.poseDelta = {
      props: {
        'pelvis.quaternion':{x:0, y:0, z:0},'spine_01.quaternion':{x:0, y:0, z:0},
        'spine_02.quaternion':{x:0, y:0, z:0}, 'neck_01.quaternion':{x:0, y:0, z:0},
        'head.quaternion':{x:0, y:0, z:0}, 'spine_02.scale':{x:0, y:0, z:0},
        'neck_01.scale':{x:0, y:0, z:0}, 
        'upperarm_l.scale':{x:0, y:0, z:0}, 'upperarm_r.scale':{x:0, y:0, z:0},
        // 'thigh_l':{x:0,y:0,z:0}, 'thigh_r':{x:0,y:0,z:0},
      }
    };
    // Add legs, arms and hands
    ['_l','_r'].forEach( x => {
      ['calf', 'thigh', 'upperarm', 'lowerarm', 'hand'].forEach( y => {
        this.poseDelta.props[y+x+'.quaternion'] = {x:0, y:0, z:0};
      });
      ['thumb', 'index', 'middle', 'ring', 'pinky'].forEach( y => {
        this.poseDelta.props[y+'_01'+x+'.quaternion'] = {x:0, y:0, z:0};
        this.poseDelta.props[y+'_02'+x+'.quaternion'] = {x:0, y:0, z:0};
        this.poseDelta.props[y+'_03'+x+'.quaternion'] = {x:0, y:0, z:0};
      });
    })

    // Default Animations filter
    Object.keys(this.poseTransfer).forEach( x => { 
      if (this.poseTransfer[x] === '') this.poseTransfer[x] == ['standby2', 'standby0', 'standby2', 'standby1', 'standby2'][Math.floor( Math.random() * 5 )];
    });

    // Dynamically pick up all the property names that we need in the code
    const names = new Set();
    Object.values(this.poseTemplates).forEach( x => {
      Object.keys( this.propsToThreeObjects(x.props) ).forEach( y => names.add(y) );
    });
    Object.keys( this.poseDelta.props ).forEach( x => {
      names.add(x)
    });
    this.posePropNames = [...names];

    this.useEyeContace = true; // wheather to use eye contact or not 「应该直接可以了」
    this.GLBmotion = true;
    this.GLBdefaultPose = './animations/U_Idle_01_Short04_Cycle_test.glb';
    this.GLBmotionList = []; // store GLB default animations as this.GLBmotion set to TRUE;
    // if this.GLBmotion is set to TRUE, execute this list instead of previous animation list / UE list;


    // Use "side" as the first pose, weight on left leg
    this.poseName = "default";
    this.poseWeightOnLeft = true; // Initial weight on left leg
    this.gesture = null; // Values that override pose properties
    this.poseCurrentTemplate = this.poseTemplates[this.poseName];
    // default pose params ↓
    this.poseBase = this.poseFactory( this.poseCurrentTemplate );
    this.poseTarget = this.poseFactory( this.poseCurrentTemplate );
    this.poseStraight = this.propsToThreeObjects( this.poseTemplates["straight"].props ); // Straight pose used as a reference
    this.poseAvatar = null; // Set when avatar has been loaded

    // Avatar height in meters
    // NOTE: The actual value is calculated based on the eye level on avatar load
    this.avatarHeight = 1.2;


    // Animation templates
    //
    // baseline: Describes morph target baseline. Values can be either float or
    //           an array [start,end,skew] describing a probability distribution.
    // speech  : Describes voice rate, pitch and volume as deltas to the values
    //           set as options.
    // anims   : Animations for breathing, pose, etc. To be used animation
    //           sequence is selected in the following order:
    //           1. State (idle, speaking, listening)
    //           2. Mood (moodX, moodY)
    //           3. Pose (poseX, poseY)
    //           5. View (full, upper, head)
    //           6. Body form ('M','F')
    //           7. Alt (sequence of objects with propabilities p. If p is not
    //              specified, the remaining part is shared equivally among
    //              the rest.)
    //           8. Current object
    // object  : delay, delta times dt and values vs.
    //

    this.animTemplateEyes = { name: 'eyes',
      idle: { alt: [
        {
          p: () => ( this.avatar?.hasOwnProperty('avatarIdleEyeContact') ? this.avatar.avatarIdleEyeContact : this.opt.avatarIdleEyeContact ),
          delay: [200,5000], dt: [ 200,[2000,5000],[3000,10000,1,2] ],
          vs: {
            headMove: [ this.avatar?.hasOwnProperty('avatarIdleHeadMove') ? this.avatar.avatarIdleHeadMove : this.opt.avatarIdleHeadMove ],
            eyesRotateY: [[-0.6,0.6]], eyesRotateX: [[-0.2,0.6]],
            eyeContact: [null,1]
          }
        },
        {
          delay: [200,5000], dt: [ 200,[2000,5000,1,2] ], vs: {
            headMove: [ this.avatar?.hasOwnProperty('avatarIdleHeadMove') ? this.avatar.avatarIdleHeadMove : this.opt.avatarIdleHeadMove ],
            eyesRotateY: [[-0.6,0.6]], eyesRotateX: [[-0.2,0.6]]
          }
        }
      ]},
      speaking: { alt: [
        {
          p: () => ( this.avatar?.hasOwnProperty('avatarSpeakingEyeContact') ? this.avatar.avatarSpeakingEyeContact : this.opt.avatarSpeakingEyeContact ),
          delay: [200,5000], dt: [ 0, [3000,10000,1,2], [2000,5000] ],
          vs: { eyeContact: [1,null],
            headMove: [null,( this.avatar?.hasOwnProperty('avatarSpeakingHeadMove') ? this.avatar.avatarSpeakingHeadMove : this.opt.avatarSpeakingHeadMove ),null],
            eyesRotateY: [null,[-0.6,0.6]], eyesRotateX: [null,[-0.2,0.6]]
          }
        },
        {
          delay: [200,5000], dt: [ 200,[2000,5000,1,2] ], vs: {
            headMove: [( this.avatar?.hasOwnProperty('avatarSpeakingHeadMove') ? this.avatar.avatarSpeakingHeadMove : this.opt.avatarSpeakingHeadMove ),null],
            eyesRotateY: [[-0.6,0.6]], eyesRotateX: [[-0.2,0.6]]
          }
        }
      ]}
    };
    this.animTemplateBlink = { name: 'blink', alt: [
      { p: 0.85, delay: [1000,8000,1,2], dt: [50,[100,300],100], vs: { EyeBlinkLeft: [1,1,0], EyeBlinkRight: [1,1,0] } },
      { delay: [1000,4000,1,2], dt: [50,[100,200],100,[10,400,0],50,[100,200],100], vs: { EyeBlinkLeft: [1,1,0,0,1,1,0], EyeBlinkRight: [1,1,0,0,1,1,0] } }
    ]};

    this.breath_factor = 0.4;
    this.animMoods = {
      'neutral' : {
        baseline: { eyesLookDown: 0.1 },
        speech: { deltaRate: 0, deltaPitch: 0, deltaVolume: 0 },
        anims: [
          { name: 'breathing', delay: 1500, dt: [ 1200,500,1000 ], vs: { chestInhale: [0.5 * this.breath_factor,0.5 * this.breath_factor,0] } },
          this.animTemplateEyes,
          this.animTemplateBlink,
        ]
      },
      'happy' : {
        baseline: { mouthSmile: 0.2, eyesLookDown: 0.1 },
        speech: { deltaRate: 0, deltaPitch: 0.1, deltaVolume: 0 },
        anims: [
          { name: 'breathing', delay: 1500, dt: [ 1200,500,1000 ], vs: { chestInhale: [0.5 * this.breath_factor,0.5 * this.breath_factor,0] } },
          this.animTemplateEyes,
          this.animTemplateBlink,
        ]
      },
      'angry' : {
        baseline: { eyesLookDown: 0.1, BrowDownLeft: 0.6, BrowDownRight: 0.6, jawForward: 0.3, mouthFrownLeft: 0.7, mouthFrownRight: 0.7, MouthRollLower: 0.2, mouthShrugLower: 0.3, handFistLeft: 1, handFistRight: 1 },
        speech: { deltaRate: -0.2, deltaPitch: 0.2, deltaVolume: 0 },
        anims: [
          { name: 'breathing', delay: 500, dt: [ 1000,500,1000 ], vs: { chestInhale: [0.7 * this.breath_factor,0.7 * this.breath_factor,0] } },
          this.animTemplateEyes,
          this.animTemplateBlink,
        ]
      },
      'sad' : {
        baseline: { eyesLookDown: 0.2, BrowDownRight: 0.1, browInnerUp: 0.6, BrowOuterUpRight: 0.2, eyeSquintLeft: 0.7, eyeSquintRight: 0.7, mouthFrownLeft: 0.8, mouthFrownRight: 0.8, MouthLeft: 0.2, mouthPucker: 0.5, MouthRollLower: 0.2, MouthRollUpper: 0.2, mouthShrugLower: 0.2, mouthShrugUpper: 0.2, MouthStretchLeft: 0.4 },
        speech: { deltaRate: -0.2, deltaPitch: -0.2, deltaVolume: 0 },
        anims: [
          { name: 'breathing', delay: 1500, dt: [ 1000,500,1000 ], vs: { chestInhale: [0.3 * this.breath_factor,0.3 * this.breath_factor,0] } },
          this.animTemplateEyes,
          this.animTemplateBlink,
        ]
      },
      'fear' : {
        baseline: { browInnerUp: 0.7, eyeSquintLeft: 0.5, eyeSquintRight: 0.5, eyeWideLeft: 0.6, eyeWideRight: 0.6, mouthClose: 0.1, mouthFunnel: 0.3, mouthShrugLower: 0.5, mouthShrugUpper: 0.5 },
        speech: { deltaRate: -0.2, deltaPitch: 0, deltaVolume: 0 },
        anims: [
          { name: 'breathing', delay: 500, dt: [ 1000,500,1000 ], vs: { chestInhale: [0.7 * this.breath_factor,0.7 * this.breath_factor,0] } },
          this.animTemplateEyes,
          this.animTemplateBlink,
        ]
      },
      'disgust' : {
        baseline: { BrowDownLeft: 0.7, BrowDownRight: 0.1, browInnerUp: 0.3, eyeSquintLeft: 1, eyeSquintRight: 1, eyeWideLeft: 0.5, eyeWideRight: 0.5, eyesRotateX: 0.05, MouthLeft: 0.4, MouthPressLeft: 0.3, MouthRollLower: 0.3, mouthShrugLower: 0.3, mouthShrugUpper: 0.8, mouthUpperUpLeft: 0.3, NoseSneerLeft: 1, NoseSneerRight: 0.7 },
        speech: { deltaRate: -0.2, deltaPitch: 0, deltaVolume: 0 },
        anims: [
          { name: 'breathing', delay: 1500, dt: [ 1000,500,1000 ], vs: { chestInhale: [0.5 * this.breath_factor,0.5 * this.breath_factor,0] } },
          this.animTemplateEyes,
          this.animTemplateBlink,
        ]
      },
      'love' : {
        baseline: { browInnerUp: 0.4, BrowOuterUpLeft: 0.2, BrowOuterUpRight: 0.2, mouthSmile: 0.2, EyeBlinkLeft: 0.6, EyeBlinkRight: 0.6, eyeWideLeft: 0.7, eyeWideRight: 0.7, bodyRotateX: 0.1, MouthDimpleLeft: 0.1, MouthDimpleRight: 0.1, MouthPressLeft: 0.2, mouthShrugUpper: 0.2, mouthUpperUpLeft: 0.1, mouthUpperUpRight: 0.1 },
        speech: { deltaRate: -0.1, deltaPitch: -0.7, deltaVolume: 0 },
        anims: [
          { name: 'breathing', delay: 1500, dt: [ 1500,500,1500 ], vs: { chestInhale: [0.8 * this.breath_factor,0.8 * this.breath_factor,0] } },
          this.animTemplateEyes,
          this.deepCopy(this.animTemplateBlink,(o) => { o.alt[0].delay[0] = o.alt[1].delay[0] = 2000; }),
        ]
      },
      // 'sleep' : {
      //   baseline: { EyeBlinkLeft: 1, EyeBlinkRight: 1, eyesClosed: 0.6 },
      //   speech: { deltaRate: 0, deltaPitch: -0.2, deltaVolume: 0 },
      //   anims: [
      //     { name: 'breathing', delay: 1500, dt: [ 1000,500,1000 ], vs: { chestInhale: [0.6 * this.breath_factor,0.6 * this.breath_factor,0] } },
      //     { name: 'eyes', delay: 10010, dt: [], vs: {} },
      //     { name: 'blink', delay: 10020, dt: [], vs: {} },
      //     { name: 'mouth', delay: 10030, dt: [], vs: {} },
      //   ]
      // }
    };
    this.moodName = this.opt.avatarMood || "neutral";
    this.mood = this.animMoods[ this.moodName ];
    if ( !this.mood ) {
      this.moodName = "neutral";
      this.mood = this.animMoods["neutral"];
    }

    // Animation templates for emojis
    this.animEmojis = {

      '😐': { dt: [300,2000], rescale: [0,1], vs: { browInnerUp: [0.4], eyeWideLeft: [0.7], eyeWideRight: [0.7], MouthPressLeft: [0.6], MouthPressRight: [0.6], MouthRollLower: [0.3], MouthStretchLeft: [1], MouthStretchRight: [1] } },
      '😶': { link:  '😐' },
      '😏': { dt: [300,2000], rescale: [0,1], vs: { eyeContact: [0], BrowDownRight: [0.1], browInnerUp: [0.7], BrowOuterUpRight: [0.2], EyeLookInRight: [0.7], EyeLookOutLeft: [0.7], eyeSquintLeft: [1], eyeSquintRight: [0.8], eyesRotateY: [0.7], MouthLeft: [0.4], mouthPucker: [0.4], mouthShrugLower: [0.3], mouthShrugUpper: [0.2], mouthSmile: [0.2], mouthSmileLeft: [0.4], mouthSmileRight: [0.2], MouthStretchLeft: [0.5], mouthUpperUpLeft: [0.6], NoseSneerLeft: [0.7] } },
      '🙂': { dt: [300,2000], rescale: [0,1], vs: { mouthSmile: [0.5] } },
      '🙃': { link:  '🙂' },
      '😊': { dt: [300,2000], rescale: [0,1], vs: { browInnerUp: [0.6], eyeSquintLeft: [1], eyeSquintRight: [1], mouthSmile: [0.7], NoseSneerLeft: [0.7], NoseSneerRight: [0.7]} },
      '😇': { link:  '😊' },
      '😀': { dt: [300,2000], rescale: [0,1], vs: { browInnerUp: [0.6], jawOpen: [0.1], MouthDimpleLeft: [0.2], MouthDimpleRight: [0.2], mouthOpen: [0.3], MouthPressLeft: [0.3], MouthPressRight: [0.3], MouthRollLower: [0.4], mouthShrugUpper: [0.4], mouthSmile: [0.7], mouthUpperUpLeft: [0.3], mouthUpperUpRight: [0.3], NoseSneerLeft: [0.4], NoseSneerRight: [0.4] }},
      '😃': { dt: [300,2000], rescale: [0,1], vs: { browInnerUp: [0.6], eyeWideLeft: [0.7], eyeWideRight: [0.7], jawOpen: [0.1], MouthDimpleLeft: [0.2], MouthDimpleRight: [0.2], mouthOpen: [0.3], MouthPressLeft: [0.3], MouthPressRight: [0.3], MouthRollLower: [0.4], mouthShrugUpper: [0.4], mouthSmile: [0.7], mouthUpperUpLeft: [0.3], mouthUpperUpRight: [0.3], NoseSneerLeft: [0.4], NoseSneerRight: [0.4] } },
      '😄': { dt: [300,2000], rescale: [0,1], vs: { browInnerUp: [0.3], eyeSquintLeft: [1], eyeSquintRight: [1], jawOpen: [0.2], MouthDimpleLeft: [0.2], MouthDimpleRight: [0.2], mouthOpen: [0.3], MouthPressLeft: [0.3], MouthPressRight: [0.3], MouthRollLower: [0.4], mouthShrugUpper: [0.4], mouthSmile: [0.7], mouthUpperUpLeft: [0.3], mouthUpperUpRight: [0.3], NoseSneerLeft: [0.4], NoseSneerRight: [0.4] } },
      '😁': { dt: [300,2000], rescale: [0,1], vs: { browInnerUp: [0.3], eyeSquintLeft: [1], eyeSquintRight: [1], jawOpen: [0.3], MouthDimpleLeft: [0.2], MouthDimpleRight: [0.2], MouthPressLeft: [0.5], MouthPressRight: [0.5], mouthShrugUpper: [0.4], mouthSmile: [0.7], mouthUpperUpLeft: [0.3], mouthUpperUpRight: [0.3], NoseSneerLeft: [0.4], NoseSneerRight: [0.4] } },
      '😆': { dt: [300,2000], rescale: [0,1], vs: { browInnerUp: [0.3], eyeSquintLeft: [1], eyeSquintRight: [1], eyesClosed: [0.6], jawOpen: [0.3], MouthDimpleLeft: [0.2], MouthDimpleRight: [0.2], MouthPressLeft: [0.5], MouthPressRight: [0.5], mouthShrugUpper: [0.4], mouthSmile: [0.7], mouthUpperUpLeft: [0.3], mouthUpperUpRight: [0.3], NoseSneerLeft: [0.4], NoseSneerRight: [0.4] } },
      '😝': { dt: [300,100,1500,500,500], rescale: [0,0,1,0,0], vs: { browInnerUp: [0.8], eyesClosed: [1], jawOpen: [0.7], mouthFunnel: [0.5], mouthSmile: [1], tongueOut: [0,1,1,0] } },
      '😋': { link:  '😝' }, '😛': { link:  '😝' }, '😛': { link:  '😝' }, '😜': { link:  '😝' }, '🤪': { link:  '😝' },
      '😂': { dt: [300,2000], rescale: [0,1], vs: { browInnerUp: [0.3], eyeSquintLeft: [1], eyeSquintRight: [1], eyesClosed: [0.6], jawOpen: [0.3], MouthDimpleLeft: [0.2], MouthDimpleRight: [0.2], MouthPressLeft: [0.5], MouthPressRight: [0.5], mouthShrugUpper: [0.4], mouthSmile: [0.7], mouthUpperUpLeft: [0.3], mouthUpperUpRight: [0.3], NoseSneerLeft: [0.4], NoseSneerRight: [0.4] } },
      '🤣': { link:  '😂' }, '😅': { link:  '😂' },
      '😉': { dt: [500,200,500,500], rescale: [0,0,0,1], vs: { mouthSmile: [0.5], mouthOpen: [0.2], mouthSmileLeft: [0,0.5,0], EyeBlinkLeft: [0,0.7,0], EyeBlinkRight: [0,0,0], bodyRotateX: [0.05,0.05,0.05,0], bodyRotateZ: [-0.05,-0.05,-0.05,0], BrowDownLeft: [0,0.7,0], CheekSquintLeft: [0,0.7,0], eyeSquintLeft: [0,1,0], eyesClosed: [0] } },

      '😭': { dt: [1000,1000], rescale: [0,1], vs: { browInnerUp: [1], eyeSquintLeft: [1], eyeSquintRight: [1], eyesClosed: [0.1], jawOpen: [0], mouthFrownLeft: [1], mouthFrownRight: [1], mouthOpen: [0.5], mouthPucker: [0.5], mouthUpperUpLeft: [0.6], mouthUpperUpRight: [0.6] } },
      '🥺': { dt: [1000,1000], rescale: [0,1], vs: { BrowDownLeft: [0.2], BrowDownRight: [0.2], browInnerUp: [1], eyeWideLeft: [0.9], eyeWideRight: [0.9], eyesClosed: [0.1], mouthClose: [0.2], mouthFrownLeft: [1], mouthFrownRight: [1], MouthPressLeft: [0.4], MouthPressRight: [0.4], mouthPucker: [1], MouthRollLower: [0.6], MouthRollUpper: [0.2], mouthUpperUpLeft: [0.8], mouthUpperUpRight: [0.8] } },
      '😞': { dt: [1000,1000], rescale: [0,1], vs: { browInnerUp: [0.7], eyeSquintLeft: [1], eyeSquintRight: [1], eyesClosed: [0.5], bodyRotateX: [0.3], mouthClose: [0.2], mouthFrownLeft: [1], mouthFrownRight: [1], mouthPucker: [1], MouthRollLower: [1], mouthShrugLower: [0.2], mouthUpperUpLeft: [0.8], mouthUpperUpRight: [0.8] } },
      '😔': { dt: [1000,1000], rescale: [0,1], vs: { browInnerUp: [1], eyeSquintLeft: [1], eyeSquintRight: [1], eyesClosed: [0.5], bodyRotateX: [0.3], mouthClose: [0.2], mouthFrownLeft: [1], mouthFrownRight: [1], MouthPressLeft: [0.4], MouthPressRight: [0.4], mouthPucker: [1], MouthRollLower: [0.6], MouthRollUpper: [0.2], mouthUpperUpLeft: [0.8], mouthUpperUpRight: [0.8] } },
      '😳': { dt: [1000,1000], rescale: [0,1], vs: { browInnerUp: [1], eyeWideLeft: [0.5], eyeWideRight: [0.5], eyesRotateY: [0.05], eyesRotateX: [0.05], mouthClose: [0.2], mouthFunnel: [0.5], mouthPucker: [0.4], MouthRollLower: [0.4], MouthRollUpper: [0.4] } },
      '☹️': { dt: [500,1500], rescale: [0,1], vs: { mouthFrownLeft: [1], mouthFrownRight: [1], mouthPucker: [0.1], MouthRollLower: [0.8] } },

      '😚': { dt: [500,1000,1000], rescale: [0,1,0], vs: { browInnerUp: [0.6], EyeBlinkLeft: [1], EyeBlinkRight: [1], eyeSquintLeft: [1], eyeSquintRight: [1], mouthPucker: [0,0.5], NoseSneerLeft: [0,0.7], NoseSneerRight: [0,0.7], viseme_U: [0,1] } },
      '😘': { dt: [500,500,200,500], rescale: [0,0,0,1], vs: { browInnerUp: [0.6], EyeBlinkLeft: [0,0,1,0], EyeBlinkRight: [0], eyesRotateY: [0], bodyRotateY: [0], bodyRotateX: [0,0.05,0.05,0], bodyRotateZ: [0,-0.05,-0.05,0], eyeSquintLeft: [1], eyeSquintRight: [1], mouthPucker: [0,0.5,0], NoseSneerLeft: [0,0.7], NoseSneerRight: [0.7], viseme_U: [0,1] } },
      '🥰': { dt: [1000,1000], rescale: [0,1], vs: { browInnerUp: [0.6], eyeSquintLeft: [1], eyeSquintRight: [1], mouthSmile: [0.7], NoseSneerLeft: [0.7], NoseSneerRight: [0.7] } },
      '😍': { dt: [1000,1000], rescale: [0,1], vs: { browInnerUp: [0.6], jawOpen: [0.1], MouthDimpleLeft: [0.2], MouthDimpleRight: [0.2], mouthOpen: [0.3], MouthPressLeft: [0.3], MouthPressRight: [0.3], MouthRollLower: [0.4], mouthShrugUpper: [0.4], mouthSmile: [0.7], mouthUpperUpLeft: [0.3], mouthUpperUpRight: [0.3], NoseSneerLeft: [0.4], NoseSneerRight: [0.4] } },
      '🤩': { link:  '😍' },

      '😡': { dt: [1000,1500], rescale: [0,1], vs: { BrowDownLeft: [1], BrowDownRight: [1], eyesLookUp: [0.2], jawForward: [0.3], mouthFrownLeft: [1], mouthFrownRight: [1], bodyRotateX: [0.15] } },
      '😠': { dt: [1000,1500], rescale: [0,1], vs: { BrowDownLeft: [1], BrowDownRight: [1], eyesLookUp: [0.2], jawForward: [0.3], mouthFrownLeft: [1], mouthFrownRight: [1], bodyRotateX: [0.15] } },
      '🤬': { link:  '😠' },
      '😒': { dt: [1000,1000], rescale: [0,1], vs: { eyeContact: [0], BrowDownRight: [0.1], browInnerUp: [0.7], BrowOuterUpRight: [0.2], EyeLookInRight: [0.7], EyeLookOutLeft: [0.7], eyeSquintLeft: [1], eyeSquintRight: [0.8], eyesRotateY: [0.7], mouthFrownLeft: [1], mouthFrownRight: [1], MouthLeft: [0.2], mouthPucker: [0.5], MouthRollLower: [0.2], MouthRollUpper: [0.2], mouthShrugLower: [0.2], mouthShrugUpper: [0.2], MouthStretchLeft: [0.5] } },

      '😱': { dt: [500,1500], rescale: [0,1], vs: { browInnerUp: [0.8], eyeWideLeft: [0.5], eyeWideRight: [0.5], jawOpen: [0.7], mouthFunnel: [0.5] } },
      '😬': { dt: [500,1500], rescale: [0,1], vs: { BrowDownLeft: [1], BrowDownRight: [1], browInnerUp: [1], MouthDimpleLeft: [0.5], MouthDimpleRight: [0.5], mouthLowerDownLeft: [1], mouthLowerDownRight: [1], MouthPressLeft: [0.4], MouthPressRight: [0.4], mouthPucker: [0.5], mouthSmile: [0.1], mouthSmileLeft: [0.2], mouthSmileRight: [0.2], MouthStretchLeft: [1], MouthStretchRight: [1], mouthUpperUpLeft: [1], mouthUpperUpRight: [1] } },
      '🙄': { dt: [500,1500], rescale: [0,1], vs: { browInnerUp: [0.8], eyeWideLeft: [1], eyeWideRight: [1], eyesRotateX: [-0.8], bodyRotateX: [0.15], mouthPucker: [0.5], MouthRollLower: [0.6], MouthRollUpper: [0.5], mouthShrugLower: [0], mouthSmile: [0] } },
      '🤔': { dt: [500,1500], rescale: [0,1], vs: {
        BrowDownLeft: [1], BrowOuterUpRight: [1], eyeSquintLeft: [0.6],
        mouthFrownLeft: [0.7], mouthFrownRight: [0.7], mouthLowerDownLeft: [0.3],
        MouthPressRight: [0.4], mouthPucker: [0.1], mouthRight: [0.5], MouthRollLower: [0.5],
        MouthRollUpper: [0.2], handRight: [{ x: 0.1, y: 0.1, z:0.1, d:1000 }, { d:1000 }],
        handFistRight: [0.1]
      } },
      '👀': { dt: [500,1500], rescale: [0,1], vs: { eyesRotateY: [-0.8] } },

      '😴': { dt: [5000,5000], rescale: [0,1], vs:{ EyeBlinkLeft: [1], EyeBlinkRight: [1], bodyRotateX: [0.2], bodyRotateZ: [0.1] } },

      '✋': { dt: [300,2000], rescale: [0,1], vs:{ mouthSmile: [0.5], } },
      '🤚': { dt: [300,2000], rescale: [0,1], vs:{ mouthSmile: [0.5], } },
      '👋': { link:  '✋' },
      '👍': { dt: [300,2000], rescale: [0,1], vs:{ mouthSmile: [0.5], } },
      '👎': { dt: [300,2000], rescale: [0,1], vs:{ BrowDownLeft: [1], BrowDownRight: [1], eyesLookUp: [0.2], jawForward: [0.3], mouthFrownLeft: [1], mouthFrownRight: [1], bodyRotateX: [0.15], } },
      '👌': { dt: [300,2000], rescale: [0,1], vs:{ mouthSmile: [0.5], } },
      '🤷‍♂️': { dt: [1000,1500], rescale: [0,1], vs:{ } },
      '🤷‍♀️': { link: '🤷‍♂️' },
      '🤷': { link: '🤷‍♂️' },
      '🙏': { dt: [1500,300,1000], rescale: [0,1,0], vs:{ EyeBlinkLeft: [0,1], EyeBlinkRight: [0,1], bodyRotateX: [0], bodyRotateZ: [0.1], } },

      // 'yes': { dt: [[200,500],[200,500],[200,500],[200,500]], vs:{ headMove: [0], headRotateX: [[0.1,0.2],0.1,[0.1,0.2],0], headRotateZ: [[-0.2,0.2]] } },
      // 'no': { dt: [[200,500],[200,500],[200,500],[200,500],[200,500]], vs:{ headMove: [0], headRotateY: [[-0.1,-0.05],[0.05,0.1],[-0.1,-0.05],[0.05,0.1],0], headRotateZ: [[-0.2,0.2]] } }

    };

    // Morph targets
    this.mtAvatar = {};
    this.mtCustoms = [
      "handFistLeft","handFistRight",'bodyRotateX', 'bodyRotateY',
      'bodyRotateZ', 'headRotateX', 'headRotateY', 'headRotateZ','chestInhale'
    ];
    this.mtEasingDefault = this.sigmoidFactory(5); // Morph target default ease in/out
    this.mtAccDefault = 0.01; // Acceleration [rad / s^2]
    this.mtAccExceptions = {
      EyeBlinkLeft: 0.1, EyeBlinkRight: 0.1, EyeLookOutLeft: 0.1,
      EyeLookInLeft: 0.1, EyeLookOutRight: 0.1, EyeLookInRight: 0.1
    };
    this.mtMaxVDefault = 5; // Maximum velocity [rad / s]
    this.mtMaxVExceptions = {
      bodyRotateX: 1, bodyRotateY: 1, bodyRotateZ: 1,
      // headRotateX: 1, headRotateY: 1, headRotateZ: 1
    };
    this.mtBaselineDefault = 0; // Default baseline value
    this.mtBaselineExceptions = {
      bodyRotateX: null, bodyRotateY: null, bodyRotateZ: null,
      EyeLookOutLeft: null, EyeLookInLeft: null, EyeLookOutRight: null,
      EyeLookInRight: null, eyesLookDown: null, eyesLookUp: null
    };
    this.mtMinDefault = 0;
    this.mtMinExceptions = {
      bodyRotateX: -1, bodyRotateY: -1, bodyRotateZ: -1,
      headRotateX: -1, headRotateY: -1, headRotateZ: -1
    };
    this.mtMaxDefault = 1;
    this.mtMaxExceptions = {};
    this.mtLimits = {
      EyeBlinkLeft: (v) => ( Math.max(v, ( this.mtAvatar['eyesLookDown'].value + this.mtAvatar['BrowDownLeft'].value ) / 2) ),
      EyeBlinkRight: (v) => ( Math.max(v, ( this.mtAvatar['eyesLookDown'].value + this.mtAvatar['BrowDownRight'].value ) / 2 ) )
    };
    this.mtOnchange = {
      eyesLookDown: () => {
        this.mtAvatar['EyeBlinkLeft'].needsUpdate = true;
        this.mtAvatar['EyeBlinkRight'].needsUpdate = true;
      },
      BrowDownLeft: () => { this.mtAvatar['EyeBlinkLeft'].needsUpdate = true; },
      BrowDownRight: () => { this.mtAvatar['EyeBlinkRight'].needsUpdate = true; }
    };
    // this.mtRandomized = [
    //   'MouthDimpleLeft','MouthDimpleRight', 'MouthLeft', 'MouthPressLeft',
    //   'MouthPressRight', 'MouthStretchLeft', 'MouthStretchRight',
    //   'MouthShrugLower', 'MouthShrugUpper', 'NoseSneerLeft', 'NoseSneerRight',
    //   'MouthRollLower', 'MouthRollUpper', 'BrowDownLeft', 'BrowDownRight',
    //   'BrowOuterUpLeft', 'BrowOuterUpRight', 'CheekPuff', 'CheekSquintLeft',
    //   'CheekSquintRight'
    // ];
    this.mtRandomized = [
      'MouthDimpleLeft','MouthDimpleRight', 'MouthLeft', 'MouthPressLeft',
      'MouthPressRight', 'MouthStretchLeft', 'MouthStretchRight',
      'mouthShrugLower', 'mouthShrugUpper', // undefined
      'NoseSneerLeft', 'NoseSneerRight', 'MouthRollLower', 'MouthRollUpper', 'BrowDownLeft', 'BrowDownRight',
      'BrowOuterUpLeft', 'BrowOuterUpRight', 'CheekPuff', 'CheekSquintLeft', 'CheekSquintRight'
    ];
    // mouth相关: 'MouthPressRight', 'MouthStretchLeft', 'MouthStretchRight', 'MouthRollLower', 'MouthRollUpper'
    this.mtExtras = [ // RPM Extras from ARKit, if missing
      { key: "mouthOpen", mix: { jawOpen: 0.5 } },
      { key: "mouthSmile", mix: { mouthSmileLeft: 0.8, mouthSmileRight: 0.8 } },
      { key: "eyesClosed", mix: { EyeBlinkLeft: 1.0, EyeBlinkRight: 1.0 } },
      { key: "eyesLookUp", mix: { eyeLookUpLeft: 1.0, eyeLookUpRight: 1.0 } },
      { key: "eyesLookDown", mix: { eyeLookDownLeft: 1.0, eyeLookDownRight: 1.0 } }
    ];

    // Anim queues
    this.animQueue = [];
    this.startAnim = 'standby0';
    this.TalkLocked = false; // this.TalkQueue同步锁，一轮对话只能用一次 | false -> 可以操作，true -> 禁止操作
    this.TalkQueue = []; // 讲话所需的动作控制
    this.seqItems = [];
    this.currentAction = null;
    // 对临界资源animSpeechQueue（在外部）的锁，默认为解锁状态，捕获到非零的animiSpeechQueue.length时锁定，长度置零时解锁 | 解锁时（false）可以this.UEanimQueue.push
    this.UEanimQueueActive = false;
    this.LastTime = 0;
    this.animInterval = 0; // s

    this.duration_factor = 0.2;

    this.word_per_second = 2.7; // 根据当前语速设置，向下取
    this.EvaluateTime = 999;
    
    this.animID_cnt = 0;
    this.wait_ID = 0;
    this.DefaultAnimation = {
      '待机-1': ['5'],
      '待机-2': ['8'],
      '待机-3': ['9'],
      '讲话-1': ['1'],
      '讲话-2': ['7'], // ['3', '1'], ['5', '7'] // 随机一个list
      '讲话-3': ['4', '6'],
      '讲话-4': ['1'], 
      '加油': ['2'],
      '听声音': ['3']
    }
    this.UEAnimationCandidate = {
      'UE-1': { name: 'U_Greet_05_Cycle_04', description: "向前走+敬礼", duration: 8.33 },
      'UE-2': { name: 'U_Hand_04_Cycle_01', description: "左右手轮流加油", duration: 53.88 },
      'UE-3': { name: 'U_Idle_01_Cycle_04', description: "站立+迈小步", duration: 15.42 },
      'UE-4': { name: 'U_Idle_02_Cycle_03', description: "双手抬起交叉于腰前", duration: 13.6 },
      'UE-5': { name: 'U_Idle_03_Cycle_03', description: "双手交叉于腰前再放下", duration: 16.5 },
      'UE-6': { name: 'U_Idle_04_Cycle_01', description: "两手保持交叉", duration: 7.08 },
      'UE-7': { name: '5Talk_03', description: "演讲", duration: 30 },
      'UE-8': { name: "U_Greet_01_L_Cycle_02", description: "左手打招呼",  duration: 19},
      'UE-9': { name: "U_Greet_01_R_Cycle_01", description: "右手打招呼",  duration: 15},
      'UE-10': { name: "U_Hand_05_Cycle_01", description: "呼唤",  duration: 18},
      'UE-11': { name: "U_SceneChange_02_Cycle_01", description: "转场",  duration: 22},
      'UE-12': { name: "U_Speech_08_Cycle_01", description: "讲解",  duration: 25},
    };
    this.UESocketProxy = "/socket:ue/animation";

    this.animClips = []; // 后续不清空，相当于缓存
    this.animPoses = [];

    // Clock
    this.animFrameDur = 1000/ this.opt.modelFPS;
    this.animClock = 0;
    this.animSlowdownRate = 0.95;
    this.animTimeLast = 0;
    this.easing = this.sigmoidFactory(5); // Ease in and out

    // Lip-sync extensions, import dynamically
    this.lipsync = {};
    this.opt.lipsyncModules.forEach( x => this.lipsyncGetProcessor(x) );
    this.visemeNames = [
      'aa', 'E', 'I', 'O', 'U', 'PP', 'SS', 'TH', 'DD', 'FF', 'kk',
      'nn', 'RR', 'CH', 'sil'
    ];


    // Audio context and playlist
    this.audioCtx = new AudioContext();
    this.audioSpeechSource = this.audioCtx.createBufferSource();
    this.audioBackgroundSource = this.audioCtx.createBufferSource();
    this.audioBackgroundGainNode = this.audioCtx.createGain();
    this.audioSpeechGainNode = this.audioCtx.createGain();
    this.audioAnalyzerNode = this.audioCtx.createAnalyser();
    this.audioAnalyzerNode.fftSize = 256;
    this.audioAnalyzerNode.smoothingTimeConstant = 0.1;
    this.audioAnalyzerNode.minDecibels = -70;
    this.audioAnalyzerNode.maxDecibels = -10;
    this.audioReverbNode = this.audioCtx.createConvolver();
    this.setReverb(null); // Set dry impulse as default
    this.audioBackgroundGainNode.connect(this.audioReverbNode);
    this.audioAnalyzerNode.connect(this.audioSpeechGainNode);
    this.audioSpeechGainNode.connect(this.audioReverbNode);
    this.audioReverbNode.connect(this.audioCtx.destination);
    this.setMixerGain( this.opt.mixerGainSpeech, this.opt.mixerGainBackground ); // Volume
    this.audioPlaylist = [];

    // Volume based head movement
    this.volumeFrequencyData = new Uint8Array(16);
    this.volumeMax = 0;
    this.volumeHeadBase = 0;
    this.volumeHeadTarget = 0;
    this.volumeHeadCurrent = 0;
    this.volumeHeadVelocity = 0.15;
    this.volumeHeadEasing = this.sigmoidFactory(3);

    // Listening
    this.isListening = false;
    this.listeningAnalyzer = null;
    this.listeningActive = false;
    this.listeningVolume = 0;
    this.listeningSilenceThresholdLevel = this.opt.listeningSilenceThresholdLevel;
    this.listeningSilenceThresholdMs = this.opt.listeningSilenceThresholdMs;
    this.listeningSilenceDurationMax = this.opt.listeningSilenceDurationMax;
    this.listeningActiveThresholdLevel = this.opt.listeningActiveThresholdLevel;
    this.listeningActiveThresholdMs = this.opt.listeningActiveThresholdMs;
    this.listeningActiveDurationMax = this.opt.listeningActiveDurationMax;
    this.listeningTimer = 0;
    this.listeningTimerTotal = 0;

    // Create a lookup table for base64 decoding
    const b64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    this.b64Lookup = typeof Uint8Array === 'undefined' ? [] : new Uint8Array(256);
    for (let i = 0; i < b64Chars.length; i++) this.b64Lookup[b64Chars.charCodeAt(i)] = i;

    // Speech queue
    this.stateName = 'idle';
    this.speechQueue = [];
    this.isSpeaking = false;
    this.isListening = false;

    // Setup Google text-to-speech
    if ( this.opt.ttsEndpoint ) {
      let audio = new Audio();
      if (audio.canPlayType("audio/ogg")) {
        this.ttsAudioEncoding = "OGG-OPUS";
      } else if (audio.canPlayType("audio/mp3")) {
        this.ttsAudioEncoding = "MP3";
      } else {
        throw new Error("There was no support for either OGG or MP3 audio.");
      }
    } else {
      throw new Error("You must provide some Google-compliant Text-To-Speech Endpoint.");
    }


    // Setup 3D Animation
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio( this.opt.modelPixelRatio * window.devicePixelRatio );
    this.renderer.setSize(this.nodeAvatar.clientWidth, this.nodeAvatar.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.7; // 减小曝光：1.0(default)->0.9 或更低到0.7尝试
    this.renderer.shadowMap.enabled = false;
    this.nodeAvatar.appendChild( this.renderer.domElement );
    this.camera = new THREE.PerspectiveCamera( 10, this.nodeAvatar.clientWidth / this.nodeAvatar.clientHeight, 0.1, 2000 );
    this.scene = new THREE.Scene();
    this.lightAmbient = new THREE.AmbientLight(
      new THREE.Color( this.opt.lightAmbientColor ),
      this.opt.lightAmbientIntensity
    );
    this.lightDirect = new THREE.DirectionalLight(
      new THREE.Color( this.opt.lightDirectColor ),
      this.opt.lightDirectIntensity
    );
    this.lightSpot = new THREE.SpotLight(
      new THREE.Color( this.opt.lightSpotColor ),
      this.opt.lightSpotIntensity,
      0,
      this.opt.lightSpotDispersion
    );
    this.setLighting( this.opt );
    const pmremGenerator = new THREE.PMREMGenerator( this.renderer );
    pmremGenerator.compileEquirectangularShader();
    this.scene.environment = pmremGenerator.fromScene( new RoomEnvironment() ).texture;
    this.resizeobserver = new ResizeObserver(this.onResize.bind(this));
    this.resizeobserver.observe(this.nodeAvatar);

    this.controls = new OrbitControls( this.camera, this.renderer.domElement );
    this.controls.enableZoom = this.opt.cameraZoomEnable;
    this.controls.enableRotate = this.opt.cameraRotateEnable;
    this.controls.enablePan = this.opt.cameraPanEnable;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 2000;
    this.controls.autoRotateSpeed = 0;
    this.controls.autoRotate = false;
    this.controls.update();
    this.cameraClock = null;

    // IK Mesh
    this.ikMesh = new THREE.SkinnedMesh();
    const ikSetup = {
      'clavicle_l': null, 'upperarm_l': 'clavicle_l', 'lowerarm_l': 'upperarm_l',
      'hand_l': 'lowerarm_l', 'middle_01_l': 'hand_l',
      'clavicle_r': null, 'upperarm_r': 'clavicle_r', 'lowerarm_r': 'upperarm_r',
      'hand_r': 'lowerarm_r', 'middle_01_r': 'hand_r'
    };
    const ikBones = [];
    Object.entries(ikSetup).forEach( (x,i) => {
      const bone = new THREE.Bone();
      bone.name = x[0];
      if ( x[1] ) {
        this.ikMesh.getObjectByName(x[1]).add(bone);
      } else {
        this.ikMesh.add(bone);
      }
      ikBones.push(bone);
    });
    this.ikMesh.bind( new THREE.Skeleton( ikBones ) );

    // Dynamic Bones
    this.dynamicbones = new DynamicBones();

  }

  /**
  * Helper that returns the parameter or, if it is a function, its return value.
  * @param {Any} x Parameter
  * @return {Any} Value
  */
  valueFn(x) {
    return (typeof x === 'function' ? x() : x);
  }

  /**
   * Calculate the total time as TalkQueue is consumed out
  */
  SumUpQueueTime () {
      let sum = 0;
      this.TalkQueue.forEach(x => {
        sum += this.DefaultTimeList[x] || this.TalkTimeList[x];
      });
      return this.TalkQueue.length==0 ? 0 : sum;
  };

  /**
  * Helper to deep copy and edit an object.
  * @param {Object} x Object to copy and edit
  * @param {function} [editFn=null] Callback function for editing the new object
  * @return {Object} Deep copy of the object.
  */
  deepCopy(x, editFn=null) {
    const o = JSON.parse(JSON.stringify(x));
    if ( editFn && typeof editFn === "function" ) editFn(o);
    return o;
  }

  /**
  * Convert a Base64 MP3 chunk to ArrayBuffer.
  * @param {string} chunk Base64 encoded chunk
  * @return {ArrayBuffer} ArrayBuffer
  */
  b64ToArrayBuffer(chunk) {

    // Calculate the needed total buffer length
    let bufLen = 3 * chunk.length / 4;
    if (chunk[chunk.length - 1] === '=') {
      bufLen--;
      if (chunk[chunk.length - 2] === '=') {
        bufLen--;
      }
    }

    // Create the ArrayBuffer
    const arrBuf = new ArrayBuffer(bufLen);
    const arr = new Uint8Array(arrBuf);
    let i, p = 0, c1, c2, c3, c4;

    // Populate the buffer
    for (i = 0; i < chunk.length; i += 4) {
      c1 = this.b64Lookup[chunk.charCodeAt(i)];
      c2 = this.b64Lookup[chunk.charCodeAt(i+1)];
      c3 = this.b64Lookup[chunk.charCodeAt(i+2)];
      c4 = this.b64Lookup[chunk.charCodeAt(i+3)];
      arr[p++] = (c1 << 2) | (c2 >> 4);
      arr[p++] = ((c2 & 15) << 4) | (c3 >> 2);
      arr[p++] = ((c3 & 3) << 6) | (c4 & 63);
    }

    return arrBuf;
  }

  /**
  * Concatenate an array of ArrayBuffers.
  * @param {ArrayBuffer[]} bufs Array of ArrayBuffers
  * @return {ArrayBuffer} Concatenated ArrayBuffer
  */
  concatArrayBuffers(bufs) {
    if ( bufs.length === 1 ) return bufs[0];
    let len = 0;
    for( let i=0; i<bufs.length; i++ ) {
      len += bufs[i].byteLength;
    }
    let buf = new ArrayBuffer(len);
    let arr = new Uint8Array(buf);
    let p = 0;
    for( let i=0; i<bufs.length; i++ ) {
      arr.set( new Uint8Array(bufs[i]), p);
      p += bufs[i].byteLength;
    }
    return buf;
  }


  /**
  * Convert PCM buffer to AudioBuffer.
  * NOTE: Only signed 16bit little endian supported.
  * @param {ArrayBuffer} buf PCM buffer
  * @return {AudioBuffer} AudioBuffer
  */
  pcmToAudioBuffer(buf) {
    const arr = new Int16Array(buf);
    const floats = new Float32Array(arr.length);
    for( let i=0; i<arr.length; i++ ) {
      floats[i] = (arr[i] >= 0x8000) ? -(0x10000 - arr[i]) / 0x8000 : arr[i] / 0x7FFF;
    }
    const audio = this.audioCtx.createBuffer(1, floats.length, this.opt.pcmSampleRate );
    audio.copyToChannel( floats, 0 , 0 );
    return audio;
  }


  /**
  * Convert internal notation to THREE objects.
  * NOTE: All rotations are converted to quaternions.
  * @param {Object} p Pose
  * @return {Object} A new pose object.
  */
  propsToThreeObjects(p) {
    const r = {};
    for( let [key,val] of Object.entries(p) ) {
      const ids = key.split('.');
      let x = Array.isArray(val.x) ? this.gaussianRandom(...val.x) : val.x;
      let y = Array.isArray(val.y) ? this.gaussianRandom(...val.y) : val.y;
      let z = Array.isArray(val.z) ? this.gaussianRandom(...val.z) : val.z;

      if ( ids[1] === 'position' || ids[1] === 'scale' ) {
        r[key] = new THREE.Vector3(x,y,z);
      } else if ( ids[1] === 'rotation' ) {
        key = ids[0] + '.quaternion';
        r[key] = new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z,'XYZ')).normalize();
      } else if ( ids[1] === 'quaternion' ) {
        r[key] = new THREE.Quaternion(x,y,z,val.w).normalize();
      }
    }

    return r;
  }


  /**
  * Clear 3D object.
  * @param {Object} obj Object
  */
  clearThree(obj){
    while( obj.children.length ){
      this.clearThree(obj.children[0]);
      obj.remove(obj.children[0]);
    }
    if ( obj.geometry ) obj.geometry.dispose();

    if ( obj.material ) {
      Object.keys(obj.material).forEach( x => {
        if ( obj.material[x] && obj.material[x] !== null && typeof obj.material[x].dispose === 'function' ) {
          obj.material[x].dispose();
        }
      });
      obj.material.dispose();
    }
  }

  async UEAnimateLike( animID_string ) {
    const animID_list = this.DefaultAnimation[animID_string];
    const aiController = new AbortController();
    const signal = aiController.signal;
    const socket_body = {"action": animID_list.map(x => this.UEAnimationCandidate[`UE-${x}`].name)};
    // 向UE socket发送
    try {
      const socket_res = await fetch( this.UESocketProxy, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + ''
        },
        body: JSON.stringify(socket_body),
        signal
      });
      console.log( await socket_res.text() );  
    } catch (err) {
      console.error(err)
    }  
  }

  /**
  * Adds a new mixed morph target based on the given sources.
  * Note: This assumes that morphTargetsRelative === true (default for GLTF)
  * 
  * @param {Object[]} meshes Meshes to process
  * @param {string} name New of the new morph target (a.k.a. shape key)
  * @param {Object} sources Object of existing morph target values, e.g. { mouthOpen: 1.0 }
  * @param {boolean} [override=false] If true, override existing morph target
  */
  addMixedMorphTarget(meshes, name, sources, override=false ) {
  
    meshes.forEach( x => {

      // Skip, we already have a morph target with the same name and we do not override
      if ( !override && x.morphTargetDictionary.hasOwnProperty(name) ) return;
      
      // Check if this mesh has any sources to add to the mix
      const g = x.geometry;
      let mixPos = null;
      let mixNor = null;
      for( const [k,v] of Object.entries(sources) ) {
        if ( x.morphTargetDictionary.hasOwnProperty(k) ) {
          const index = x.morphTargetDictionary[k];
          const pos = g.morphAttributes.position[index];
          const nor = g.morphAttributes.normal?.[index];

          // Create position and normal
          if ( !mixPos ) {
            mixPos = new THREE.Float32BufferAttribute(pos.count * 3, 3);
            if ( nor ) {
              mixNor = new THREE.Float32BufferAttribute(pos.count * 3, 3);
            }
          }

          // Update position
          for (let i = 0; i < pos.count; i++) {
            const dx = mixPos.getX(i) + pos.getX(i) * v;
            const dy = mixPos.getY(i) + pos.getY(i) * v;
            const dz = mixPos.getZ(i) + pos.getZ(i) * v;
            mixPos.setXYZ(i, dx, dy, dz);
          }

          // Update normal
          if ( nor ) {
            for (let i = 0; i < pos.count; i++) {
              const dx = mixNor.getX(i) + nor.getX(i) * v;
              const dy = mixNor.getY(i) + nor.getY(i) * v;
              const dz = mixNor.getZ(i) + nor.getZ(i) * v;
              mixNor.setXYZ(i, dx, dy, dz);
            }
          }

        }
      }

      // We found one or more sources, so we add the new mixed morph target
      if ( mixPos ) {
        g.morphAttributes.position.push(mixPos);
        if ( mixNor ) {
          g.morphAttributes.normal.push(mixNor);
        }
        const index = g.morphAttributes.position.length - 1;
        x.morphTargetInfluences[index] = 0;
        x.morphTargetDictionary[name] = index;
      }

    });
  }

  /**
  * Loader for 3D avatar model.
  * @param {string} avatar Avatar object with 'url' property to GLTF/GLB file.
  * @param {progressfn} [onprogress=null] Callback for progress
  */
  async showAvatar(avatar, onprogress=null ) {

    // Checkt the avatar parameter
    if ( !avatar || !avatar.hasOwnProperty('url') ) {
      throw new Error("Invalid parameter. The avatar must have at least 'url' specified.");
    }

    // Loader | TODO: GLB error starts ↓
    const loader = new GLTFLoader();
    let gltf = await loader.loadAsync( avatar.url, onprogress );

    // Check the gltf
    const required = [ this.opt.modelRoot ];
    this.posePropNames.forEach( x => required.push( x.split('.')[0] ) );
    // 用metahuman的绑定时注释，否则打开 ↓
    // required.forEach( x => {
    //   if ( !gltf.scene.getObjectByName(x) ) {
    //     throw new Error('Avatar object ' + x + ' not found');
    //   }
    // });
    // 用metahuman的绑定时注释，否则打开 ↑
    this.stop();
    this.avatar = avatar;

    // Dispose Dynamic Bones
    this.dynamicbones.dispose();

    // Clear previous scene, if avatar was previously loaded
    this.mixer = null;
    if ( this.armature ) {
      this.clearThree( this.scene );
    }

    // Avatar full-body
    
    // 用metahuman的绑定时注释，否则打开 ↑
    // gltf.scene.rotateX(-Math.PI / 2);
    // gltf.scene.rotateY(-Math.PI / 2);

    // gltf.scene.rotateZ(Math.PI / 2);
    // gltf.scene.translateX(20);
    this.armature = gltf.scene.children[0]
    // this.armature = gltf.scene.getObjectByName('root')
    this.armature.scale.setScalar(0.015);

    // const bone = this.armature.getObjectByName('ball_r'); // 例如 upperarm_l
    // if (bone) {
    //   // 绕X轴旋转90度
    //   bone.quaternion.multiply(
    //     new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2))
    //   );
    //   bone.updateMatrixWorld(true);
    // }
    

    // Morph targets
    this.morphs = [];

    // TODO: 需要将所有this.morphs的注释打开
    gltf.scene.traverse(obj => {
      if (obj.isMesh) {
        console.log(obj.name, obj.morphTargetDictionary, obj.morphTargetInfluences, obj.material);
        // 保证可以投影、接收阴影（如需要）
        obj.castShadow = true;
        obj.receiveShadow = true;

        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(mat => {
          if (!mat) return;
          // 支持骨骼 / morph
          if (obj.isSkinnedMesh) mat.skinning = true;
          if (obj.morphTargetInfluences) {
            mat.morphTargets = true;
            mat.morphNormals = true;
          }

          // 贴图的色彩空间修正
          ['map','emissiveMap','aoMap'].forEach(k => {
            if (mat[k]) {
              mat[k].encoding = THREE.sRGBEncoding;
              mat[k].needsUpdate = true;
            }
          });
          ['metalnessMap','roughnessMap','normalMap','displacementMap'].forEach(k => {
            if (mat[k]) {
              mat[k].encoding = THREE.LinearEncoding;
              mat[k].needsUpdate = true;
            }
          });

          // 根据需要调整双面 / 透明
          // mat.side = THREE.DoubleSide;

          mat.needsUpdate = true;
        });
      }
    });

    this.armature.traverse( x => {
      if ( x.morphTargetInfluences && x.morphTargetInfluences.length &&
        x.morphTargetDictionary ) {
        this.morphs.push(x);
      }

      // Workaround for #40, hands culled from the rendering process
      x.frustumCulled = false;
    });
    if ( this.morphs.length === 0 ) {
      throw new Error('Blend shapes not found');
    }

    // Morph target keys and values
    const keys = new Set(this.mtCustoms);
    this.morphs.forEach( x => {
      Object.keys(x.morphTargetDictionary).forEach( y => keys.add(y) );
    });

    // Add RPM extra blend shapes, if missing
    this.mtExtras.forEach( x => {
      if ( !keys.has(x.key) ) {
        this.addMixedMorphTarget( this.morphs, x.key, x.mix );
        keys.add(x.key);
      }
    });

    const mtTemp = {};
    keys.forEach( x => {
      // console.log("keys: " + x);
      // Morph target data structure
      mtTemp[x] = {
        fixed: null, system: null, systemd: null, newvalue: null, ref: null,
        min: (this.mtMinExceptions.hasOwnProperty(x) ? this.mtMinExceptions[x] : this.mtMinDefault),
        max: (this.mtMaxExceptions.hasOwnProperty(x) ? this.mtMaxExceptions[x] : this.mtMaxDefault),
        easing: this.mtEasingDefault, base: null, v: 0, needsUpdate: true,
        acc: (this.mtAccExceptions.hasOwnProperty(x) ? this.mtAccExceptions[x] : this.mtAccDefault) / 1000,
        maxv: (this.mtMaxVExceptions.hasOwnProperty(x) ? this.mtMaxVExceptions[x] : this.mtMaxVDefault) / 1000,
        limit: this.mtLimits.hasOwnProperty(x) ? this.mtLimits[x] : null,
        onchange: this.mtOnchange.hasOwnProperty(x) ? this.mtOnchange[x] : null,
        baseline: this.avatar.baseline?.hasOwnProperty(x) ? this.avatar.baseline[x] : (this.mtBaselineExceptions.hasOwnProperty(x) ? this.mtBaselineExceptions[x] : this.mtBaselineDefault ),
        ms: [], is: []
      };
      mtTemp[x].value = mtTemp[x].baseline;
      mtTemp[x].applied = mtTemp[x].baseline;

      // Copy previous values
      const y = this.mtAvatar[x];
      if ( y ) {
        [ 'fixed','system','systemd','base','v','value','applied' ].forEach( z => {
          mtTemp[x][z] = y[z];
        });
      }

      // Find relevant meshes
      this.morphs.forEach( y => {
        const ndx = y.morphTargetDictionary[x];
        if ( ndx !== undefined ) {
          mtTemp[x].ms.push(y.morphTargetInfluences);
          mtTemp[x].is.push(ndx);
          y.morphTargetInfluences[ndx] = mtTemp[x].applied;
        }
      });

    });
    this.mtAvatar = mtTemp;

    // Objects for needed properties
    this.poseAvatar = { props: {} };
    this.posePropNames.forEach( x => {
      const ids = x.split('.');
      const o = this.armature.getObjectByName(ids[0]);
      this.poseAvatar.props[x] = o[ids[1]];
      if ( this.poseBase.props.hasOwnProperty(x) ) {
        this.poseAvatar.props[x].copy( this.poseBase.props[x] );
      } else {
        this.poseBase.props[x] = this.poseAvatar.props[x].clone();
      }

      // Make sure the target has the delta properties, because we need it as a basis
      if ( this.poseDelta.props.hasOwnProperty(x) && !this.poseTarget.props.hasOwnProperty(x) ) {
        this.poseTarget.props[x] = this.poseAvatar.props[x].clone();
      }

      // Take target pose
      this.poseTarget.props[x].t = this.animClock;
      this.poseTarget.props[x].d = 2000;
    });

    // Reset IK bone positions
    this.ikMesh.traverse( x => {
      if (x.isBone) {
        x.position.copy( this.armature.getObjectByName(x.name).position );
      }
    });


    // Add avatar to scene
    this.scene.add(gltf.scene);

    // 晴天日光风格 //
    const hemi = new THREE.HemisphereLight(0xbcdfff, 0x444444, 0.7);
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);

    // 黄昏暖光风格 //
    // const hemi = new THREE.HemisphereLight(0xffcc88, 0x332211, 0.5);
    // const dir = new THREE.DirectionalLight(0xffaa55, 0.8);
    // 加深暖色（更偏橙红）
    // const hemi = new THREE.HemisphereLight(0xffbb77, 0x442200, 0.6);
    // const dir = new THREE.DirectionalLight(0xff8844, 0.9);
    // 更柔和、暖白（室内灯光感）
    // const hemi = new THREE.HemisphereLight(0xffeedd, 0x554433, 0.5);
    // const dir = new THREE.DirectionalLight(0xffddaa, 0.7);
    // 强烈日落橙红（戏剧感）
    // const hemi = new THREE.HemisphereLight(0xff9966, 0x331100, 0.6);
    // const dir = new THREE.DirectionalLight(0xff6600, 1.0);

    // 夜间冷色风格 //
    // const hemi = new THREE.HemisphereLight(0x3355aa, 0x000000, 0.3);
    // const dir = new THREE.DirectionalLight(0x99ccff, 0.4);
    // 默认光      //
    // const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    // const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(5, 10, 2);
    dir.castShadow = true;
    dir.shadow.bias = -0.0003;
    dir.shadow.radius = 2;
    this.scene.add(hemi);
    this.scene.add(dir);

    // 添加一个“对侧填充光”与“背光”
    const fill = new THREE.DirectionalLight(0x77aaff, 0.25); // 偏冷的弱光用来中和暖色
    fill.position.set(-3, 4, -2);
    fill.target.position.set(0,1.2,0);
    fill.castShadow = false;
    this.scene.add(fill);
    this.scene.add(fill.target);

    const rim = new THREE.DirectionalLight(0xffeedd, 0.25); // 轻微暖色背光，强调轮廓
    rim.position.set(0, 4, -6);
    rim.target.position.set(0, 1.5, 0);
    this.scene.add(rim);
    this.scene.add(rim.target);


    // 展示坐标轴
        function makeLabel(text, color) {
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          context.font = '50px Arial';
          context.fillStyle = color;
          context.fillText(text, 10, 50);
          
          const texture = new THREE.CanvasTexture(canvas);
          const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
          const sprite = new THREE.Sprite(material);
          sprite.scale.set(0.5, 0.25, 1); // 控制大小
          return sprite;
        }

        const axesHelper = new THREE.AxesHelper(5);
        this.scene.add(axesHelper);

        // X 轴标签
        const xLabel = makeLabel('X', 'red');
        xLabel.position.set(5.5, 0, 0);
        this.scene.add(xLabel);

        // Y 轴标签
        const yLabel = makeLabel('Y', 'green');
        yLabel.position.set(0, 5.5, 0);
        this.scene.add(yLabel);

        // Z 轴标签
        const zLabel = makeLabel('Z', 'blue');
        zLabel.position.set(0, 0, 5.5);
        this.scene.add(zLabel);

        const gridHelper = new THREE.GridHelper(10, 10); // 网格大小 10，分 10 格
        this.scene.add(gridHelper);
    // 展示坐标轴

    // Add lights
    this.scene.add( this.lightAmbient );
    this.scene.add( this.lightDirect );
    this.scene.add( this.lightSpot );
    this.lightSpot.target = this.armature.getObjectByName('Head');

    // Setup Dynamic Bones
    if ( avatar.hasOwnProperty("modelDynamicBones") ) {
      try {
        this.dynamicbones.setup(this.scene, this.armature, avatar.modelDynamicBones );
      }
      catch(error) {
        console.error("Dynamic bones setup failed: " + error);
      }
    }

    // Find objects that we need in the animate function
    this.objectLeftToeBase = this.armature.getObjectByName('ball_l');
    this.objectRightToeBase = this.armature.getObjectByName('ball_r');
    this.objectLeftEye = this.armature.getObjectByName('eye_l');
    // this.objectLeftEye = this.armature.getObjectByName('eye_left_geo');
    this.objectRightEye = this.armature.getObjectByName('eye_r');
    // this.objectRightEye = this.armature.getObjectByName('eye_right_geo'); 
    this.objectupperarm_l = this.armature.getObjectByName('upperarm_l');
    this.objectupperarm_r = this.armature.getObjectByName('upperarm_r');
    this.objectHips = this.armature.getObjectByName('pelvis');
    this.objectHead = this.armature.getObjectByName('head');
    this.objectNeck = this.armature.getObjectByName('neck_01');

    // Estimate avatar height based on eye level
    const plEye = new THREE.Vector3();
    this.objectLeftEye.getWorldPosition(plEye);
    this.avatarHeight = plEye.y + 0.2;

    // Set pose, view and start animation
    if ( !this.viewName ) this.setView( this.opt.cameraView );
    this.setMood( this.avatar.avatarMood || this.moodName || this.opt.avatarMood );
    this.start();

  }

  /**
  * Get view names.
  * @return {string[]} Supported view names.
  */
  getViewNames() {
    return ['full', 'mid', 'upper', 'head'];
  }

  /**
  * Get current view.
  * @return {string} View name.
  */
  getView() {
    return this.viewName;
  }

  /**
  * Fit 3D object to the view.
  * @param {string} [view=null] Camera view. If null, reset current view
  * @param {Object} [opt=null] Options
  */
  setView(view, opt = null) {
    if ( view !== 'full' && view !== 'upper' && view !== 'head' && view !== 'mid' ) return;
    if ( !this.armature ) {
      this.opt.cameraView = view;
      return;
    }

    this.viewName = view || this.viewName;
    opt = opt || {};

    const fov = this.camera.fov * ( Math.PI / 180 );
    let x = - (opt.cameraX || this.opt.cameraX) * Math.tan( fov / 2 );
    let y = ( 1 - (opt.cameraY || this.opt.cameraY)) * Math.tan( fov / 2 );
    let z = (opt.cameraDistance || this.opt.cameraDistance);
    
    // this.viewName = 'upper'; // debug
    
    switch(this.viewName) {
    case 'head':
      z += 2;
      y = y * z + 4 * this.avatarHeight / 5;
      break;
    case 'upper':
      z += 4.5;
      y = y * z + 2 * this.avatarHeight / 3;
      break;
    case 'mid':
      z += 8;
      y = y * z + this.avatarHeight / 3;
      break;
    default:
      z += 12;
      y = y * z;
    }

    x = x * z;

    this.controlsEnd = new THREE.Vector3(x, y, 0);
    if (opt.hasOwnProperty("cameraRotateX") && opt.hasOwnProperty("cameraRotateY")) {
      // opt.cameraRotateY += 1.8 // valid
      // opt.cameraRotateY -= Math.PI / 2;
    }
    // if (opt.hasOwnProperty("cameraDistance")) {
    //   opt.cameraDistance += 100;
    // }
    // if (opt.hasOwnProperty("cameraY") && opt.hasOwnProperty("cameraX")) {
    //   opt.cameraY -= 150;
    //   // opt.cameraX -= 100;
    // }
    this.cameraEnd = new THREE.Vector3(x, y, z).applyEuler( new THREE.Euler( (opt.cameraRotateX || opt.cameraRotateX), (opt.cameraRotateY || this.opt.cameraRotateY), 0 ) );

    if ( this.cameraClock === null ) {
      this.controls.target.copy( this.controlsEnd );
      this.camera.position.copy( this.cameraEnd );
    }
    this.controlsStart = this.controls.target.clone();
    this.cameraStart = this.camera.position.clone();
    this.cameraClock = 0;

  }

  /**
  * Change light colors and intensities.
  * @param {Object} opt Options
  */
  setLighting(opt) {
    opt = opt || {};
    // console.log('--------------');
    // console.log(opt.lightAmbientColor);
    // console.log(opt.lightAmbientIntensity);
    // console.log(opt.lightDirectColor);
    // console.log(opt.lightDirectIntensity);
    // console.log(opt.lightDirectPhi);
    // console.log(opt.lightDirectTheta);
    // console.log(opt.lightSpotColor);
    // console.log(opt.lightSpotIntensity);
    // console.log(opt.lightSpotPhi);
    // console.log(opt.lightSpotTheta);
    // console.log(opt.lightSpotDispersion);


    // Ambient light
    if ( opt.hasOwnProperty("lightAmbientColor") ) {
      this.lightAmbient.color.set( new THREE.Color( opt.lightAmbientColor ) );
    }
    if ( opt.hasOwnProperty("lightAmbientIntensity") ) {
      this.lightAmbient.intensity = opt.lightAmbientIntensity;
      this.lightAmbient.visible = (opt.lightAmbientIntensity !== 0);
    }

    // Directional light
    if ( opt.hasOwnProperty("lightDirectColor") ) {
      this.lightDirect.color.set( new THREE.Color( opt.lightDirectColor ) );
    }
    if ( opt.hasOwnProperty("lightDirectIntensity") ) {
      this.lightDirect.intensity = opt.lightDirectIntensity;
      this.lightDirect.visible = (opt.lightDirectIntensity !== 0);
    }
    if ( opt.hasOwnProperty("lightDirectPhi") && opt.hasOwnProperty("lightDirectTheta") ) {
      this.lightDirect.position.setFromSphericalCoords(2, opt.lightDirectPhi, opt.lightDirectTheta);
    }

    // Spot light
    if ( opt.hasOwnProperty("lightSpotColor") ) {
      this.lightSpot.color.set( new THREE.Color( opt.lightSpotColor ) );
    }
    if ( opt.hasOwnProperty("lightSpotIntensity") ) {
      this.lightSpot.intensity = opt.lightSpotIntensity;
      this.lightSpot.visible = (opt.lightSpotIntensity !== 0);
    }
    if ( opt.hasOwnProperty("lightSpotPhi") && opt.hasOwnProperty("lightSpotTheta") ) {
      this.lightSpot.position.setFromSphericalCoords( 2, opt.lightSpotPhi, opt.lightSpotTheta );
      this.lightSpot.position.add( new THREE.Vector3(0,1.5,0) );
    }
    if ( opt.hasOwnProperty("lightSpotDispersion") ) {
      this.lightSpot.angle = opt.lightSpotDispersion;
    }

    // this.setA();

  }

  setA() {
    this.lightAmbient.color.set( new THREE.Color( 0xffecd6 ) );
    this.lightAmbient.intensity = 0.28;
    this.lightAmbient.visible = true;

    this.lightDirect.color.set( new THREE.Color( 0xffb276 ) );

    this.lightDirect.intensity = 0.85;
    this.lightDirect.visible = true;
    this.lightDirect.position.setFromSphericalCoords(2, THREE.MathUtils.degToRad(45), THREE.MathUtils.degToRad(20));
    this.lightSpot.color.set( new THREE.Color( 0xffeedd ) );
    this.lightSpot.intensity = 0.22;
    this.lightSpot.visible = true;
    this.lightSpot.position.setFromSphericalCoords( 2, THREE.MathUtils.degToRad(55), THREE.MathUtils.degToRad(-160) );
    this.lightSpot.position.add( new THREE.Vector3(0,1.5,0) );
    this.lightSpot.angle = 0.7;
  }
  setB() {
    this.lightAmbient.color.set( new THREE.Color( 0xffffff ) );
    this.lightAmbient.intensity = 0.35;
    this.lightAmbient.visible = true;
    
    this.lightDirect.color.set( new THREE.Color( 0xfff6e6 ) );
    this.lightDirect.intensity = 0.75;
    this.lightDirect.visible = true;
    this.lightDirect.position.setFromSphericalCoords(2, THREE.MathUtils.degToRad(50), THREE.MathUtils.degToRad(10));
    this.lightSpot.color.set( new THREE.Color( 0x99bfe6 ) );
    this.lightSpot.intensity = 0.25;
    this.lightSpot.visible = true;
    this.lightSpot.position.setFromSphericalCoords( 2, THREE.MathUtils.degToRad(40), THREE.MathUtils.degToRad(-140) );
    this.lightSpot.position.add( new THREE.Vector3(0,1.5,0) );
    this.lightSpot.angle = 0.9;
  }
  setC() {
    this.lightAmbient.color.set( new THREE.Color( 0xffeedd ) );
    this.lightAmbient.intensity = 0.2;
    this.lightAmbient.visible = true;

    this.lightDirect.color.set( new THREE.Color( 0xff9966 ) );
    this.lightDirect.intensity = 0.65;
    this.lightDirect.visible = true;
    this.lightDirect.position.setFromSphericalCoords(2, THREE.MathUtils.degToRad(35), THREE.MathUtils.degToRad(25));
    this.lightSpot.color.set( new THREE.Color( 0xffeedd ) );
    this.lightSpot.intensity = 0.32;
    this.lightSpot.visible = true;
    this.lightSpot.position.setFromSphericalCoords( 2, THREE.MathUtils.degToRad(20), THREE.MathUtils.degToRad(-120) );
    this.lightSpot.position.add( new THREE.Vector3(0,1.5,0) );
    this.lightSpot.angle = 0.5;
  }





  /**
  * Render scene.
  */
  render() {
    if ( this.isRunning ) {
      this.renderer.render( this.scene, this.camera );
    }
  }

  /**
  * Resize avatar.
  */
  onResize() {
    this.camera.aspect = this.nodeAvatar.clientWidth / this.nodeAvatar.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize( this.nodeAvatar.clientWidth, this.nodeAvatar.clientHeight );
    this.controls.update();
    this.render();
  }

  /**
  * Update avatar pose.
  * @param {number} t High precision timestamp in ms.
  */
  updatePoseBase(t) {
    for( const [key,val] of Object.entries(this.poseTarget.props) ) {
      const o = this.poseAvatar.props[key];
      if (o) {
        let alpha = (t - val.t) / val.d;
        if ( alpha > 1 || !this.poseBase.props.hasOwnProperty(key) ) {
          o.copy(val);
        } else {
          if ( o.isQuaternion ) {
            o.copy( this.poseBase.props[key].slerp(val, this.easing(alpha) ));
          } else if ( o.isVector3 ) {
            o.copy( this.poseBase.props[key].lerp(val, this.easing(alpha) ));
          }
        }
      }
    }
  }

  /**
  * Update avatar pose deltas
  */
  updatePoseDelta() {
    for( const [key,d] of Object.entries(this.poseDelta.props) ) {
      if ( d.x === 0 && d.y === 0 && d.z === 0 ) continue;
      e.set(d.x,d.y,d.z);
      const o = this.poseAvatar.props[key];
      if ( o.isQuaternion ) {
        q.setFromEuler(e);
        o.multiply(q);
      } else if ( o.isVector3 ) {
        o.add( e );
      }
    }
  }

  /**
  * Update morph target values.
  * @param {number} dt Delta time in ms.
  */
  updateMorphTargets(dt) {

    for( let [mt,o] of Object.entries(this.mtAvatar) ) {

      if ( !o.needsUpdate ) continue;

      // Alternative target (priority order):
      // - fixed: Fixed value, typically user controlled
      // - system: System value, which overrides animations
      // - newvalue: Animation value
      // - baseline: Baseline value when none of the above applies
      let target = null;
      let newvalue = null;
      if ( o.fixed !== null ) {
        target = o.fixed;
        o.system = null;
        o.systemd = null;
        o.newvalue = null;
        if ( o.ref && o.ref.hasOwnProperty(mt) ) delete o.ref[mt];
        o.ref = null;
        o.base = null;
        if ( o.value === target ) {
          o.needsUpdate = false;
          continue;
        }
      } else if ( o.system !== null ) {
        target = o.system;
        o.newvalue = null;
        if ( o.ref && o.ref.hasOwnProperty(mt) ) delete o.ref[mt];
        o.ref = null;
        o.base = null;
        if ( o.systemd !== null ) {
          if ( o.systemd === 0 ) {
            target = null;
            o.system = null;
            o.systemd = null;
          } else {
            o.systemd -= dt;
            if ( o.systemd < 0 ) o.systemd= 0;
            if ( o.value === target ) {
              target = null;
            }
          }
        } else if ( o.value === target ) {
          target = null;
          o.system = null;
        }
      } else if ( o.newvalue !== null ) {
        o.ref = null;
        o.base = null;
        newvalue = o.newvalue;
        o.newvalue = null;
      } else if ( o.base !== null ) {
        target = o.base;
        o.ref = null;
        if ( o.value === target ) {
          target = null;
          o.base = null;
          o.needsUpdate = false;
        }
      } else {
        o.ref = null;
        if ( o.baseline !== null && o.value !== o.baseline ) {
          target = o.baseline;
          o.base = o.baseline;
        } else {
          o.needsUpdate = false;
        }
      }

      // Calculate new value using exponential smoothing
      if ( target !== null ) {
        let diff = target - o.value;
        if ( diff >= 0 ) {
          if ( diff < 0.005 ) {
            newvalue = target;
            o.v = 0;
          } else {
            if ( o.v < o.maxv ) o.v += o.acc * dt;
            if ( o.v >= 0 ) {
              newvalue = o.value + diff * ( 1 - Math.exp(- o.v * dt) );
            } else {
              newvalue = o.value + o.v * dt * ( 1 - Math.exp(o.v * dt) );
            }
          }
        } else {
          if ( diff > -0.005 ) {
            newvalue = target;
            o.v = 0;
          } else {
            if ( o.v > -o.maxv ) o.v -= o.acc * dt;
            if ( o.v >= 0 ) {
              newvalue = o.value + o.v * dt * ( 1 - Math.exp(- o.v * dt) );
            } else {
              newvalue = o.value + diff * ( 1 - Math.exp( o.v * dt) );
            }
          }
        }
      }

      // Check limits and whether we need to actually update the morph target
      if ( o.limit !== null ) {
        if ( newvalue !== null && newvalue !== o.value ) {
          o.value = newvalue;
          if ( o.onchange !== null ) o.onchange(newvalue);
        }
        newvalue = o.limit(o.value);
        if ( newvalue === o.applied ) continue;
      } else {
        if ( newvalue === null || newvalue === o.value ) continue;
        o.value = newvalue;
        if ( o.onchange !== null ) o.onchange(newvalue);
      }

      o.applied = newvalue;
      if ( o.applied < o.min ) o.applied = o.min;
      if ( o.applied > o.max ) o.applied = o.max;

      // Apply value
      // new architecture of CPU
      if (mt === 'headRotateX') {
        this.poseDelta.props['head.quaternion'].x = o.applied + this.mtAvatar['bodyRotateX'].applied;
      } else {
        switch(mt) {
          case 'headRotateY':
            this.poseDelta.props['head.quaternion'].y = o.applied + this.mtAvatar['bodyRotateY'].applied;
            break;

          case 'headRotateZ':
            this.poseDelta.props['head.quaternion'].z = o.applied + this.mtAvatar['bodyRotateZ'].applied;
            break;

          case 'bodyRotateX':
            this.poseDelta.props['head.quaternion'].x = o.applied + this.mtAvatar['headRotateX'].applied;
            this.poseDelta.props['spine_02.quaternion'].x = o.applied/2;
            this.poseDelta.props['spine_01.quaternion'].x = o.applied/8;
            this.poseDelta.props['pelvis.quaternion'].x = o.applied/24;
            break;

          case 'bodyRotateY':
            this.poseDelta.props['head.quaternion'].y = o.applied + this.mtAvatar['headRotateY'].applied;
            this.poseDelta.props['spine_02.quaternion'].y = o.applied/2;
            this.poseDelta.props['spine_01.quaternion'].y = o.applied/2;
            this.poseDelta.props['pelvis.quaternion'].y = o.applied/4;
            this.poseDelta.props['thigh_l.quaternion'].y = o.applied/2;
            this.poseDelta.props['thigh_r.quaternion'].y = o.applied/2;
            this.poseDelta.props['calf_l.quaternion'].y = o.applied/4;
            this.poseDelta.props['calf_r.quaternion'].y = o.applied/4;
            break;

          case 'bodyRotateZ':
            this.poseDelta.props['head.quaternion'].z = o.applied + this.mtAvatar['headRotateZ'].applied;
            this.poseDelta.props['spine_02.quaternion'].z = o.applied/12;
            this.poseDelta.props['spine_01.quaternion'].z = o.applied/12;
            this.poseDelta.props['pelvis.quaternion'].z = o.applied/24;
            break;

          case 'handFistLeft':
          case 'handFistRight':
            const side = mt.substring(8);
            if (side === "Left") {side = '_l'}
            else {side = '_r'}
            ['thumb', 'index','middle',
            'ring', 'pinky'].forEach( (x,i) => {
              if ( i === 0 ) {
                this.poseDelta.props[x+'_01'+side+'.quaternion'].x = 0;
                this.poseDelta.props[x+'_02'+side+'.quaternion'].z = (side === 'Left' ? -1 : 1) * o.applied;
                this.poseDelta.props[x+'_03'+side+'.quaternion'].z = (side === 'Left' ? -1 : 1) * o.applied;
              } else {
                this.poseDelta.props[x+'_01'+side+'.quaternion'].x = o.applied;
                this.poseDelta.props[x+'_02'+side+'.quaternion'].x = 1.5 * o.applied;
                this.poseDelta.props[x+'_03'+side+'.quaternion'].x = 1.5 * o.applied;
              }
            });
            break;

          case 'chestInhale':
            const scale = o.applied/20;
            const d = { x: scale, y: (scale/2), z: (3 * scale) };
            const dneg = { x: (1/(1+scale) - 1), y: (1/(1 + scale/2) - 1), z: (1/(1 + 3 * scale) - 1) };
            this.poseDelta.props['spine_02.scale'] = d;
            this.poseDelta.props['neck_01.scale'] = dneg;
            this.poseDelta.props['upperarm_l.scale'] = dneg;
            this.poseDelta.props['upperarm_r.scale'] = dneg;
            break;

          default:
            for( let i=0,l=o.ms.length; i<l; i++ ) {
              o.ms[i][o.is[i]] = o.applied;
            }

        }
      }
      
    }
  }

  /**
  * Get given pose as a string.
  * @param {Object} pose Pose
  * @param {number} [prec=1000] Precision used in values
  * @return {string} Pose as a string
  */
  getPoseString(pose,prec=1000){
    let s = '{';
    Object.entries(pose).forEach( (x,i) => {
      const ids = x[0].split('.');
      if ( ids[1] === 'position' || ids[1] === 'rotation' || ids[1] === 'quaternion' ) {
        const key = (ids[1] === 'quaternion' ? (ids[0]+'.rotation') : x[0]);
        const val = (x[1].isQuaternion ? new THREE.Euler().setFromQuaternion(x[1]) : x[1]);
        s += (i?", ":"") + "'" + key + "':{";
        s += 'x:' + Math.round(val.x * prec) / prec;
        s += ', y:' + Math.round(val.y * prec) / prec;
        s += ', z:' + Math.round(val.z * prec) / prec;
        s += '}';
      }
    });
    s += '}';
    return s;
  }


  /**
  * Return pose template property taking into account mirror pose and gesture.
  * @param {string} key Property key
  * @return {Quaternion|Vector3} Position or rotation
  */
  getPoseTemplateProp(key, UseglbTemplate=false) {

    const ids = key.split('.');
    let target = ids[0] + '.' + (ids[1] === 'rotation' ? 'quaternion' : ids[1]);

    let val;

    if ( this.gesture && this.gesture.hasOwnProperty(target) ) {
      return this.gesture[target].clone();
    } else if ( UseglbTemplate ) {
      if ( this.poseTarget.props.hasOwnProperty(target) ) {
        const o = {};
        o[target] = this.poseTarget.props[target];
        val = this.propsToThreeObjects( o )[target];
      } else if ( this.poseTarget.props.hasOwnProperty(source) ) {
        const o = {};
        o[source] = this.poseTarget.props[source];
        val = this.propsToThreeObjects( o )[target];
      }

      // Mirror
      if ( val && !this.poseWeightOnLeft && val.isQuaternion ) {
        val.x *= -1;
        val.w *= -1;
      }
      return val;
    } else {
      let source = ids[0] + '.' + (ids[1] === 'quaternion' ? 'rotation' : ids[1]);
      if ( !this.poseWeightOnLeft ) {
        if ( source.startsWith('Left') ) {
          source = 'Right' + source.substring(4);
          target = 'Right' + target.substring(4);
        } else if ( source.startsWith('Right') ) {
          source = 'Left' + source.substring(5);
          target = 'Left' + target.substring(5);
        }
      }

      // Get value
      // let val;
      if ( this.poseTarget.template.props.hasOwnProperty(target) ) {
        const o = {};
        o[target] = this.poseTarget.template.props[target];
        val = this.propsToThreeObjects( o )[target];
      } else if ( this.poseTarget.template.props.hasOwnProperty(source) ) {
        const o = {};
        o[source] = this.poseTarget.template.props[source];
        val = this.propsToThreeObjects( o )[target];
      }

      // Mirror
      if ( val && !this.poseWeightOnLeft && val.isQuaternion ) {
        val.x *= -1;
        val.w *= -1;
      }

      return val;
    }
  }

  /**
  * Change body weight from current leg to another.
  * @param {Object} p Pose properties
  * @return {Object} Mirrored pose.
  */
  mirrorPose(p) {
    const r = {};
    for( let [key,val] of Object.entries(p) ) {

      // Create a mirror image
      if ( val.isQuaternion ) {
        if ( key.startsWith('Left') ) {
          key = 'Right' + key.substring(4);
        } else if ( key.startsWith('Right') ) {
          key = 'Left' + key.substring(5);
        }
        val.x *= -1;
        val.w *= -1;
      }

      r[key] = val.clone();

      // Custom properties
      r[key].t = val.t;
      r[key].d = val.d;
    }
    return r;
  }

  /**
  * Create a new pose.
  * @param {Object} template Pose template
  * @param {numeric} [ms=2000] Transition duration in ms
  * @return {Object} A new pose object.
  */
  poseFactory(template, ms=2000) {
    /*
      template:
        "standing": bool,
        "props": {item.position: ..., item.rotation: ..., ...}

    */ 

    // Pose object
    const o = {
      template: template,
      props: this.propsToThreeObjects( template.props ) // 处理为three.js对象
    };

    for( const [p,val] of Object.entries(o.props) ) {

      // Restrain movement when standing
      if ( this.opt.modelMovementFactor < 1 && template.standing &&
        (p === 'pelvis.quaternion' || p === 'spine_01.quaternion' ||
        p === 'spine_02.quaternion' || p === 'spine_03.quaternion' ||
        p === 'neck_01.quaternion' || p === 'thigh_l.quaternion' ||
        p === 'calf_l.quaternion' || p === 'thigh_r.quaternion' ||
        p === 'calf_r.quaternion') ) {
        const ref = this.poseStraight[p];
        const angle = val.angleTo( ref );
        val.rotateTowards( ref, (1 - this.opt.modelMovementFactor) * angle );
      }

      // Custom properties
      val.t = this.animClock; // timestamp
      val.d = ms; // Transition duration

    }
    return o;
  }

  /**
  * Set a new pose and start transition timer.
  * @param {Object} template Pose template, if null update current pose
  * @param {number} [ms=2000] Transition time in milliseconds
  */
  async setPoseFromTemplate(template, ms=1500, useGLB=false, poseName=null, scale = 0.01, ndx=0) {
    // 已经规划好
    // if ( ! (useGLB && poseName) ) {  // && ! this.PoseGLB
    //   // Special cases
    //   const isIntermediate = template && this.poseTarget && this.poseTarget.template && ((this.poseTarget.template.standing && template.lying) || (this.poseTarget.template.lying && template.standing));
    //   const isSameTemplate = poseName && (poseName === this.poseCurrentTemplate);
    //   const isWeightOnLeft = this.poseWeightOnLeft;
    //   let duration = isIntermediate ? 1000 : ms;

    //   // New pose template
    //   if ( isIntermediate) {
    //     this.poseCurrentTemplate = this.poseTemplates['oneknee'];
    //     setTimeout( () => {
    //       this.setPoseFromTemplate(template,ms);
    //     }, duration);
    //   } else {
    //     this.poseCurrentTemplate = template || this.poseCurrentTemplate;
    //   }

    //   // Set target
    //   this.poseTarget = this.poseFactory(this.poseCurrentTemplate, duration);
    //   this.poseWeightOnLeft = true;

    //   // Mirror properties, if necessary
    //   if ( (!isSameTemplate && !isWeightOnLeft) || (isSameTemplate && isWeightOnLeft ) ) {
    //     this.poseTarget.props = this.mirrorPose(this.poseTarget.props);
    //     this.poseWeightOnLeft = !this.poseWeightOnLeft;
    //   }

    //   Object.keys(this.poseDelta.props).forEach( key => {
    //     if ( !this.poseTarget.props.hasOwnProperty(key) ) {
    //       // console.log(key)
    //       this.poseTarget.props[key] = this.poseBase.props[key].clone();
    //       this.poseTarget.props[key].t = this.animClock;
    //       this.poseTarget.props[key].d = duration;
    //     }
    //   });
    //   return;
    // }

    const loader = new GLTFLoader();
    // 使用 glb 文件中的姿势数据
    // const currentPose_candidates = this.poseTransfer.hasOwnProperty(poseName) ? this.poseTransfer[poseName] : ( this.poseDEFAULT.hasOwnProperty(poseName) ? this.poseDEFAULT[poseName] : 'standby0');
    // this.TalkQueue.push(currentPose_candidates); // play
    const currentPose_candedates = this.singlePose[poseName] || (['U_Idle_01_Cycle', 'U_Idle_02_Cycle', 'U_Idle_03_Cycle'][Math.floor(Math.random() * 3)]);
    
    // Priority: set single action for the default pose
    const pose_path = `./animations/${currentPose_candedates}.glb`; // TODO: get path form private property
    const scale_ = new THREE.Vector3(scale, scale, scale);
    const glb = await loader.loadAsync( pose_path ); // without await ? || 将后面的移上来

    let newPose = null;
    const duration = this.TalkQueue.length===0 ? 100 : Math.max(ms, this.SumUpQueueTime())
    console.log('SumUpTime = ' + this.SumUpQueueTime());
    
    if (glb && glb.animations && glb.animations[ndx]) {
      let anim = glb.animations[ndx];
      const props = {};
      anim.tracks.sort((a, b) => {
          let ids1 = a.name.split('.');
          let ids2 = b.name.split('.');
          return ids2[1].localeCompare(ids1[1]);
        });
      anim.tracks.forEach( t => {
        if(t.name.includes('mixamorig')) t.name = t.name.replaceAll('mixamorig','');
        const ids = t.name.split('.');
        if ( ids[1] === 'position' ) { 
          const s_now = (ids[0]+'.scale' in props) ? props[ids[0]+'.scale'] : scale_ ;
          for(let i=0; i<t.values.length; i++ ) {
            t.values[i] = t.values[i] * (i%3===0?s_now.x:(i%3===1?s_now.y:s_now.z));
          }
          props[t.name] = new THREE.Vector3(t.values[0], t.values[1],t.values[2]);
        } else if ( ids[1] === 'quaternion' ) {
          props[t.name] = new THREE.Quaternion(t.values[0],t.values[1],t.values[2],t.values[3]);
        } else if ( ids[1] === 'rotation' ) {
          props[ids[0]+".quaternion"] = new THREE.Quaternion().setFromEuler(new THREE.Euler(t.values[0],t.values[1],t.values[2],'XYZ')).normalize();
        } 
        else if  ( ids[1] === 'scale' ) {
          props[t.name] = new THREE.Vector3(t.values[0], t.values[1], t.values[2]);
        }
      });

      newPose = { props: props};
      if ( props['pelvis.position'] ) {
        if ( props['pelvis.position'].y < 0.5 ) {
          newPose.lying = true;
        } else {
          newPose.standing = true; 
        }
      }
    }
    const o = {
      template: poseName, // 我的定义下template就是名字
      props: this.propsToThreeObjects( newPose )
    }
    for( const [p,val] of Object.entries(o.props) ) {
      val.t = this.animClock; // timestamp
      val.d = ms; // Transition duration
    }
    this.poseTarget = o;

    // Make sure deltas are included in the target
    Object.keys(this.poseDelta.props).forEach( key => {
      if ( !this.poseTarget.props.hasOwnProperty(key) ) {
        // console.log(key)
        this.poseTarget.props[key] = this.poseBase.props[key].clone();
        this.poseTarget.props[key].t = this.animClock;
        this.poseTarget.props[key].d = duration;
      }
    });
    this.poseCurrentTemplate = poseName;

  }

  /**
  * Get morph target value.
  * @param {string} mt Morph target
  * @return {number} Value
  */
  getValue(mt) {
    return this.mtAvatar[mt]?.value;
  }

  /**
  * Set morph target value.
  * @param {string} mt Morph target
  * @param {number} val Value
  * @param {number} [ms=null] Transition time in milliseconds.
  */
  setValue(mt,val,ms=null) {
    if ( this.mtAvatar.hasOwnProperty(mt) ) {
      Object.assign(this.mtAvatar[mt],{ system: val, systemd: ms, needsUpdate: true });
    }
  }


  /**
  * Get mood names.
  * @return {string[]} Mood names.
  */
  getMoodNames() {
    return Object.keys(this.animMoods);
  }

  /**
  * Get current mood.
  * @return {string[]} Mood name.
  */
  getMood() {
    return this.opt.avatarMood;
  }

  /**
  * Set mood.
  * @param {string} s Mood name.
  */
  // 表情控制
  setMood(s) {
    // return; // no need of moods control
    
    s = (s || '').trim().toLowerCase();
    if ( !this.animMoods.hasOwnProperty(s) ) throw new Error("Unknown mood.");
    this.moodName = s;
    this.mood = this.animMoods[this.moodName];

    // Reset morph target baseline // TODO: eyes
    for( let mt of Object.keys(this.mtAvatar) ) {
      let val = this.mtBaselineExceptions.hasOwnProperty(mt) ? this.mtBaselineExceptions[mt] : this.mtBaselineDefault;
      if ( this.mood.baseline.hasOwnProperty(mt) ) {
        val = this.mood.baseline[mt];
      } else if ( this.avatar.baseline?.hasOwnProperty(mt) ) {
        val = this.avatar.baseline[mt];
      }
      this.setBaselineValue( mt, val );
    }

    // Set/replace animations
    this.mood.anims.forEach( x => {
      let i = this.animQueue.findIndex( y => y.template.name === x.name );
      if ( i !== -1 ) {
        this.animQueue.splice(i, 1);
      }
      this.animQueue.push( this.animFactory( x, -1 ) ); // 表情控制，无需添加动作
    });
  
  }


  /**
  * Get morph target names.
  * @return {string[]} Morph target names.
  */
  getMorphTargetNames() {
    return [ 'eyesRotateX', 'eyesRotateY', ...Object.keys(this.mtAvatar)].sort();
  }

  /**
  * Get baseline value for the morph target.
  * @param {string} mt Morph target name
  * @return {number} Value, null if not in baseline
  */
  getBaselineValue( mt ) {
    // console.log("mt = " + mt)
    if ( mt === 'eyesRotateY' ) {
      const ll = this.getBaselineValue('EyeLookOutLeft');
      if ( ll === undefined ) return undefined;
      const lr = this.getBaselineValue('EyeLookInLeft');
      if ( lr === undefined ) return undefined;
      const rl = this.getBaselineValue('EyeLookOutRight');
      if ( rl === undefined ) return undefined;
      const rr = this.getBaselineValue('EyeLookInRight');
      if ( rr === undefined ) return undefined;
      return ll - lr;
    } else if ( mt === 'eyesRotateX' ) {
      const d = this.getBaselineValue('eyesLookDown');
      if ( d === undefined ) return undefined;
      const u = this.getBaselineValue('eyesLookUp');
      if ( u === undefined ) return undefined;
      return d - u;
    } else {
      return this.mtAvatar[mt]?.baseline;
    }
  }

  /**
  * Set baseline for morph target.
  * @param {string} mt Morph target name
  * @param {number} val Value, null if to be removed from baseline
  */
  setBaselineValue( mt, val ) {
    // console.log("mt = " + mt, "val = " + val);
    if ( mt === 'eyesRotateY' ) {
      this.setBaselineValue('EyeLookOutLeft', (val === null) ? null : (val>0 ? val : 0) );
      this.setBaselineValue('EyeLookInLeft', (val === null) ? null : (val>0 ? 0 : -val) );
      this.setBaselineValue('EyeLookOutRight', (val === null) ? null : (val>0 ? 0 : -val) );
      this.setBaselineValue('EyeLookInRight', (val === null) ? null : (val>0 ? val : 0) );
    } else if ( mt === 'eyesRotateX' ) {
      this.setBaselineValue('eyesLookDown', (val === null) ? null : (val>0 ? val : 0) );
      this.setBaselineValue('eyesLookUp', (val === null) ? null : (val>0 ? 0 : -val) );
    } else {
      if ( this.mtAvatar.hasOwnProperty(mt) ) {
        Object.assign(this.mtAvatar[mt],{ base: null, baseline: val, needsUpdate: true });
      }
    }
  }

  /**
  * Get fixed value for the morph target.
  * @param {string} mt Morph target name
  * @return {number} Value, null if not fixed
  */
  getFixedValue( mt ) {
    if ( mt === 'eyesRotateY' ) {
      const ll = this.getFixedValue('EyeLookOutLeft');
      if ( ll === null ) return null;
      const lr = this.getFixedValue('EyeLookInLeft');
      if ( lr === null ) return null;
      const rl = this.getFixedValue('EyeLookOutRight');
      if ( rl === null ) return null;
      const rr = this.getFixedValue('EyeLookInRight');
      if ( rr === null ) return null;
      return ll - lr;
    } else if ( mt === 'eyesRotateX' ) {
      const d = this.getFixedValue('eyesLookDown');
      if ( d === null ) return null;
      const u = this.getFixedValue('eyesLookUp');
      if ( u === null ) return null;
      return d - u;
    } else {
      return this.mtAvatar[mt]?.fixed;
    }
  }

  /**
  * Fix morph target.
  * @param {string} mt Morph target name
  * @param {number} val Value, null if to be removed
  */
  setFixedValue( mt, val, ms=null ) {
    if ( mt === 'eyesRotateY' ) {
      this.setFixedValue('EyeLookOutLeft', (val === null) ? null : (val>0 ? val : 0 ), ms );
      this.setFixedValue('EyeLookInLeft', (val === null) ? null : (val>0 ? 0 : -val ), ms );
      this.setFixedValue('EyeLookOutRight', (val === null) ? null : (val>0 ? 0 : -val ), ms );
      this.setFixedValue('EyeLookInRight', (val === null) ? null : (val>0 ? val : 0 ), ms );
    } else if ( mt === 'eyesRotateX' ) {
      this.setFixedValue('eyesLookDown', (val === null) ? null : (val>0 ? val : 0 ), ms );
      this.setFixedValue('eyesLookUp', (val === null) ? null : (val>0 ? 0 : -val ), ms );
    } else {
      if ( this.mtAvatar.hasOwnProperty(mt) ) {
        Object.assign(this.mtAvatar[mt],{ fixed: val, needsUpdate: true });
      }
    }
  }


  /**
  * Create a new animation based on an animation template.
  * @param {Object} t Animation template
  * @param {number} [loop=false] Number of loops, false if not looped
  * @param {number} [scaleTime=1] Scale template times
  * @param {number} [scaleValue=1] Scale template values
  * @param {boolean} [noClockOffset=false] Do not apply clock offset
  * @return {Object} New animation object.
  */
  animFactory( t, loop = false, scaleTime = 1, scaleValue = 1, noClockOffset = false ) {

    const o = { template: t, ts: [0], vs: {} }; // t: {name: ..., dt: ..., vs: ...}

    // Follow the hierarchy of objects
    let a = t;
    while(1) {
      if ( a.hasOwnProperty(this.stateName) ) {
        a = a[this.stateName];
      } else if ( a.hasOwnProperty(this.moodName) ) {
        a = a[this.moodName];
      } else if ( a.hasOwnProperty(this.poseName) ) {
        a = a[this.poseName];
      } else if ( a.hasOwnProperty(this.viewName) ) {
        a = a[this.viewName];
      } else if ( this.avatar.body && a.hasOwnProperty(this.avatar.body) ) {
        a = a[this.avatar.body];
      } else if ( a.hasOwnProperty('alt') ) {

        // Go through alternatives with probabilities
        let b = a.alt[0];
        if ( a.alt.length > 1 ) {
         // Flip a coin
         const coin = Math.random();
         let p = 0;
         for( let i=0; i<a.alt.length; i++ ) {
           let val = this.valueFn(a.alt[i].p);
           p += (val === undefined ? (1-p)/(a.alt.length-1-i) : val);
           if (coin<p) {
             b = a.alt[i];
             break;
           }
         }
        }
        a = b;

      } else {
        break;
      }
    }

    // Time series
    let delay = this.valueFn(a.delay) || 0;
    if ( Array.isArray(delay) ) {
      delay = this.gaussianRandom(...delay);
    }
    if ( a.hasOwnProperty('dt') ) {
      a.dt.forEach( (x,i) => {
        let val = this.valueFn(x);
        if ( Array.isArray(val) ) {
          val = this.gaussianRandom(...val);
        }
        o.ts[i+1] = o.ts[i] + val;
      });
    } else {
      let l = Object.values(a.vs).reduce( (acc,val) => (val.length > acc) ? val.length : acc, 0);
      o.ts = Array(l+1).fill(0);
    }
    if ( noClockOffset ) {
      o.ts = o.ts.map( x => delay + x * scaleTime );
    } else {
      o.ts = o.ts.map( x => this.animClock + delay + x * scaleTime );
    }

    // Values
    for( let [mt,vs] of Object.entries(a.vs) ) {
      const base = this.getBaselineValue(mt);
      const vals = vs.map( x => {
        x = this.valueFn(x);
        if ( x === null ) {
          return null;
        } else if ( typeof x === 'function' ) {
          return x;
        } else if ( typeof x === 'string' || x instanceof String ) {
          return x.slice();
        } else if ( Array.isArray(x) ) {
          if ( mt === 'gesture' ) {
            return x.slice();
          } else {
            return (base === undefined ? 0 : base) + scaleValue * this.gaussianRandom(...x);
          }
        } else if (typeof x == "boolean") {
          return x;
        } else if ( x instanceof Object && x.constructor === Object ) {
          return Object.assign( {}, x );
        } else {
          return (base === undefined ? 0 : base) + scaleValue * x;
        }
      });

      if ( mt === 'eyesRotateY' ) {
        o.vs['EyeLookOutLeft'] = [null, ...vals.map( x => (x>0) ? x : 0 ) ];
        o.vs['EyeLookInLeft'] = [null, ...vals.map( x => (x>0) ? 0 : -x ) ];
        o.vs['EyeLookOutRight'] = [null, ...vals.map( x => (x>0) ? 0 : -x ) ];
        o.vs['EyeLookInRight'] = [null, ...vals.map( x => (x>0) ? x : 0 ) ];
      } else if ( mt === 'eyesRotateX' ) {
        o.vs['eyesLookDown'] = [null, ...vals.map( x => (x>0) ? x : 0 ) ];
        o.vs['eyesLookUp'] = [null, ...vals.map( x => (x>0) ? 0 : -x ) ];
      } else {
        o.vs[mt] = [null, ...vals];
      }
    }
    for( let mt of Object.keys(o.vs) ) {
      while( o.vs[mt].length <= o.ts.length ) o.vs[mt].push( o.vs[mt][ o.vs[mt].length - 1 ]);
    }

    // Mood
    if ( t.hasOwnProperty("mood") ) o.mood = this.valueFn(t.mood).slice();

    // Loop
    if ( loop ) o.loop = loop;

    return o;
  }

  /**
  * Calculate the correct value based on a given time using the given function.
  * @param {number[]} vstart Start value
  * @param {number[]} vend End value
  * @param {number[]} tstart Start time
  * @param {number[]} tend End time
  * @param {number[]} t Current time
  * @param {function} [fun=null] Ease in/out function, null = linear
  * @return {number} Value based on the given time.
  */
  valueAnimationSeq(vstart,vend,tstart,tend,t,fun=null) {
    vstart = this.valueFn(vstart);
    vend = this.valueFn(vend);
    if ( t < tstart ) t = tstart;
    if ( t > tend ) t = tend;
    let k = (vend - vstart) / (tend - tstart);
    if ( fun ) {
      k *= fun( ( t - tstart ) / (tend - tstart) );
    }
    return k * t + (vstart - k * tstart);
  }

  /**
  * Return gaussian distributed random value between start and end with skew.
  * @param {number} start Start value
  * @param {number} end End value
  * @param {number} [skew=1] Skew
  * @param {number} [samples=5] Number of samples, 1 = uniform distribution.
  * @return {number} Gaussian random value.
  */
  gaussianRandom(start,end,skew=1,samples=5) {
    let r = 0;
    for( let i=0; i<samples; i++) r += Math.random();
    return start + Math.pow(r/samples,skew) * (end - start);
  }

  /**
  * Create a sigmoid function.
  * @param {number} k Sharpness of ease.
  * @return {function} Sigmoid function.
  */
  sigmoidFactory(k) {
    function base(t) { return (1 / (1 + Math.exp(-k * t))) - 0.5; }
    var corr = 0.5 / base(1);
    return function (t) { return corr * base(2 * Math.max(Math.min(t, 1), 0) - 1) + 0.5; };
  }

  /** 
  * Creating asynchronous sleep.
  * @param {number} ms Sleep duration in milliseconds.
  * @returns {Promise} Promise resolved after given time.
  */
  syncSleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
  * Convert value from one range to another.
  * @param {number} value Value
  * @param {number[]} r1 Source range
  * @param {number[]} r2 Target range
  * @return {number} Scaled value
  */
  convertRange( value, r1, r2 ) {
    return (value-r1[0]) * (r2[1]-r2[0]) / (r1[1]-r1[0]) + r2[0];
  }

  /**
  * Animate the avatar.
  * @param {number} t High precision timestamp in ms.
  */
  animate(t) {

    // Are we running?
    if ( !this.isRunning ) return;
    requestAnimationFrame( this.animate.bind(this) );

    // Delta time
    let dt = t - this.animTimeLast;
    if ( dt < this.animFrameDur ) return;
    dt = dt / this.animSlowdownRate;
    this.animClock += dt;
    this.animTimeLast = t;

    let i,j,l,k,vol=0;

    // Statistics start
    if ( this.stats ) {
      this.stats.begin();
    }

    // Listening // UE请求聆听动作
    if ( this.isListening ) {

      // Get input max volume
      this.listeningAnalyzer.getByteFrequencyData(this.volumeFrequencyData);
      let sum = 0;
      for(let i = 0; i < this.volumeFrequencyData.length; i++) {
        sum += this.volumeFrequencyData[i];
      }
      // console.log("音频数据总和:", sum);
      // console.log("原始音频数据:", Array.from(this.volumeFrequencyData).slice(0, 10));
      for (i=2, l=10; i<l; i++) {
        if (this.volumeFrequencyData[i] > vol) {
          vol = this.volumeFrequencyData[i];
        }
      }
      // console.log(`VAD调试 - 当前音量: ${vol}, 平滑音量: ${this.listeningVolume}, 激活阈值: ${this.listeningActiveThresholdLevel}, 静音阈值: ${this.listeningSilenceThresholdLevel}`);
      this.listeningVolume = (this.listeningVolume + vol) / 2;
      if ( this.listeningActive ) {
        this.listeningTimerTotal += dt;
        // console.log(`VAD调试 - 检测到静音 - 计时器: ${this.listeningTimer}ms/${this.listeningSilenceThresholdMs}ms`);
        if ( this.listeningVolume < this.listeningSilenceThresholdLevel ) {
          this.listeningTimer += dt;
          if (this.listeningTimer > this.listeningSilenceThresholdMs) {
            console.log(`VAD调试 - 停止检测 - 静音时间超过阈值`);
            if ( this.listeningOnchange ) this.listeningOnchange('stop',this.listeningTimer);
            this.listeningActive = false;
            this.listeningTimer = 0;
            this.listeningTimerTotal = 0;
          }
        } else {
          this.listeningTimer *= 0.5;
        }
        if (this.listeningTimerTotal > this.listeningActiveDurationMax) {
          // 在这行之前: if ( this.listeningOnchange ) this.listeningOnchange('maxactive');
          console.log(`VAD调试 - 最大活动时间已达到: ${this.listeningTimerTotal}ms/${this.listeningActiveDurationMax}ms`);
          if (this.listeningOnchange) this.listeningOnchange('maxactive');
          this.listeningTimerTotal = 0;
        }
      } else {
        this.listeningTimerTotal += dt;
        // console.log(`VAD调试 - 检测到声音 - 计时器: ${this.listeningTimer}ms/${this.listeningActiveThresholdMs}ms`);
        if ( this.listeningVolume > this.listeningActiveThresholdLevel ) {
          this.listeningTimer += dt;
          if (this.listeningTimer > this.listeningActiveThresholdMs) {
            // 在这行之前: if ( this.listeningOnchange ) this.listeningOnchange('start');
            console.log(`VAD调试 - 开始检测 - 声音持续时间超过阈值`);
            if ( this.listeningOnchange ) this.listeningOnchange('start');
            this.listeningActive = true;
            this.listeningTimer = 0;
            this.listeningTimerTotal = 0;
          }
        } else {
          this.listeningTimer *= 0.5;
        }
        if (this.listeningTimerTotal > this.listeningSilenceDurationMax) {
          console.log(`VAD调试 - 最大静音时间已达到: ${this.listeningTimerTotal}ms/${this.listeningSilenceDurationMax}ms`);
          if ( this.listeningOnchange ) this.listeningOnchange('maxsilence');
          this.listeningTimerTotal = 0;
        }
        // console.log(`VAD调试 - 当前状态: ${this.listeningActive ? '活动' : '静音'}, 总计时器: ${this.listeningTimerTotal}ms`);
      }
    }

    // Speaking // UE请求说话时候的动作（这部分需要规划）
    if ( this.isSpeaking ) {
      vol = 0;
      this.audioAnalyzerNode.getByteFrequencyData(this.volumeFrequencyData);
      for (i=2, l=10; i<l; i++) {
        if (this.volumeFrequencyData[i] > vol) {
          vol = this.volumeFrequencyData[i];
        }
      }
    }
    // Important !
    // Animation loop
    let isEyeContact = null;
    let isHeadMove = null;
    const tasks = [];
    
    if ( Date.now() - this.LastTime >= this.animInterval * 1000 ) {
      if (this.TalkQueue.length === 0) {
        this.TalkQueue.push(
          'standby1'
          // ['standby0', 'standby1', 'standby2'][Math.floor(Math.random() * 3)] 
          //  test for the motion with the most time cost
        )
      }
      this.LastTime = Date.now();
      this.animInterval = this.SumUpQueueTime();

      // const promises = this.TalkQueue.map( animID => {
      //   this.GroupAnimationPlayer(animID)
      // })
      // this.TalkQueue = [];
  
      for( i=0, l=this.TalkQueue.length; i<l; i++) {
        const animID = this.TalkQueue[i];
        
        // this.GroupAnimationConstruct(animID);
        this.GroupAnimationPlayer(animID);
        if ( !this.seqItems || this.seqItems.length === 0  && ! this.currentAction) {  // ! this.isSpeaking
          // this.cleanupSequence();
        }
        this.TalkQueue.splice(i--, 1);
        l--;
      }
    }

    for( i=0, l=this.animQueue.length; i<l; i++ ) {
      // 仅允许eyecontact与viseme
      const x = this.animQueue[i];
      
      if ( this.animClock < x.ts[0] ) continue;

      for( j = x.ndx || 0, k = x.ts.length; j<k; j++ ) {
        if ( this.animClock < x.ts[j] ) break;

        for( let [mt,vs] of Object.entries(x.vs) ) {
          const meta = mt.includes('viseme_') ? mt.split('_')[1] : mt; // mt: e.g. 'viseme_PP'
          if ( this.mtAvatar.hasOwnProperty(meta) ) {
            mt = meta;
            // TODO: 更新视素交互列表
            if ( vs[j+1] === null ) continue; // Last or unknown target, skip

            // Start value and target
            const m = this.mtAvatar[mt];
            if ( vs[j] === null ) vs[j] = m.value; // Fill-in start value
            if ( j === k - 1 ) {
              m.newvalue = vs[j];
            } else {
              m.newvalue = vs[j+1];
              const tdiff = x.ts[j+1] - x.ts[j];
              let alpha = 1;
              if ( tdiff > 0.0001 ) alpha = (this.animClock - x.ts[j]) / tdiff;
              if ( alpha < 1 ) {
                if ( m.easing ) alpha = m.easing(alpha);
                m.newvalue = ( 1 - alpha ) * vs[j] + alpha * m.newvalue;
              }
              if ( m.ref && m.ref !== x.vs && m.ref.hasOwnProperty(mt) ) delete m.ref[mt];
              m.ref = x.vs;
            }

            // Volume effect
            if ( vol ) {
              switch(mt){
                case 'viseme_aa':
                case 'viseme_E':
                case 'viseme_I':
                case 'viseme_O':
                case 'viseme_U':
                  m.newvalue *= 1 + vol / 255 - 0.5;
              }
            }

            // Update
            m.needsUpdate = true;
          // TODO ***: candidate value of `mt` ?
          } else if ( mt === 'eyeContact' && vs[j] !== null && isEyeContact !== false ) {
            isEyeContact = Boolean(vs[j]) && this.useEyeContace;
          } else if ( mt === 'headMove' && vs[j] !== null && isHeadMove !== false ) {
            if ( vs[j] === 0 ) {
              isHeadMove = false;
            } else {
              if ( Math.random() < vs[j] ) isHeadMove = true;
              vs[j] = null;
            }
          } else if ( vs[j] !== null ) {
            tasks.push({ mt: mt, val: vs[j] });
            vs[j] = null;
          }

        }

      }

      // If end timeslot, loop or remove the animation, otherwise keep at it
      if ( j === k ) {
        if ( x.hasOwnProperty('mood') ) this.setMood(x.mood);
        if ( x.loop ) {
          k = ( this.isSpeaking && (x.template.name === 'head' || x.template.name === 'eyes') ) ? 4 : 1; // Restrain
          this.animQueue[i] = this.animFactory( x.template, (x.loop > 0 ? x.loop - 1 : x.loop), 1, 1/k );
        } else {
          this.animQueue.splice(i--, 1);
          l--;
        }
      } else {
        x.ndx = j - 1;
      }

    }

    
    // Tasks
    for( let i=0, l=tasks.length; i<l; i++ ) {
      j = tasks[i].val;

      switch(tasks[i].mt) {

        case 'speak':
          this.speakText(j); // j: 完整的文字返回
          break;

        case 'subtitles':
          if ( this.onSubtitles && typeof this.onSubtitles === "function" ) {
            this.onSubtitles(/[\u4e00-\u9fa5]/.test(j) ? j.trim() : j); // 去除多余空格 「DONE!」
          }
          break;

        case 'pose': 
          this.poseName = j;
          // if (this.TalkQueue == 0) {
            // this.setPoseFromTemplate(
            //   this.poseTemplates[ this.poseName ], 
            //   2000, this.GLBmotion, j
            // );
          break;

        case 'gesture':
          // TODO: check type of `j`
          this.playGesture( ...j, 3, false, 1000, this.GLBmotion, j ); // TODO：这里是加入glb动作的切口
          break;

        case 'function': // TODO: animate also can be added here
          if ( j && typeof j === "function" ) {
            j();
          }
          break;

        case 'moveto':
          break; // ignore original animations
          Object.entries(j.props).forEach( y => {
            if ( y[1] ) {
              this.poseTarget.props[y[0]].copy( y[1] );
            } else {
              this.poseTarget.props[y[0]].copy( this.getPoseTemplateProp(y[0]) );
            }
            this.poseTarget.props[y[0]].t = this.animClock;
            this.poseTarget.props[y[0]].d = (y[1] && y[1].d) ? y[1].d : (y.duration || 2000);
          });
          break;

        case 'handLeft':
          break; // ignore original animations
          this.ikSolve( {
            iterations: 20, root: "clavicle_l", effector: "middle_01_l",
            links: [
              { link: "hand_l", minx: -0.5, maxx: 0.5, miny: -1, maxy: 1, minz: -0.5, maxz: 0.5 },
              { link: "lowerarm_l", minx: -0.5, maxx: 1.5, miny: -1.5, maxy: 1.5, minz: -0.5, maxz: 3 },
              { link: "upperarm_l", minx: -1.5, maxx: 1.5, miny: 0, maxy: 0, minz: -1, maxz: 3 }
            ]
          }, j.x ? new THREE.Vector3(j.x,j.y,j.z) : null, true, j.d );
          break;


        case 'handRight':
          break; // ignore original animations
          this.ikSolve( {
            iterations: 20, root: "clavicle_r", effector: "middle_01_r",
            links: [
              { link: "hand_r", minx: -0.5, maxx: 0.5, miny: -1, maxy: 1, minz: -0.5, maxz: 0.5, maxAngle: 0.1 },
              { link: "lowerarm_r", minx: -0.5, maxx: 1.5, miny: -1.5, maxy: 1.5, minz: -3, maxz: 0.5, maxAngle: 0.2 },
              { link: "upperarm_r", minx: -1.5, maxx: 1.5, miny: 0, maxy: 0, minz: -1, maxz: 3 }
            ]
          }, j.x ? new THREE.Vector3(j.x,j.y,j.z) : null, true, j.d );
          break;
      }
    }

    // Eye contact
    if (isEyeContact || isHeadMove) {

      // Get head position
      e.setFromQuaternion( this.poseAvatar.props['head.quaternion'] );
      e.x = Math.max(-0.9,Math.min(0.9, 2 * e.x - 0.5 ));
      e.y = Math.max(-0.9,Math.min(0.9, -2.5 * e.y));

      if ( isEyeContact ) {
        Object.assign( this.mtAvatar['EyeLookInLeft'], { system: e.y < 0 ? -e.y : 0, needsUpdate: true });
        Object.assign( this.mtAvatar['EyeLookOutLeft'], { system: e.y < 0 ? 0 : e.y, needsUpdate: true });
        Object.assign( this.mtAvatar['EyeLookInRight'], { system: e.y < 0 ? 0 : e.y, needsUpdate: true });
        Object.assign( this.mtAvatar['EyeLookOutRight'], { system: e.y < 0 ? -e.y : 0, needsUpdate: true });

      } else {
        i = this.mtAvatar['EyeLookInLeft'].value - this.mtAvatar['EyeLookOutLeft'].value;
        j = this.gaussianRandom(-0.2,0.2);

      }

    }

    // Make sure we do not overshoot
    if ( dt > 2 * this.animFrameDur ) dt = 2 * this.animFrameDur;

    // Randomize facial expression by changing baseline
    if ( this.viewName !== 'full' ) {
      i = this.mtRandomized[ Math.floor( Math.random() * this.mtRandomized.length ) ];
      j = this.mtAvatar[i];
      if ( !j.needsUpdate ) {
        Object.assign(j,{ base: (this.mood.baseline[i] || 0) + ( 1 + vol/255 ) * Math.random() / 5, needsUpdate: true });
      }
    }

    this.updatePoseBase(this.animClock);
    if ( this.mixer ) {
      this.mixer.update(dt / 1000 * this.mixer.timeScale);
    }
    this.updatePoseDelta();


    // Volume based head movement, set targets
    if ( (this.isSpeaking || this.isListening) && isEyeContact ) {
      if ( vol > this.volumeMax ) {
        this.volumeHeadBase = 0.05;
        if ( Math.random() > 0.6 ) {
          this.volumeHeadTarget = - 0.05 - Math.random() / 15;
        }
        this.volumeMax = vol;
      } else {
        this.volumeMax *= 0.92;
        this.volumeHeadTarget = this.volumeHeadBase - 0.9 * (this.volumeHeadBase - this.volumeHeadTarget);
      }
    } else {
      this.volumeHeadTarget = 0;
      this.volumeMax = 0;
    }
    i = this.volumeHeadTarget - this.volumeHeadCurrent;
    j = Math.abs(i);
    if ( j > 0.0001 ) {
      k = j * (this.volumeHeadEasing( Math.min(1, this.volumeHeadVelocity * dt / 1000 / j ) / 2 + 0.5 ) - 0.5 );
      this.volumeHeadCurrent += Math.sign(i) * Math.min(j,k);
    }
    if ( Math.abs(this.volumeHeadCurrent) > 0.0001 ) {
      q.setFromAxisAngle(axisx, this.volumeHeadCurrent );
      this.objectNeck.quaternion.multiply(q);
    }

    // if ( Date.now() - this.LastTime >= this.animInterval * 1000 ) {
      if (this.startAnim) {
        // Hip-feet balance
        box.setFromObject( this.armature );
        // this.objectLeftToeBase.getWorldPosition(v);
        // this.objectRightToeBase.getWorldPosition(w);
        // this.objectHips.position.y -= box.min.y / 2;
        // this.objectHips.position.x -= (v.x+w.x)/4;
        // this.objectHips.position.z -= (v.z+w.z)/2;
        this.LastTime = Date.now();
        this.animInterval = 7.10;
        this.playAnimation(`./animations/${this.AnimationFA_route[this.startAnim][0]}`, null, 200, 0, 0.01, false);
        this.startAnim = null;
      } else {
        // Update Dynamic Bones
        this.dynamicbones.update(dt);
        // Update morph targets
        this.updateMorphTargets(dt);
      }
    // }
    
    // Camera
    if ( this.cameraClock !== null && this.cameraClock < 1000 ) {
      this.cameraClock += dt;
      if ( this.cameraClock > 1000 ) this.cameraClock = 1000;
      let s = new THREE.Spherical().setFromVector3(this.cameraStart);
      let sEnd = new THREE.Spherical().setFromVector3(this.cameraEnd);
      s.phi += this.easing(this.cameraClock / 1000) * (sEnd.phi - s.phi);
      s.theta += this.easing(this.cameraClock / 1000) * (sEnd.theta - s.theta);
      s.radius += this.easing(this.cameraClock / 1000) * (sEnd.radius - s.radius);
      s.makeSafe();
      this.camera.position.setFromSpherical( s );
      if ( this.controlsStart.x !== this.controlsEnd.x ) {
        this.controls.target.copy( this.controlsStart.lerp( this.controlsEnd, this.easing(this.cameraClock / 1000) ) );
      } else {
        s.setFromVector3(this.controlsStart);
        sEnd.setFromVector3(this.controlsEnd);
        s.phi += this.easing(this.cameraClock / 1000) * (sEnd.phi - s.phi);
        s.theta += this.easing(this.cameraClock / 1000) * (sEnd.theta - s.theta);
        s.radius += this.easing(this.cameraClock / 1000) * (sEnd.radius - s.radius);
        s.makeSafe();
        this.controls.target.setFromSpherical( s );
      }
      this.controls.update();
    }
  

    // Autorotate
    if ( this.controls.autoRotate ) this.controls.update();

    // Statistics end
    if ( this.stats ) {
      this.stats.end();
    }

    this.render();

    // console.log('Animation Trace: ', this.poseTrace);

  }

  /**
  * Reset all the visemes
  */
  resetLips() {
    this.visemeNames.forEach( x => {
      this.morphs.forEach( y => {
        // const ndx = y.morphTargetDictionary['viseme_'+x];
        const ndx = y.morphTargetDictionary[x];
        if ( ndx !== undefined ) {
          y.morphTargetInfluences[ndx] = 0;
        }
      });
    });
  }

  /**
  * Get lip-sync processor based on language. Import module dynamically.
  * @param {string} lang Language
  * @param {string} [path="./"] Module path
  */
  lipsyncGetProcessor(lang, path="./") {
    if ( !this.lipsync.hasOwnProperty(lang) ) {
      const moduleName = path + 'lipsync-' + lang.toLowerCase() + '.mjs';
      const className = 'Lipsync' + lang.charAt(0).toUpperCase() + lang.slice(1);
      import(moduleName).then( module => {
        this.lipsync[lang] = new module[className];
      });
    }
  }
  
  /**
  * Preprocess text for tts/lipsync, including:
  * - convert symbols/numbers to words
  * - filter out characters that should be left unspoken
  * @param {string} s Text
  * @param {string} lang Language
  * @return {string} Pre-processsed text.
  */
  lipsyncPreProcessText(s,lang) {
    const o = this.lipsync[lang] || Object.values(this.lipsync)[0];
    return o.preProcessText(s);
  }

  readThousandNumbers(num) {
      num = parseInt(num, 10); // 默认num为str
      if (num < 0 || num > 9999 || isNaN(num)) return '超出范围';
      if (num === 0) return this.ChineseNumber['0']; // 处理特殊情况 0
  
      let numStr = num.toString();
      let length = numStr.length;
      let result = '';
  
      // 处理千、百、十、个位
      for (let i = 0; i < length; i++) {
          let digit = numStr[i];
          let unitIndex = length - 2 - i; // 计算单位索引
  
          if (digit !== '0') {
              result += this.ChineseNumber[digit] + (unitIndex >= 0 ? this.ChineseUnit[unitIndex] : '');
          } else {
              if (!result.endsWith('零')) result += '零'; // 避免连续多个零
          }
      }
      // 处理"一十"的情况
      result = result.replace(/^一十/, '十'); 
      // 处理末尾可能多余的"零"
      result = result.replace(/零+$/, ''); 
      return result;
  }

  readAllNumbers(num) {
    let numStr = num; // let numStr = num.toString();
    num = parseInt(num, 10); // 默认num为str
    if (num < 0 || num > 9999999999 || isNaN(num)) return '超出范围';
    let length = numStr.length;
    length = length - 1;
    const pref = length % 4 + 1;
    const cuts = length / 4 | 0; // 快速向下取整
    if (cuts === 0) { // length = 4 也是这种情况
      return this.readThousandNumbers(numStr);
    }

    let read_word = this.readThousandNumbers(numStr.slice(0, pref));
    for( let i=0; i<cuts; i++ ) {
      read_word += this.ChineseUnit[2 + cuts - i];
      read_word += this.readThousandNumbers(numStr.slice(pref + i*4, pref + (i+1)*4));
    }
    return read_word;    
  }

  readNumber_behindPoint(num) {
    const numStr = num.toString(); // 为string
    return [... numStr].map(x => this.ChineseNumber[x] || '').join('')
  }

  ReplaceNumberInString(s) {
    const regex = /\d+(\.\d+)?/g; // 匹配整数或小数
    return s.replace(regex, (match) => {
      if (match.includes('.')) {
        const [integerPart, decimalPart] = match.split('.');
        return this.readAllNumbers(integerPart) + '点' + this.readNumber_behindPoint(decimalPart);
      } else {
        return this.readAllNumbers(match);
      }
    });
  }

  /**
  * Convert words to Oculus LipSync Visemes.
  * @param {string} word Word
  * @param {string} lang Language
  * @return {Lipsync} Lipsync object.
  */
  lipsyncWordsToVisemes(word,lang) {
    const o = this.lipsync[lang] || Object.values(this.lipsync)[0];
    return o.wordsToVisemes(word);
  }
  containsChinese(text) {
    return /[\u4e00-\u9fa5]/.test(text);
  }
  preProcessChineseWords(words) {
    // 直接添加空格
    // let cutWords = '';
    // for( let i=1; i<words.length; i++ ) {
    //   if(this.containsChinese(words[i-1]) && this.containsChinese(words[i])) {
    //     cutWords += (words[i-1] + ' ');
    //   } else { // 否则为标点或英文
    //     cutWords += words[i-1];
    //   }
    // }
    // return cutWords;

    const result = segment(words.join(''), { format: OutputFormat.AllString });
  
    // 按照正常nlp的逻辑分词，以空格为分隔符

    return result.origin
            .replace(/(\d)\s(?=\d|\.)/g, '$1') // 合并数字之间的空格
            .replace(/(\d)\s(?=\.\d+)/g, '$1') // 合并小数点前后的空格
            .replace(/(\.\d+)\s(?=\d)/g, '$1') // 合并小数点后数字的空格
            .replace(/(\d)\s(?=D)/g, '$1')  // 合并数字和非数字之间的空格
            .replace(/([0-9])\.\s([0-9])/g, '$1.$2')
  }

  /**
  * Add text to the speech queue.
  * @param {string} s Text.
  * @param {Options} [opt=null] Text-specific options for lipsync/TTS language, voice, rate and pitch, mood and mute
  * @param {subtitlesfn} [onsubtitles=null] Callback when a subtitle is written
  * @param {number[][]} [excludes=null] Array of [start, end] index arrays to not speak
  */
  speakText( s, opt = null, onsubtitles = null, excludes = null, full_string=null, motion_start=false ) {

    opt = opt || {};

    // Classifiers
    // const dividersSentence = /[!\.\?\n\p{Extended_Pictographic}]/ug;
    const dividersSentence = /[。，！？!\?\n\p{Extended_Pictographic}]/ug; // 新增中文断句
    const dividersWord = /[ ]/ug;
    // const speakables = /[\p{L}\p{N},\.\p{Quotation_Mark}!€\$\+\p{Dash_Punctuation}%&\?]/ug;
    const speakables = /[\p{L}\p{N},\.\p{Quotation_Mark}!€\$\+\p{Dash_Punctuation}%&\?。，！？“]/ug; // 新增中文标点
    const emojis = /[\p{Extended_Pictographic}]/ug;
    const lipsyncLang = opt.lipsyncLang || this.avatar.lipsyncLang || this.opt.lipsyncLang;

    let markdownWord = ''; // markdown word
    let textWord = ''; // text-to-speech word
    let markId = 0; // SSML mark id
    let ttsSentence = []; // Text-to-speech sentence
    let lipsyncAnim = []; // Lip-sync animation sequence
    let letters = [... this.lipsyncPreProcessText(s, lipsyncLang)];
    if (motion_start && full_string) {
      const second_per_word = 0.5; // second
      const time_estimated = second_per_word * letters.length;
      const target_pose = time_estimated <= 6.00 ? 'standby1' : (time_estimated * 1.25 <= 7.53 ? 'speech-2' : [
          'talk-1', 'talk-2', 'talk-3', 'talk-4', 'speech-1'
      ][Math.floor(Math.random() * 5)]) ;
      this.TalkQueue.push(target_pose);
      // this.AnimationFA_route[target_pose].forEach(x => this.TalkQueue.push(x));
    }
    


    if (this.containsChinese(letters)) {
      letters = this.preProcessChineseWords(letters);
    } 

    let is_first = true;
    this.EvaluateTime = letters.length / this.word_per_second;
    for( let i=0; i<letters.length; i++ ) {
      const isLast = i === (letters.length-1);
      const isSpeakable = letters[i].match(speakables);
      let isEndOfSentence = letters[i].match(dividersSentence);
      const isEmoji = letters[i].match(emojis);
      const isEndOfWord = letters[i].match(dividersWord);

      // Exception for end-of-sentence is repeated dividers
      if ( isEndOfSentence && !isLast && !isEmoji && letters[i+1].match(dividersSentence) ) {
        isEndOfSentence = false;
      }

      // Add letter to subtitles
      if ( onsubtitles ) {
        markdownWord += letters[i];
      }

      // Add letter to spoken word
      // TODO: dividersWords
      if ( isSpeakable ) {
        if ( !excludes || excludes.every( x => (i < x[0]) || (i > x[1]) ) ) {
          textWord += letters[i];
        }
      }

      // Add words to sentence and animations
      if ( isEndOfWord || isEndOfSentence || isLast ) {
        // Add to text-to-speech sentence
        const flag_ = textWord.match(/[0-9]/ug);
        if ( textWord.length ) {
          // textWord = this.lipsyncPreProcessText(textWord, lipsyncLang);
          ttsSentence.push( {
            mark: markId,
            word: textWord,
            flag: flag_,
            number: flag_ ? this.readAllNumbers(textWord) : ''
          });
        }

        // Push subtitles to animation queue
        if ( markdownWord.length ) {
          // markdownWord = '';
          // if (i!=0 && /[\u4e00-\u9fa5]/.test(letters[i-1])) markdownWord = '';
          lipsyncAnim.push( {
            mark: markId,
            template: { name: 'subtitles' },
            ts: [0],
            vs: {
              subtitles: [markdownWord]
            },
          });
          markdownWord = '';
        }

        // Push visemes to animation queue
        if ( textWord.length ) {
          const val = this.lipsyncWordsToVisemes(textWord.match(/[0-9]/ug) ? this.readAllNumbers(textWord) : textWord, lipsyncLang);
          if ( val && val.visemes && val.visemes.length ) {
            const d = val.times[ val.visemes.length-1 ] + val.durations[ val.visemes.length-1 ];
            for( let j=0; j<val.visemes.length; j++ ) {
              const o =
              lipsyncAnim.push( {
                mark: markId,
                template: { name: 'viseme' },
                ts: [ (val.times[j] - 0.6) / d, (val.times[j] + 0.5) / d, (val.times[j] + val.durations[j] + 0.5) / d ],
                vs: {
                  ['viseme_'+val.visemes[j]]: [null,(val.visemes[j] === 'PP' || val.visemes[j] === 'FF') ? 0.9 : 0.6,0]
                }
              });
            }
          }
          textWord = '';
          markId++;
        }
      }

      // Process sentences
      if ( isEndOfSentence || isLast ) {

        // Send sentence to Text-to-speech queue
        if ( ttsSentence.length || (isLast && lipsyncAnim.length) ) {
          const o = {
            anim: lipsyncAnim
          };
          if ( onsubtitles ) o.onSubtitles = onsubtitles;
          if ( ttsSentence.length && !opt.avatarMute ) {
            o.text = ttsSentence;
            if ( opt.avatarMood ) o.mood = opt.avatarMood;
            if ( opt.ttsLang ) o.lang = opt.ttsLang;
            if ( opt.ttsVoice ) o.voice = opt.ttsVoice;
            if ( opt.ttsRate ) o.rate = opt.ttsRate;
            if ( opt.ttsVoice ) o.pitch = opt.ttsPitch;
            if ( opt.ttsVolume ) o.volume = opt.ttsVolume;
          }
          
          if ( is_first ) {
            o.is_first = is_first;
            is_first = !is_first;
          }

          this.speechQueue.push(o);

          // Reset sentence and animation sequence
          ttsSentence = [];
          textWord = '';
          markId = 0;
          lipsyncAnim = [];
        }

        // Send emoji, if the divider was a known emoji
        if ( isEmoji ) {
          let emoji = this.animEmojis[letters[i]];
          if ( emoji && emoji.link ) emoji = this.animEmojis[emoji.link];
          if ( emoji ) {
            this.speechQueue.push( { emoji: emoji } );
          }
        }
        this.speechQueue.push( { break: 100 * this.duration_factor } );

      }

    }

    this.speechQueue.push( { break: 500 * this.duration_factor } );

    // Start speaking (if not already)
    this.startSpeaking();
  }

  /**
  * Add emoji to speech queue.
  * @param {string} em Emoji.
  */
  async speakEmoji(em) {
    let emoji = this.animEmojis[em];
    if ( emoji && emoji.link ) emoji = this.animEmojis[emoji.link];
    if ( emoji ) {
      this.speechQueue.push( { emoji: emoji } );
    }
    this.startSpeaking();
  }

  /**
  * Add a break to the speech queue.
  * @param {numeric} t Duration in milliseconds.
  */
  async speakBreak(t) {
    this.speechQueue.push( { break: t * this.duration_factor } );
    this.startSpeaking();
  }

  /**
  * Callback when speech queue processes this marker.
  * @param {markerfn} onmarker Callback function.
  */
  async speakMarker(onmarker) {
    this.speechQueue.push( { marker: onmarker } );
    this.startSpeaking();
  }

  /**
  * Play background audio.
  * @param {string} url URL for the audio, stop if null.
  */
  async playBackgroundAudio( url ) {

    // Fetch audio
    let response = await fetch(url);
    let arraybuffer = await response.arrayBuffer();

    // Play audio in a loop
    this.stopBackgroundAudio()
    this.audioBackgroundSource = this.audioCtx.createBufferSource();
    this.audioBackgroundSource.loop = true;
    this.audioBackgroundSource.buffer = await this.audioCtx.decodeAudioData(arraybuffer);
    this.audioBackgroundSource.playbackRate.value = 1 / this.animSlowdownRate;
    this.audioBackgroundSource.connect(this.audioBackgroundGainNode);
    this.audioBackgroundSource.start(0);

  }

  /**
  * Stop background audio.
  */
  stopBackgroundAudio() {
    try { this.audioBackgroundSource.stop(); } catch(error) {}
    this.audioBackgroundSource.disconnect();
  }

  /**
  * Setup the convolver node based on an impulse.
  * @param {string} [url=null] URL for the impulse, dry impulse if null
  */
  async setReverb( url=null ) {
    if ( url ) {
      // load impulse response from file
      let response = await fetch(url);
      let arraybuffer = await response.arrayBuffer();
      this.audioReverbNode.buffer = await this.audioCtx.decodeAudioData(arraybuffer);
    } else {
      // dry impulse
      const samplerate = this.audioCtx.sampleRate;
      const impulse = this.audioCtx.createBuffer(2, samplerate, samplerate);
      impulse.getChannelData(0)[0] = 1;
      impulse.getChannelData(1)[0] = 1;
      this.audioReverbNode.buffer = impulse;
    }
  }

  /**
  * Set audio gain.
  * @param {number} speech Gain for speech, if null do not change
  * @param {number} [background=null] Gain for background audio, if null do not change
  * @param {number} [fadeSecs=0] Gradual exponential fade in/out time in seconds
  */
  setMixerGain( speech, background=null, fadeSecs=0 ) {
    if ( speech !== null ) {
      this.audioSpeechGainNode.gain.cancelScheduledValues(this.audioCtx.currentTime);
      if ( fadeSecs ) {
        this.audioSpeechGainNode.gain.setValueAtTime( Math.max( this.audioSpeechGainNode.gain.value, 0.0001), this.audioCtx.currentTime);
        this.audioSpeechGainNode.gain.exponentialRampToValueAtTime( Math.max( speech, 0.0001), this.audioCtx.currentTime + fadeSecs );
      } else {
        this.audioSpeechGainNode.gain.setValueAtTime( speech, this.audioCtx.currentTime);
      }
    }
    if ( background !== null ) {
      this.audioBackgroundGainNode.gain.cancelScheduledValues(this.audioCtx.currentTime);
      if ( fadeSecs ) {
        this.audioBackgroundGainNode.gain.setValueAtTime( Math.max( this.audioBackgroundGainNode.gain.value, 0.0001), this.audioCtx.currentTime);
        this.audioBackgroundGainNode.gain.exponentialRampToValueAtTime( Math.max( background, 0.0001 ), this.audioCtx.currentTime + fadeSecs );
      } else {
        this.audioBackgroundGainNode.gain.setValueAtTime( background, this.audioCtx.currentTime);
      }
    }
  }

  /**
  * Add audio to the speech queue.
  * @param {Audio} r Audio message.
  * @param {Options} [opt=null] Text-specific options for lipsyncLang
  * @param {subtitlesfn} [onsubtitles=null] Callback when a subtitle is written
  */

  // USELESS
  speakAudio(r, opt = null, onsubtitles = null ) {
    opt = opt || {};
    const lipsyncLang = opt.lipsyncLang || this.avatar.lipsyncLang || this.opt.lipsyncLang;
    const o = {};


    if ( r.words ) {
      let lipsyncAnim = [];
      for( let i=0; i<r.words.length; i++ ) {
        const word = r.words[i];
        const time = r.wtimes[i];
        let duration = r.wdurations[i];

        if ( word.length ) {

          // Subtitle
          if ( onsubtitles ) {
            lipsyncAnim.push( {
              template: { name: 'subtitles' },
              ts: [time],
              vs: {
                subtitles: [' ' + word]
                // subtitles: [word]
              }
            });
          }

          // If visemes were not specified, calculate visemes based on the words
          if ( !r.visemes ) {
            const wrd = this.lipsyncPreProcessText(word, lipsyncLang);
            const val = this.lipsyncWordsToVisemes(wrd, lipsyncLang);
            if ( val && val.visemes && val.visemes.length ) {
              const dTotal = val.times[ val.visemes.length-1 ] + val.durations[ val.visemes.length-1 ];
              const overdrive = Math.min(duration, Math.max( 0, duration - val.visemes.length * 150));
              let level = 0.6 + this.convertRange( overdrive, [0,duration], [0,0.4]);
              duration = Math.min( duration, val.visemes.length * 200 );
              if ( dTotal > 0 ) {
                for( let j=0; j<val.visemes.length; j++ ) {
                  const t = time + (val.times[j]/dTotal) * duration;
                  const d = (val.durations[j]/dTotal) * duration;
                  lipsyncAnim.push( {
                    template: { name: 'viseme' },
                    ts: [ t - Math.min(60,2*d/3), t + Math.min(25,d/2), t + d + Math.min(60,d/2) ],
                    vs: {
                      ['viseme_'+val.visemes[j]]: [null,(val.visemes[j] === 'PP' || val.visemes[j] === 'FF') ? 0.9 : level, 0]
                    }
                  });
                }
              }
            }
          }
        }
      }

      // If visemes were specified, use them
      if ( r.visemes ) {
        for( let i=0; i<r.visemes.length; i++ ) {
          const viseme = r.visemes[i];
          const time = r.vtimes[i];
          const duration = r.vdurations[i];
          lipsyncAnim.push( {
            template: { name: 'viseme' },
            ts: [ time - 2 * duration/3, time + duration/2, time + duration + duration/2 ],
            vs: {
              ['viseme_'+viseme]: [null,(viseme === 'PP' || viseme === 'FF') ? 0.9 : 0.6, 0]
            }
          });
        }
      }

      // Timed marker callbacks
      if ( r.markers ) {
        for( let i=0; i<r.markers.length; i++ ) {
          const fn = r.markers[i];
          const time = r.mtimes[i];
          lipsyncAnim.push( {
            template: { name: 'markers' },
            ts: [ time ],
            vs: { "function": [fn] }
          });
        }
      }

      if ( lipsyncAnim.length ) {
        o.anim = lipsyncAnim;
      }

    }

    if ( r.audio ) {
      o.audio = r.audio;
    }

    // Blend shapes animation
    if (r.anim?.name ) {
      let animObj = this.animFactory(r.anim, false, 1, 1, true);
      if (!o.anim) {
        o.anim = [ animObj ];
      } else {
        o.anim.push(animObj);
      }
    }

    if ( onsubtitles ) {
      o.onSubtitles = onsubtitles;
    }

    if ( Object.keys(o).length ) {
      this.speechQueue.push(o);
      this.speechQueue.push( { break: 300 * this.duration_factor } );
      this.startSpeaking();
    }

  }

  /**
  * Play audio playlist using Web Audio API.
  * @param {boolean} [force=false] If true, forces to proceed
  */
  async playAudio(force=false) {
    if ( !this.armature || (this.isAudioPlaying && !force) ) return;
    this.isAudioPlaying = true;
    if ( this.audioPlaylist.length ) {
      const item = this.audioPlaylist.shift();

      // If Web Audio API is suspended, try to resume it
      if ( this.audioCtx.state === "suspended" || this.audioCtx.state === "interrupted" ) {
        const resume = this.audioCtx.resume();
        const timeout = new Promise((_r, rej) => setTimeout(() => rej("p2"), 1000));
        try {
          await Promise.race([resume, timeout]);
        } catch(e) {
          console.log("Can't play audio. Web Audio API suspended. This is often due to calling some speak method before the first user action, which is typically prevented by the browser.");
          this.playAudio(true);
          return;
        }
      }

      // AudioBuffer
      let audio;
      if ( Array.isArray(item.audio) ) {
        // Convert from PCM samples
        let buf = this.concatArrayBuffers( item.audio );
        audio = this.pcmToAudioBuffer(buf);
      } else {
        audio = item.audio;
      }

      // Create audio source
      this.audioSpeechSource = this.audioCtx.createBufferSource();
      this.audioSpeechSource.buffer = audio;
      this.audioSpeechSource.playbackRate.value = 1 / this.animSlowdownRate;
      this.audioSpeechSource.connect(this.audioAnalyzerNode);
      this.audioSpeechSource.addEventListener('ended', () => {
        this.audioSpeechSource.disconnect();
        this.playAudio(true);
      }, { once: true });

      // Rescale lipsync and push to queue
      let delay = 0;
      if ( item.anim ) { // 直接来自于line.anim (audioPlaylist.push({anim: line.anim, audio: line.audio})) 
        // line.anim: { template: 'visemes', ts: ..., vs: ...}
        // TODO: check here
        // Find the lowest negative time point, if any
        delay = Math.abs(Math.min(0, ...item.anim.map( x => Math.min(...x.ts) ) ) );
        item.anim.forEach( x => {
          for(let i=0; i<x.ts.length; i++) {
            x.ts[i] = this.animClock + x.ts[i] + delay;
          }
          this.animQueue.push(x);
        });
      }

      // Play, dealy in seconds so pre-animations can be played
      this.audioSpeechSource.start(delay/1000);

    } else {
      this.isAudioPlaying = false;
      this.startSpeaking(true);
    }
  }

  /**
  * Take the next queue item from the speech queue, convert it to text, and
  * load the audio file.
  * @param {boolean} [force=false] If true, forces to proceed (e.g. after break)
  */
  async startSpeaking( force = false ) {
    if ( !this.armature || (this.isSpeaking && !force) ) return;
    this.stateName = 'speaking';
    this.isSpeaking = true;
    if ( this.speechQueue.length ) {
      let line = this.speechQueue.shift();

      // const able_to_push = line.hasOwnProperty('is_first') ? line.is_first : false;
      const  able_to_push = false;

      if ( line.emoji ) {
          // Look at the camera
          this.lookAtCamera(500);

          // Only emoji
          let duration = line.emoji.dt.reduce((a,b) => a+b,0);
          this.animQueue.push( this.animFactory( line.emoji ) );
          setTimeout( this.startSpeaking.bind(this), duration, true );
        
      } else if ( line.break ) {
        // Break
        setTimeout( this.startSpeaking.bind(this), line.break, true );
      } else if ( line.audio ) {

        // Look at the camera
        this.lookAtCamera(500);
        

        // Make a playlist
        this.audioPlaylist.push({ anim: line.anim, audio: line.audio });
        // this.speakWithHands(undefined, undefined, able_to_push);
        this.onSubtitles = line.onSubtitles || null;
        this.resetLips();
        if ( line.mood ) this.setMood( line.mood );
        this.playAudio();

      } else if ( line.text ) {
        // 发送给TTS生成语音
        // Look at the camera
        this.lookAtCamera(500);
        let flag = ! /[\u4e00-\u9fa5]/.test(line.text[0].word);
        let prefix = "<mark name='";
        // Spoken text
        try {
          // Convert text to SSML
          let ssml = "<speak>";
          line.text.forEach( (x,i) => {
            // Add mark
            if (i > 0) {
              if( flag ) {
                prefix = " " + prefix;
              }
              if(x.flag) {
                ssml += prefix + x.number + "'/>";
              } else {
                flag = ! /[\u4e00-\u9fa5]/.test(x.word);
                ssml += prefix + x.mark + "'/>";
              }
              prefix = "<mark name='";
            }
            // Add word
            ssml += x.word.replaceAll('&','&amp;')
              .replaceAll('<','&lt;')
              .replaceAll('>','&gt;')
              .replaceAll('"','&quot;')
              .replaceAll('\'','&apos;')
              .replace(/^\p{Dash_Punctuation}$/ug,'<break time="400ms"/>');
              // 750ms -> 400ms

          });
          ssml += "</speak>";


          const o = {
            method: "POST",
            headers: {
              "Content-Type": "application/json; charset=utf-8"
            },
            body: JSON.stringify({
              "input": {
                "ssml": ssml
              },
              "voice": {
                "languageCode": line.lang || this.avatar.ttsLang || this.opt.ttsLang,
                "name": line.voice || this.avatar.ttsVoice || this.opt.ttsVoice
              },
              "audioConfig": {
                "audioEncoding": this.ttsAudioEncoding,
                "speakingRate": (line.rate || this.avatar.ttsRate || this.opt.ttsRate) + this.mood.speech.deltaRate,
                "pitch": (line.pitch || this.avatar.ttsPitch || this.opt.ttsPitch) + this.mood.speech.deltaPitch,
                "volumeGainDb": (line.volume || this.avatar.ttsVolume || this.opt.ttsVolume) + this.mood.speech.deltaVolume
              },
              "enableTimePointing": [ 1 ] // Timepoint information for mark tags
            })
          };

          // JSON Web Token
          if ( this.opt.jwtGet && typeof this.opt.jwtGet === "function" ) {
            o.headers["Authorization"] = "Bearer " + await this.opt.jwtGet();
          }

          const res = await fetch( this.opt.ttsEndpoint + (this.opt.ttsApikey ? "?key=" + this.opt.ttsApikey : ''), o);
          const data = await res.json();
          await this.syncSleep( Math.min(Math.floor(Math.random() * 100) + 10, 200) ); // 需要根据服务器性能调整 * 2~10
          

          if ( res.status === 200 && data && data.audioContent ) {

            // Audio data
            const buf = this.b64ToArrayBuffer(data.audioContent);
            const audio = await this.audioCtx.decodeAudioData( buf );
            

            // Workaround for Google TTS not providing all timepoints
            const times = [ 0 ];
            let markIndex = 0;
            line.text.forEach( (x,i) => {
              if ( i > 0 ) {
                let ms = times[ times.length - 1 ];
                if ( data.timepoints[markIndex] ) {
                  ms = data.timepoints[markIndex].timeSeconds * 1000;
                  if ( data.timepoints[markIndex].markName === ""+x.mark ) {
                    markIndex++;
                  }
                }
                times.push( ms );
              }
            });
            // this.speakWithHands(undefined, undefined, able_to_push);

            // Word-to-audio alignment
            const timepoints = [ { mark: 0, time: 0 } ];
            times.forEach( (x,i) => {
              if ( i>0 ) {
                let prevDuration = x - times[i-1];
                if ( prevDuration > 150 ) prevDuration - 150; // Trim out leading space
                timepoints[i-1].duration = prevDuration;
                timepoints.push( { mark: i, time: x });
              }
            });
            let d = 1000 * audio.duration; // Duration in ms
            if ( d > this.opt.ttsTrimEnd ) d = d - this.opt.ttsTrimEnd; // Trim out silence at the end
            timepoints[timepoints.length-1].duration = d - timepoints[timepoints.length-1].time;

            // Re-set animation starting times and rescale durations
            line.anim.forEach( x => {
              const timepoint = timepoints[x.mark];
              if ( timepoint ) {
                for(let i=0; i<x.ts.length; i++) {
                  x.ts[i] = timepoint.time + (x.ts[i] * timepoint.duration) + this.opt.ttsTrimStart;
                }
              }
            });

            // Add to the playlist
            this.audioPlaylist.push({ anim: line.anim, audio: audio });
            this.onSubtitles = line.onSubtitles || null; // addText
            this.resetLips();
            if ( line.mood ) this.setMood( line.mood ); // (TODO4, TODO5) => 也可以在这里加动作驱动
            this.playAudio();

          } else {
            this.startSpeaking(true);
          }
        } catch (error) {
          console.error("Error:", error);
          this.startSpeaking(true);
        }
      } else if ( line.anim ) {
        // Only subtitles
          this.onSubtitles = line.onSubtitles || null;
          this.resetLips();
          if ( line.mood ) this.setMood( line.mood );
          line.anim.forEach( (x,i) => {
            for(let j=0; j<x.ts.length; j++) {
              x.ts[j] = this.animClock  + 10 * i;
            }
            this.animQueue.push(x);
          });
          setTimeout( this.startSpeaking.bind(this), 10 * line.anim.length, true );
        
      } else if ( line.marker ) {
        if ( typeof line.marker === "function" ) {
          line.marker();
        }
        this.startSpeaking(true);
      } else {
        this.startSpeaking(true);
      }
    } else {
      this.stateName = 'idle';
      this.isSpeaking = false;
    }
  }

  /**
  * Pause speaking.
  */
  pauseSpeaking() {
    try { this.audioSpeechSource.stop(); } catch(error) {}
    this.audioPlaylist.length = 0;
    this.stateName = 'idle';
    this.isSpeaking = false;
    this.isAudioPlaying = false;
    this.animQueue = this.animQueue.filter( x  => x.template.name !== 'viseme' && x.template.name !== 'subtitles' && x.template.name !== 'blendshapes' );
    if ( this.armature ) {
      this.resetLips();
      this.render();
    }
  }

  /**
  * Stop speaking and clear the speech queue.
  */
  stopSpeaking() {
    try { this.audioSpeechSource.stop(); } catch(error) {}
    this.audioPlaylist.length = 0;
    this.speechQueue.length = 0;
    this.animQueue = this.animQueue.filter( x  => x.template.name !== 'viseme' && x.template.name !== 'subtitles' && x.template.name !== 'blendshapes' );
    this.stateName = 'idle';
    this.isSpeaking = false;
    this.isAudioPlaying = false;
    if ( this.armature ) {
      this.resetLips();
      this.render();
    }
  }

  /**
  * Make eye contact.
  * @param {number} t Time in milliseconds
  */
  makeEyeContact(t) {
    this.animQueue.push( this.animFactory( {
      name: 'eyecontact', dt: [0,t], vs: { eyeContact: [1] }
    }));
  }

  /**
  * Look ahead.
  * @param {number} t Time in milliseconds
  */
  lookAhead(t) {
    // return;


    if ( t ) {
      // Randomize head/eyes ratio
      let drotx = (Math.random() - 0.5) / 4;
      let droty = (Math.random() - 0.5) / 4;

      // Remove old, if any
      let old = this.animQueue.findIndex( y => y.template.name === 'lookat' );
      if ( old !== -1 ) {
        this.animQueue.splice(old, 1);
      }

      // Add new anim
      const templateLookAt = {
        name: 'lookat',
        dt: [750,t],
        vs: {
          bodyRotateX: [ drotx ],
          bodyRotateY: [ droty ],
          eyesRotateX: [ - 3 * drotx + 0.1 ],
          eyesRotateY: [ - 5 * droty ],
          browInnerUp: [[0,0.7]],
          MouthLeft: [[0,0.7]],
          mouthRight: [[0,0.7]],
          eyeContact: [0],
          headMove: [0]
        }
      };
      this.animQueue.push( this.animFactory( templateLookAt ) );
    }
    

  }

  /**
  * Turn head and eyes to look at the camera.
  * @param {number} t Time in milliseconds
  */
  lookAtCamera(t) {
    if ( this.avatar.hasOwnProperty('avatarIgnoreCamera') ) {
      if ( this.avatar.avatarIgnoreCamera ) {
        this.lookAhead(t);
      } else {
        this.lookAt( null, null, t );
      }
    } else if ( this.opt.avatarIgnoreCamera ) {
      this.lookAhead(t);
    } else {
      this.lookAt( null, null, t );
    }

  }

  /**
  * Turn head and eyes to look at the point (x,y).
  * @param {number} x X-coordinate relative to visual viewport
  * @param {number} y Y-coordinate relative to visual viewport
  * @param {number} t Time in milliseconds
  */
  lookAt(x,y,t) {
    return;
    // Eyes position
    const rect = this.nodeAvatar.getBoundingClientRect();
    this.objectLeftEye.updateMatrixWorld(true);
    this.objectRightEye.updateMatrixWorld(true);
    const plEye = new THREE.Vector3().setFromMatrixPosition(this.objectLeftEye.matrixWorld);
    const prEye = new THREE.Vector3().setFromMatrixPosition(this.objectRightEye.matrixWorld);
    const pEyes = new THREE.Vector3().addVectors( plEye, prEye ).divideScalar( 2 );

    pEyes.project(this.camera);
    let eyesx = (pEyes.x + 1) / 2 * rect.width + rect.left;
    let eyesy  = -(pEyes.y - 1) / 2 * rect.height + rect.top;

    // if coordinate not specified, look at the camera
    if ( x === null ) x = eyesx;
    if ( y === null ) y = eyesy;

    // Use body/camera rotation to determine the required head rotation
    q.copy( this.poseTarget.props['pelvis.quaternion'] );
    q.multiply( this.poseTarget.props['spine_01.quaternion'] );
    q.multiply( this.poseTarget.props['spine_02.quaternion'] );
    q.multiply( this.poseTarget.props['spine_03.quaternion'] );
    if (this.poseTarget.hasOwnProperty('spine_04.quaternion')) { q.multiply( this.poseTarget.props['spine_04.quaternion'] );}
    if (this.poseTarget.hasOwnProperty('spine_05.quaternion')) { q.multiply( this.poseTarget.props['spine_05.quaternion'] );}
    if (this.poseTarget.hasOwnProperty('spine_06.quaternion')) { q.multiply( this.poseTarget.props['spine_06.quaternion'] );}
    q.multiply( this.poseTarget.props['neck_01.quaternion'] );
    if (this.poseTarget.hasOwnProperty('neck_02.quaternion')) q.multiply( this.poseTarget.props['neck_02.quaternion'] );
    q.multiply( this.poseTarget.props['head.quaternion'] );
    e.setFromQuaternion(q);
    let rx = e.x / (40/24); // Refer to setValue(bodyRotateX)
    let ry = e.y / (9/4); // Refer to setValue(bodyRotateY)
    let camerarx = Math.min(0.4, Math.max(-0.4,this.camera.rotation.x));
    let camerary = Math.min(0.4, Math.max(-0.4,this.camera.rotation.y));

    // Calculate new delta
    let maxx = Math.max( window.innerWidth - eyesx, eyesx );
    let maxy = Math.max( window.innerHeight - eyesy, eyesy );
    let rotx = this.convertRange(y,[eyesy-maxy,eyesy+maxy],[-0.3,0.6]) - rx + camerarx;
    let roty = this.convertRange(x,[eyesx-maxx,eyesx+maxx],[-0.8,0.8]) - ry + camerary;
    rotx = Math.min(0.6,Math.max(-0.3,rotx));
    roty = Math.min(0.8,Math.max(-0.8,roty));

    // Randomize head/eyes ratio
    let drotx = (Math.random() - 0.5) / 4;
    let droty = (Math.random() - 0.5) / 4;

    if ( t ) {

      // Remove old, if any
      let old = this.animQueue.findIndex( y => y.template.name === 'lookat' );
      if ( old !== -1 ) {
        this.animQueue.splice(old, 1);
      }

      // Add new anim
      const templateLookAt = {
        name: 'lookat',
        dt: [750,t],
        vs: {
          bodyRotateX: [ rotx + drotx ],
          bodyRotateY: [ roty + droty ],
          eyesRotateX: [ - 3 * drotx + 0.1 ],
          eyesRotateY: [ - 5 * droty ],
          browInnerUp: [[0,0.7]],
          MouthLeft: [[0,0.7]],
          mouthRight: [[0,0.7]],
          eyeContact: [0],
          headMove: [0]
        }
      };
      this.animQueue.push( this.animFactory( templateLookAt ) );
    }
  }


  /**
  * Set the closest hand to touch at (x,y).
  * @param {number} x X-coordinate relative to visual viewport
  * @param {number} y Y-coordinate relative to visual viewport
  * @return {Boolean} If true, (x,y) touch the avatar
  */
  touchAt(x,y) {

    const rect = this.nodeAvatar.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ( (x - rect.left) / rect.width ) * 2 - 1,
      - ( (y - rect.top) / rect.height ) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer,this.camera);
    const intersects = raycaster.intersectObject(this.armature);
    if ( intersects.length > 0 ) {
      const target = intersects[0].point;
      const upperarm_lPos = new THREE.Vector3();
      const upperarm_rPos = new THREE.Vector3();
      this.objectupperarm_l.getWorldPosition(upperarm_lPos);
      this.objectupperarm_r.getWorldPosition(upperarm_rPos);
      const LeftD2 = upperarm_lPos.distanceToSquared(target);
      const RightD2 = upperarm_rPos.distanceToSquared(target);
      if ( LeftD2 < RightD2 ) {
        this.ikSolve( {
          iterations: 20, root: "clavicle_l", effector: "middle_01_l",
          links: [
            { link: "hand_l", minx: -0.5, maxx: 0.5, miny: -1, maxy: 1, minz: -0.5, maxz: 0.5, maxAngle: 0.1 },
            { link: "lowerarm_l", minx: -0.5, maxx: 1.5, miny: -1.5, maxy: 1.5, minz: -0.5, maxz: 3, maxAngle: 0.2 },
            { link: "upperarm_l", minx: -1.5, maxx: 1.5, miny: 0, maxy: 0, minz: -1, maxz: 3 }
          ]
        }, target, false, 1000 );
        this.setValue("handFistLeft",0);
      } else {
        this.ikSolve( {
          iterations: 20, root: "clavicle_r", effector: "middle_01_r",
          links: [
            { link: "hand_r", minx: -0.5, maxx: 0.5, miny: -1, maxy: 1, minz: -0.5, maxz: 0.5, maxAngle: 0.1 },
            { link: "lowerarm_r", minx: -0.5, maxx: 1.5, miny: -1.5, maxy: 1.5, minz: -3, maxz: 0.5, maxAngle: 0.2 },
            { link: "upperarm_r", minx: -1.5, maxx: 1.5, miny: 0, maxy: 0, minz: -1, maxz: 3 }
          ]
        }, target, false, 1000 );
        this.setValue("handFistRight",0);
      }
    } else {
      ["upperarm_l","lowerarm_l","hand_l","upperarm_r","lowerarm_r","hand_r"].forEach( x => {
        let key = x + ".quaternion";
        this.poseTarget.props[key].copy( this.getPoseTemplateProp(key, UseglbTemplate=this.GLBmotion) );
        this.poseTarget.props[key].t = this.animClock;
        this.poseTarget.props[key].d = 1000;
      });
    }

    return ( intersects.length > 0 );
  }

  /**
  * Talk with hands.
  * @param {number} [delay=0] Delay in milliseconds
  * @param {number} [prob=1] Probability of hand movement
  */
  speakWithHands(delay=0,prob=0.5,able_to_push=false) {
    return;

      // Only if we are standing and not bending and probabilities match up
    
      if ( this.mixer || this.gesture || !this.poseTarget.template.standing || this.poseTarget.template.bend || Math.random()>prob ) return;

      // Random targets for left hand
      // this.ikSolve( {
      //   root: "clavicle_l", effector: "middle_01_l",
      //   links: [
      //     { link: "hand_l", minx: -0.5, maxx: 0.5, miny: -1, maxy: 1, minz: -0.5, maxz: 0.5 },
      //     { link: "lowerarm_l", minx: -0.5, maxx: 1.5, miny: -1.5, maxy: 1.5, minz: -0.5, maxz: 3 },
      //     { link: "upperarm_l", minx: -1.5, maxx: 1.5, miny: -1.5, maxy: 1.5, minz: -1, maxz: 3 }
      //   ]
      // }, new THREE.Vector3(
      //   this.gaussianRandom(0,0.5),
      //   this.gaussianRandom(-0.8,-0.2),
      //   this.gaussianRandom(0,0.5)
      // ), true);

      // Random target for right hand
      // this.ikSolve( {
      //   root: "clavicle_r", effector: "middle_01_r",
      //   links: [
      //     { link: "hand_r", minx: -0.5, maxx: 0.5, miny: -1, maxy: 1, minz: -0.5, maxz: 0.5 },
      //     { link: "lowerarm_r", minx: -0.5, maxx: 1.5, miny: -1.5, maxy: 1.5, minz: -3, maxz: 0.5 },
      //     { link: "upperarm_r" }
      //   ]
      // }, new THREE.Vector3(
      //   this.gaussianRandom(-0.5,0),
      //   this.gaussianRandom(-0.8,-0.2),
      //   this.gaussianRandom(0,0.5)
      // ), true);

      // Moveto
      const dt = [];
      const moveto = [];

      // First move
      dt.push( 100 + Math.round( Math.random() * 500 ) );
      moveto.push( { duration: 1000, props: {
        "hand_l.quaternion": new THREE.Quaternion().setFromEuler( new THREE.Euler( 0, -1 - Math.random(), 0 ) ),
        "hand_r.quaternion": new THREE.Quaternion().setFromEuler( new THREE.Euler( 0, 1 + Math.random(), 0 ) )
      } } );
      ["upperarm_l","lowerarm_l","upperarm_r","lowerarm_r"].forEach( x => {
        moveto[0].props[x+'.quaternion'] = this.ikMesh.getObjectByName(x).quaternion.clone();
      });

      // Return to original target
      dt.push( 1000 + Math.round( Math.random() * 500 ) );
      moveto.push( { duration: 2000, props: {} } );
      ["upperarm_l","lowerarm_l","upperarm_r","lowerarm_r","hand_l","hand_r"].forEach( x => {
        moveto[1].props[x+'.quaternion'] = null;
      });

      // Make an animation
      const anim = this.animFactory( {
        name: 'talkinghands',
        delay: delay,
        dt: dt,
        vs: { moveto: moveto }
      });
      this.animQueue.push( anim );

  }

  /**
  * Get slowdown.
  * @return {numeric} Slowdown factor.
  */
  getSlowdownRate(k) {
    return this.animSlowdownRate;
  }

  /**
  * Set slowdown.
  * @param {numeric} k Slowdown factor.
  */
  setSlowdownRate(k) {
    this.animSlowdownRate = k;
    this.audioSpeechSource.playbackRate.value = 1 / this.animSlowdownRate;
    this.audioBackgroundSource.playbackRate.value = 1 / this.animSlowdownRate;
  }

  /**
  * Get autorotate speed.
  * @return {numeric} Autorotate speed.
  */
  getAutoRotateSpeed(k) {
    return this.controls.autoRotateSpeed;
  }

  /**
  * Set autorotate.
  * @param {numeric} speed Autorotate speed, e.g. value 2 = 30 secs per orbit at 60fps.
  */
  setAutoRotateSpeed(speed) {
    this.controls.autoRotateSpeed = speed;
    this.controls.autoRotate = (speed > 0);
  }

  /**
  * Start animation cycle.
  */
  start() {
    if ( this.armature && this.isRunning === false ) {
      this.audioCtx.resume();
      this.animTimeLast = performance.now();
      this.isRunning = true;
      requestAnimationFrame( this.animate.bind(this) );
    }
  }

  /**
  * Stop animation cycle.
  */
  stop() {
    this.isRunning = false;
    this.audioCtx.suspend();
  }

  /**
  * Start listening incoming audio.
  * @param {AnalyserNode} analyzer Analyzer node for incoming audio
  * @param {Object} [opt={}] Options
  * @param {function} [onchange=null] Callback function for start
  */
  startListening(analyzer, opt = {}, onchange = null) {
    this.listeningAnalyzer = analyzer;
    console.log("分析器频率计数:", this.listeningAnalyzer.frequencyBinCount);
    console.log("volumeFrequencyData大小:", this.volumeFrequencyData.length);
    console.log("麦克风初始化状态:", this.listeningAnalyzer ? "成功" : "失败");
    console.log("音频上下文状态:", this.audioCtx.state);
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().then(() => {
        console.log('AudioContext已恢复');
      }).catch(err => {
        console.error('恢复AudioContext失败:', err);
      });
    }
    this.listeningAnalyzer.fftSize = 256;
    this.listeningAnalyzer.smoothingTimeConstant = 0.1;
    this.listeningAnalyzer.minDecibels = -70;
    this.listeningAnalyzer.maxDecibels = -10;
    this.listeningOnchange = (onchange && typeof onchange === 'function') ? onchange : null;

    this.listeningSilenceThresholdLevel = opt?.hasOwnProperty('listeningSilenceThresholdLevel') ? opt.listeningSilenceThresholdLevel : this.opt.listeningSilenceThresholdLevel;
    this.listeningSilenceThresholdMs = opt?.hasOwnProperty('listeningSilenceThresholdMs') ? opt.listeningSilenceThresholdMs : this.opt.listeningSilenceThresholdMs;
    this.listeningSilenceDurationMax = opt?.hasOwnProperty('listeningSilenceDurationMax') ? opt.listeningSilenceDurationMax : this.opt.listeningSilenceDurationMax;
    this.listeningActiveThresholdLevel = opt?.hasOwnProperty('listeningActiveThresholdLevel') ? opt.listeningActiveThresholdLevel : this.opt.listeningActiveThresholdLevel;
    this.listeningActiveThresholdMs = opt?.hasOwnProperty('listeningActiveThresholdMs') ? opt.listeningActiveThresholdMs : this.opt.listeningActiveThresholdMs;
    this.listeningActiveDurationMax = opt?.hasOwnProperty('listeningActiveDurationMax') ? opt.listeningActiveDurationMax : this.opt.listeningActiveDurationMax;
    this.volumeFrequencyData = new Uint8Array(this.listeningAnalyzer.frequencyBinCount);
    this.listeningActive = false;
    this.listeningVolume = 0;
    this.listeningTimer = 0;
    this.listeningTimerTotal = 0;
    this.isListening = true;
  }

  /**
  * Stop animation cycle.
  */
  stopListening() {
    this.isListening = false;
  }

  async cleanupSequence() {
    if (!this.mixer) return;
    if (this._seqFinishedHandler) {
      try { this.mixer.removeEventListener('finished', this._seqFinishedHandler); } catch(e) {}
      this._seqFinishedHandler = null;
    }
    try { this.mixer.stopAllAction(); } catch(e) {}
    try {
      if (this.mixer._actions) {
        this.mixer._actions.forEach(a => {
          try { this.mixer.uncacheAction(a.getClip(), this.armature); } catch(e) {}
        });
      }
    } catch(e) {}
    this.mixer = null;
    this.currentAction = null;
    this.stopSequence = null;
    await this.playAnimation(`./animations/U_Idle_01_Cycle.glb`, null, 200, 0, 0.01, false);
  };

  async GroupAnimationConstruct(groupName, onprogress=null, dur=200, ndx=0, scale=0.01, tween=true) {
    const animList = this.AnimationFA_route[groupName];
    const loader = new GLTFLoader();
    let glb_list = []
    const promises = animList.map(file => loader.loadAsync(`./animations/${file}`, onprogress));
    const glbs = await Promise.all(promises);
    glb_list = animList.map((file, i) => ({ url: `./animations/${file}`, glb: glbs[i] }));
    let glb_anims = [];
    const scale_ = new THREE.Vector3(scale, scale, scale);
    glb_list.forEach( item => {
      const url = item['url']
      const glb = item['glb']
      if  ( glb && glb.animations && glb.animations[ndx] ) {
        let anim = glb.animations[ndx];
        const props = {};
        anim.tracks.sort((a, b) => {
            let ids1 = a.name.split('.');
            let ids2 = b.name.split('.');
            return ids2[1].localeCompare(ids1[1]); // scale first (scale, position, quaternion)
          });
        anim.tracks.forEach( t => {
          if(t.name.includes('mixamorig')) t.name = t.name.replaceAll('mixamorig','');
          const ids = t.name.split('.');
          if ( ids[1] === 'position' ) { 
            // [DONE] 初步定位是提供的ref文件中，带有position信息的t(即ids[1] === 'position'时)的time帧数不足；walking中是有 30帧就是30个time，ref中这部分只有2个time
            const s_now = (ids[0]+'.scale' in props) ? props[ids[0]+'.scale'] : scale_ ;
            for(let i=0; i<t.values.length; i++ ) {
              t.values[i] = t.values[i] * (i%3===0?s_now.x:(i%3===1?s_now.y:s_now.z));
            }
            props[t.name] = new THREE.Vector3(t.values[0], t.values[1],t.values[2]);
          } else if ( ids[1] === 'quaternion' ) {
            props[t.name] = new THREE.Quaternion(t.values[0],t.values[1],t.values[2],t.values[3]);
            // props[t.name].multiply(q_);
          } else if ( ids[1] === 'rotation' ) {
            props[ids[0]+".quaternion"] = new THREE.Quaternion().setFromEuler(new THREE.Euler(t.values[0],t.values[1],t.values[2],'XYZ')).normalize();
          } 
          else if  ( ids[1] === 'scale' ) {
            // first
            props[t.name] = new THREE.Vector3(t.values[0], t.values[1], t.values[2]);
          }
        });

        const newPose = { props: props};
        glb_anims.push({
          url: url+'-'-ndx,
          clip: anim,
          pose: newPose
        })
      }
    });
    if ( !this.animClips.some( _item_ => _item_.name == groupName)) {
      this.animClips.push({
        'name': groupName,
        'pose': glb_anims
      });
    }
    
  }

  async GroupAnimationPlayer(groupName, onprogress=null, dur=200, ndx=0, scale=0.01, tween=true) {
    await this.GroupAnimationConstruct(groupName, onprogress, dur, ndx, scale, tween);
    let item = this.animClips.find( x => x.name === groupName) || null;
    // if ( !item ) {
    //   await this.GroupAnimationConstruct(groupName, onprogress, dur, ndx, scale, tween);
    //   item = this.animClips.find( x => x.name === groupName) || null;
    //   if (!item) item = this.animClips.find( x => x.url.includes('U_Idle_01_Cycle.glb'));
    // }
    item['pose'].forEach(x => {this.seqItems.push(x)});
    const applyPoseFromItem = (item, tween = true, dur = 400) => {
      if (!item || !item.pose) return;
      Object.entries(item.pose.props).forEach( x => {
        this.poseBase.props[x[0]] = x[1].clone();
        this.poseTarget.props[x[0]] = x[1].clone();
        this.poseTarget.props[x[0]].t = tween ? 0 : 1;
        this.poseTarget.props[x[0]].d = tween ? Math.max(200, Math.min(dur, 1000)) : 0;
      });
    };
    if (this.mixer) {
      try { this.mixer.stopAllAction(); } catch(e) {}
      if (this._seqFinishedHandler && this.mixer.removeEventListener) {
        try { this.mixer.removeEventListener('finished', this._seqFinishedHandler); } catch(e) {}
      }
      // 不立即置 null — 在下面会重建
      this.mixer = null;
      this._seqFinishedHandler = null;
    }
    // multi animations
    if (this.seqItems.length >= 2 && item) {
      // 使用所有匹配到的 clip（按 seqItems 中的顺序）
      this.mixer = new THREE.AnimationMixer(this.armature);

      // let idx = 0;
      this.currentAction = null;
      const fadeTime = 0.5; // 可调整淡入/淡出时间（秒）
      const playNext = (evt) => { // 迭代器
        // 只有当前 action 自己的 finished 事件才触发下一步（避免竞态）
        if (evt && evt.action && this.currentAction && evt.action !== this.currentAction) {
          return;
        }
        // fade out 旧 action（若存在）
        if (this.currentAction) {
          try { this.currentAction.fadeOut(fadeTime); } catch(e) {}
        }

        // 从队列头取下一个 item（只播放一次）
        const itemNext = this.seqItems.shift(); // <- 这是关键：移除已播放的项
        if ( this.seqItems.length === 0) return;
        // 在开始新动作前应用 pose（如果不想补间，把 tween 设为 false）
        applyPoseFromItem(itemNext, /*tween*/ tween, /*dur*/ dur);

        // 创建 action 并配置（播放一次）
        const action = this.mixer.clipAction(itemNext.clip);
        action.reset();
        action.setLoop(THREE.LoopOnce, 0); // 播放一次
        action.clampWhenFinished = true;
        action.enabled = true;

        // 启动（淡入/播放）
        this.LastTime = Date.now();
        if (fadeTime > 0) {
          action.fadeIn(fadeTime).play();
        } else {
          action.play();
          action.setEffectiveWeight(1);
        }

        // 保存当前 action 引用（finished 事件时用来比对）
        this.currentAction = action;
        // 如果队列在此时已空，说明这是最后一个动作
        // 但不要在这里 cleanup：等待该 action 的 finished 事件触发后再 cleanup，
        // 这样可以保证动作完整播放结束后再销毁 mixer。
        // （如果你想在播放最后一个动作时马上移除队列引用也可）
        // 如果队列已空，清理并返回
      };

      

      // 保存 handler 引用用于 later remove
      this._seqFinishedHandler = (e) => playNext(e);
      this.mixer.addEventListener('finished', this._seqFinishedHandler);

      // 启动序列：先从 seqItems[0] 开始
      playNext();

      this.playAnimation(`./animations/U_Idle_01_Cycle.glb`, null, 200, 0, 0.01, false);

    // ---------- 情况 2：找到了单个 item ----------
    } else {
      if (!item) item = this.animClips.find( x => x.url.includes('U_Idle_01_Cycle.glb'));
      else item = this.seqItems[0]; // 取出元素

      // Set new pose && 补间动画
      Object.entries(item.pose.props).forEach( x => {
        this.poseBase.props[x[0]] = x[1].clone();
        this.poseTarget.props[x[0]] = x[1].clone();
        this.poseTarget.props[x[0]].t = tween ? 0 : 1;
        this.poseTarget.props[x[0]].d = tween ? Math.max(200, Math.min(dur, 1000)) : 0;
      });

      // Create a new mixer
      this.mixer = new THREE.AnimationMixer(this.armature);
      this.mixer.addEventListener( 'finished', this.stopAnimation.bind(this), { once: true });

      // Play action
      const repeat = 0;// -> 1 time // Math.ceil(dur / item.clip.duration);
      const action = this.mixer.clipAction(item.clip);
      action.setLoop( THREE.LoopRepeat, repeat );
      action.clampWhenFinished = true;
      action.fadeIn(0.5).play();

    }

    // this.animClips = [];
    // this.stopSequence();

  }


  /**
  * Play RPM/Mixamo animation clip.
  * @param {string|Object} url URL to animation file FBX
  * @param {progressfn} [onprogress=null] Callback for progress
  * @param {number} [dur=10] Duration in seconds, but at least once
  * @param {number} [ndx=0] Index of the clip
  * @param {number} [scale=0.01] Position scale factor
  */
 // 动作控制
  async playAnimation(url, onprogress=null, dur=200, ndx=0, scale=0.01, tween = true) {
    // while ( Date.now() - this.LastTime < this.animInterval * 1000 );
    // TODO: 默认相机位置
    if ( !this.armature ) return;
    let item = this.animClips.find( x => x.url === url+'-'+ndx );
    if ( item ) {

      // Reset pose update
      let anim = this.animQueue.find( x => x.template.name === 'pose' );
      if ( anim ) {
        anim.ts[0] = Infinity;
      }

      // Set new pose && 补间动画
      Object.entries(item.pose.props).forEach( x => {
        this.poseBase.props[x[0]] = x[1].clone();
        this.poseTarget.props[x[0]] = x[1].clone();
        this.poseTarget.props[x[0]].t = tween ? 0 : 1;
        this.poseTarget.props[x[0]].d = tween ? Math.max(200, Math.min(dur, 1000)) : 0;
      });

      // Create a new mixer
      this.mixer = new THREE.AnimationMixer(this.armature);
      this.mixer.addEventListener( 'finished', this.stopAnimation.bind(this), { once: true });

      // Play action
      const repeat = Math.ceil(dur / item.clip.duration);
      // const repeat = 0;// -> 1 time // Math.ceil(dur / item.clip.duration);
      const action = this.mixer.clipAction(item.clip);
      action.setLoop( THREE.LoopRepeat, repeat );
      action.clampWhenFinished = true;
      // action.fadeIn(0.5).play();
      action.play();
      

    } else 
    {
      const scale_ = new THREE.Vector3(scale, scale, scale);
      // Load animation
      if (url.includes('.fbx')) {
        const loader = new FBXLoader();

        let fbx = await loader.loadAsync( url, onprogress );
        console.log('fbx read done.')

        // 在加载模型时添加模型旋转修正
        if ( fbx && fbx.animations && fbx.animations[ndx] ) {
          // 修正模型方向
          const modelRotationFix = new THREE.Quaternion();
          modelRotationFix.setFromEuler(new THREE.Euler(Math.PI, 0, Math.PI)); // 旋转180度
          fbx.quaternion.multiply(modelRotationFix);

          let anim = fbx.animations[ndx];

          // Rename and scale Mixamo tracks, create a pose
          const props = {};
          anim.tracks.sort((a, b) => {
            let ids1 = a.name.split('.');
            let ids2 = b.name.split('.');
            return ids2[1].localeCompare(ids1[1]); // scale first (scale, position, quaternion)
          });
          anim.tracks.forEach( t => {
            if(t.name.includes('mixamorig')) t.name = t.name.replaceAll('mixamorig','');
            const ids = t.name.split('.');
            if ( ids[1] === 'position' ) { 
              // [DONE] 初步定位是提供的ref文件中，带有position信息的t(即ids[1] === 'position'时)的time帧数不足；walking中是有 30帧就是30个time，ref中这部分只有2个time
              const s_now = (ids[0]+'.scale' in props) ? props[ids[0]+'.scale'] : scale_ ;
              for(let i=0; i<t.values.length; i++ ) {
                t.values[i] = t.values[i] * (i%3===0?s_now.x:(i%3===1?s_now.y:s_now.z));
              }
              props[t.name] = new THREE.Vector3(t.values[0], t.values[1],t.values[2]);
            } else if ( ids[1] === 'quaternion' ) {
              props[t.name] = new THREE.Quaternion(t.values[0],t.values[1],t.values[2],t.values[3]);
              // props[t.name].multiply(q_);
            } else if ( ids[1] === 'rotation' ) {
              props[ids[0]+".quaternion"] = new THREE.Quaternion().setFromEuler(new THREE.Euler(t.values[0],t.values[1],t.values[2],'XYZ')).normalize();
            } 
            else if  ( ids[1] === 'scale' ) {
              // first
              props[t.name] = new THREE.Vector3(t.values[0], t.values[1], t.values[2]);
            }
          });

          // Add to clips
          const newPose = { props: props };
          // TODO: 似乎与相机位姿无关
          if ( props['pelvis.position'] ) {
            if ( props['pelvis.position'].y < 0.5 ) {
              newPose.lying = true;
            } else {
              newPose.standing = true; // 有关? 搜".standing"
            }
          }
          if ( !this.animClips.some( _item_ => _item_.url == url+'-'+ndx)) {
            this.animClips.push({
              url: url+'-'+ndx,
              clip: anim,
              pose: newPose
            });
          }
          

          // Play
          this.playAnimation(url, onprogress, dur, ndx, scale, tween);

        } else {
          const msg = 'Animation ' + url + ' (ndx=' + ndx + ') not found';
          console.error(msg);
        }
      } else if (url.includes('.glb')) {
        const loader = new GLTFLoader();

        let glb = await loader.loadAsync( url, onprogress );
        console.log('glb read done.')
        // TODO: read .glb animation file
        if ( glb && glb.animations && glb.animations[ndx] ) {

          let anim = glb.animations[ndx];

          // Rename and scale Mixamo tracks, create a pose
          const props = {};
          anim.tracks.sort((a, b) => {
            let ids1 = a.name.split('.');
            let ids2 = b.name.split('.');
            return ids2[1].localeCompare(ids1[1]); // scale first (scale, position, quaternion)
          });
          anim.tracks.forEach( t => {
            if(t.name.includes('mixamorig')) t.name = t.name.replaceAll('mixamorig','');
            const ids = t.name.split('.');
            if ( ids[1] === 'position' ) { 
              // [DONE] 初步定位是提供的ref文件中，带有position信息的t(即ids[1] === 'position'时)的time帧数不足；walking中是有 30帧就是30个time，ref中这部分只有2个time
              const s_now = (ids[0]+'.scale' in props) ? props[ids[0]+'.scale'] : scale_ ;
              for(let i=0; i<t.values.length; i++ ) {
                t.values[i] = t.values[i] * (i%3===0?s_now.x:(i%3===1?s_now.y:s_now.z));
              }
              props[t.name] = new THREE.Vector3(t.values[0], t.values[1],t.values[2]);
            } else if ( ids[1] === 'quaternion' ) {
              props[t.name] = new THREE.Quaternion(t.values[0],t.values[1],t.values[2],t.values[3]);
              // props[t.name].multiply(q_);
            } else if ( ids[1] === 'rotation' ) {
              props[ids[0]+".quaternion"] = new THREE.Quaternion().setFromEuler(new THREE.Euler(t.values[0],t.values[1],t.values[2],'XYZ')).normalize();
            } 
            else if  ( ids[1] === 'scale' ) {
              // first
              props[t.name] = new THREE.Vector3(t.values[0], t.values[1], t.values[2]);
            }
          });

          // Add to clips
          const newPose = { props: props };
          // TODO: 似乎与相机位姿无关
          if ( props['pelvis.position'] ) {
            if ( props['pelvis.position'].y < 0.5 ) {
              newPose.lying = true;
            } else {
              newPose.standing = true; // 有关? 搜".standing"
            }
          }
          this.animClips.push({
            url: url+'-'+ndx,
            clip: anim,
            pose: newPose
          });

          // Play
          this.playAnimation(url, onprogress, dur, ndx, scale, tween);
        } else {
          throw new Error('Unsupported animation format: ' + url);
        }
      } else {
        console.log("here");
      }
    }
  }

  /**
  * Stop running animations.
  */
  stopAnimation() {

    // Stop mixer
    this.mixer = null;

    // Restart gesture
    if ( this.gesture ) {
      for( let [p,v] of Object.entries(this.gesture) ) {
        v.t = this.animClock;
        v.d = 1000;
        if ( this.poseTarget.props.hasOwnProperty(p) ) {
          this.poseTarget.props[p].copy(v);
          this.poseTarget.props[p].t = this.animClock;
          this.poseTarget.props[p].d = 1000;
        }
      }
    }

    // Restart pose animation
    let anim = this.animQueue.find( x => x.template.name === 'pose' );
    if ( anim ) {
      anim.ts[0] = this.animClock;
    }
    this.setPoseFromTemplate( null );

  }


  /**
  * Play RPM/Mixamo pose.
  * @param {string|Object} url Pose name | URL to FBX
  * @param {progressfn} [onprogress=null] Callback for progress
  * @param {number} [dur=5] Duration of the pose in seconds
  * @param {number} [ndx=0] Index of the clip
  * @param {number} [scale=0.01] Position scale factor
  */
  // 姿势控制
  async playPose(url, onprogress=null, dur=5, ndx=0, scale=0.01) {

    if ( !this.armature ) return;

    // Check if we already have the pose template ready
    let pose = this.poseTemplates[url];
    if ( !pose ) {
      const item = this.animPoses.find( x => x.url === url+'-'+ndx );
      if ( item ) {
        pose = item.pose;
      }
    }

    // If we have the template, use it, otherwise try to load it
    if ( pose ) {

      this.poseName = url;

      this.mixer = null;
      let anim = this.animQueue.find( x => x.template.name === 'pose' );
      if ( anim ) {
        anim.ts[0] = this.animClock + (dur * 1000) + 2000;
      }
      this.setPoseFromTemplate( pose );

    } else {

      // Load animation
      const loader = new FBXLoader();

      let fbx = await loader.loadAsync( url, onprogress );

      if ( fbx && fbx.animations && fbx.animations[ndx] ) {
        let anim = fbx.animations[ndx];

        // Create a pose
        const props = {};
        anim.tracks.forEach( t => {

          // Rename and scale Mixamo tracks
          t.name = t.name.replaceAll('mixamorig','');
          const ids = t.name.split('.');
          if ( ids[1] === 'position' ) {
            props[t.name] = new THREE.Vector3( t.values[0] * scale, t.values[1] * scale, t.values[2] * scale);
          } else if ( ids[1] === 'quaternion' ) {
            props[t.name] = new THREE.Quaternion( t.values[0], t.values[1], t.values[2], t.values[3] );
          } else if ( ids[1] === 'rotation' ) {
            props[ids[0]+".quaternion"] = new THREE.Quaternion().setFromEuler(new THREE.Euler( t.values[0], t.values[1], t.values[2],'XYZ' )).normalize();
          }
        });

        // Add to pose
        // TODO: estimate a better pose
        this.setView( this.opt.cameraView )
        const newPose = { props: props };
        if ( props['pelvis.position'] ) {
          if ( props['pelvis.position'].y < 0.5 ) {
            newPose.lying = true;
          } else {
            newPose.standing = true;
          }
        }
        this.animPoses.push({
          url: url+'-'+ndx,
          pose: newPose
        });

        // Play
        this.playPose(url, onprogress, dur, ndx, scale);

      } else {
        const msg = 'Pose ' + url + ' (ndx=' + ndx + ') not found';
        console.error(msg);
      }
    }
  }

  /**
  * Stop the pose. (Functionality is the same as in stopAnimation.)
  */
  stopPose() {
    this.stopAnimation();
  }

  /**
  * Play a gesture, which is either a hand gesture, an emoji animation or their
  * combination.
  * @param {string} name Gesture name
  * @param {number} [dur=3] Duration of the gesture in seconds
  * @param {boolean} [mirror=false] Mirror gesture
  * @param {number} [ms=1000] Transition time in milliseconds
  */
  // 手势控制
  playGesture(name, dur=3, mirror=false, ms=1000, useGLB=false, poseName=null) {
    if (useGLB && poseName) {
      // 同样使用 GLB 文件中的动作
    }

    if ( !this.armature ) return;

    // Hand gesture, if any
    let g = this.gestureTemplates[name];
    if ( g ) {

      // New gesture always overrides the existing one
      if ( this.gestureTimeout ) {
        clearTimeout( this.gestureTimeout );
        this.gestureTimeout = null;
      }

      // Stop talking hands animation
      let ndx = this.animQueue.findIndex( y => y.template.name === "talkinghands" );
      if ( ndx !== -1 ) {
        this.animQueue[ndx].ts = this.animQueue[ndx].ts.map( x => 0 );
      }

      // Set gesture
      this.gesture = this.propsToThreeObjects( g );
      if ( mirror ) {
        this.gesture = this.mirrorPose( this.gesture );
      }
      if ( name === "namaste" && this.avatar.body === 'M' ) {
        // Work-a-round for male model so that the hands meet
        this.gesture["upperarm_r.quaternion"].rotateTowards( new THREE.Quaternion(0,1,0,0), -0.25);
        this.gesture["upperarm_l.quaternion"].rotateTowards( new THREE.Quaternion(0,1,0,0), -0.25);
      }

      // Apply to target
      for( let [p,val] of Object.entries(this.gesture) ) {
        val.t = this.animClock;
        val.d = ms;
        if ( this.poseTarget.props.hasOwnProperty(p) ) {
          this.poseTarget.props[p].copy(val);
          this.poseTarget.props[p].t = this.animClock;
          this.poseTarget.props[p].d = ms;
        }
      }

      // Timer
      if ( dur && Number.isFinite(dur) ) {
        this.gestureTimeout = setTimeout( this.stopGesture.bind(this,ms), 1000 * dur);
      }
    }

    // Animated emoji, if any
    let em = this.animEmojis[name];
    if ( em ) {

      // Follow link
      if ( em && em.link ) {
        em = this.animEmojis[em.link];
      }

      if ( em ) {
        // Look at the camera for 500 ms
        this.lookAtCamera(500);

        // Create animation and tag as gesture
        const anim = this.animFactory( em );
        anim.gesture = true;

        // Rescale duration
        if ( dur && Number.isFinite(dur) ) {
          const first = anim.ts[0];
          const last = anim.ts[ anim.ts.length -1 ];
          const total = last - first;
          const excess = (dur * 1000) - total;

          // If longer, increase longer parts; if shorter, scale everything
          if ( excess > 0 ) {
            const dt = [];
            for( let i=1; i<anim.ts.length; i++ ) dt.push( anim.ts[i] - anim.ts[i-1] );
            const rescale = em.template?.rescale || dt.map( x => x / total );
            const excess = dur * 1000 - total;
            anim.ts = anim.ts.map( (x,i,arr) => {
              return (i===0) ? first : (arr[i-1] + dt[i-1] + rescale[i-1] * excess);
            });
          } else {
            const scale = (dur * 1000) / total;
            anim.ts = anim.ts.map( x => first + scale * (x - first) );
          }
        }

        this.animQueue.push( anim );
      }
        // this.TalkQueue.push('讲话-1');
      
    }

  }

  /**
  * Stop the gesture.
  * @param {number} [ms=1000] Transition time in milliseconds
  */
  stopGesture(ms=1000) {

    // Stop gesture timer
    if ( this.gestureTimeout ) {
      clearTimeout( this.gestureTimeout );
      this.gestureTimeout = null;
    }

    // Stop hand gesture, if any
    if ( this.gesture ) {
      const gs = Object.entries(this.gesture);
      this.gesture = null;
      for( const [p,val] of gs ) {
        if ( this.poseTarget.props.hasOwnProperty(p) ) {
          this.poseTarget.props[p].copy( this.getPoseTemplateProp(p, UseglbTemplate=this.GLBmotion) );
          this.poseTarget.props[p].t = this.animClock;
          this.poseTarget.props[p].d = ms;
        }
      }
    }

    // Stop animated emoji gesture, if any
    let i = this.animQueue.findIndex( y => y.gesture );
    if ( i !== -1 ) {
      this.animQueue.splice(i, 1);
    }

  }

  /**
  * Cyclic Coordinate Descent (CCD) Inverse Kinematic (IK) algorithm.
  * Adapted from:
  * https://github.com/mrdoob/three.js/blob/master/examples/jsm/animation/CCDIKSolver.js
  * @param {Object} ik IK configuration object
  * @param {Vector3} [target=null] Target coordinate, if null return to template
  * @param {Boolean} [relative=false] If true, target is relative to root
  * @param {numeric} [d=null] If set, apply in d milliseconds
  */
  ikSolve(ik, target=null, relative=false, d=null) {
    const targetVec = new THREE.Vector3();
    const effectorPos = new THREE.Vector3();
    const effectorVec = new THREE.Vector3();
    const linkPos = new THREE.Vector3();
    const invLinkQ = new THREE.Quaternion();
    const linkScale = new THREE.Vector3();
    const axis = new THREE.Vector3();
    const vector = new THREE.Vector3();

    // Reset IK setup positions and rotations
    const root = this.ikMesh.getObjectByName(ik.root);
    root.position.setFromMatrixPosition( this.armature.getObjectByName(ik.root).matrixWorld );
    root.quaternion.setFromRotationMatrix( this.armature.getObjectByName(ik.root).matrixWorld );
    if ( target && relative ) {
      target.add( root.position );
    }
    const effector = this.ikMesh.getObjectByName(ik.effector);
    const links = ik.links;
    links.forEach( x => {
      x.bone = this.ikMesh.getObjectByName(x.link);
      x.bone.quaternion.copy( this.getPoseTemplateProp(x.link+'.quaternion', UseglbTemplate=this.GLBmotion) );
    });
    root.updateMatrixWorld(true);
    const iterations = ik.iterations || 10;

    // Iterate
    if ( target ) {
      for ( let i = 0; i < iterations; i ++ ) {
        let rotated = false;
        for ( let j = 0, jl = links.length; j < jl; j++ ) {
          const bone = links[j].bone;
          bone.matrixWorld.decompose( linkPos, invLinkQ, linkScale );
          invLinkQ.invert();
          effectorPos.setFromMatrixPosition( effector.matrixWorld );
          effectorVec.subVectors( effectorPos, linkPos );
          effectorVec.applyQuaternion( invLinkQ );
          effectorVec.normalize();
          targetVec.subVectors( target, linkPos );
          targetVec.applyQuaternion( invLinkQ );
          targetVec.normalize();
          let angle = targetVec.dot( effectorVec );
          if ( angle > 1.0 ) {
            angle = 1.0;
          } else if ( angle < - 1.0 ) {
            angle = - 1.0;
          }
          angle = Math.acos( angle );
          if ( angle < 1e-5 ) continue;
          if ( links[j].minAngle !== undefined && angle < links[j].minAngle ) {
            angle = links[j].minAngle;
          }
          if ( links[j].maxAngle !== undefined && angle > links[j].maxAngle ) {
            angle = links[j].maxAngle;
          }
          axis.crossVectors( effectorVec, targetVec );
          axis.normalize();
          q.setFromAxisAngle( axis, angle );
          bone.quaternion.multiply( q );

          // Constraints
          bone.rotation.setFromVector3( vector.setFromEuler( bone.rotation ).clamp( new THREE.Vector3(
            links[j].minx !== undefined ? links[j].minx : -Infinity,
            links[j].miny !== undefined ? links[j].miny : -Infinity,
            links[j].minz !== undefined ? links[j].minz : -Infinity
          ), new THREE.Vector3(
            links[j].maxx !== undefined ? links[j].maxx : Infinity,
            links[j].maxy !== undefined ? links[j].maxy : Infinity,
            links[j].maxz !== undefined ? links[j].maxz : Infinity
          )) );

          bone.updateMatrixWorld( true );
          rotated = true;
        }
        if ( !rotated ) break;
      }
    }

    // Apply
    if ( d ) {
      links.forEach( x => {
        this.poseTarget.props[x.link+".quaternion"].copy( x.bone.quaternion );
        this.poseTarget.props[x.link+".quaternion"].t = this.animClock;
        this.poseTarget.props[x.link+".quaternion"].d = d;
      });
    }
  }

}

export { TalkingHead };
