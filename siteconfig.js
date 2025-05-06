// Site configuration
export const site = {

  // Preset avatars
  avatars: {
    'Brunette': {
      url: './avatars/brunette.glb',
      body: 'F',
      avatarMood: 'neutral',
      fi: 'Brunetti'
    }
  },

  // Google voices
  googleVoices: {
    "fi-F": { id: "fi-FI-Standard-A" },
    "lv-M": { id: "lv-LV-Standard-A" },
    "lt-M": { id: "lt-LT-Standard-A" },
    "en-F": { id: "en-GB-Standard-A" },
    "en-M": { id: "en-GB-Standard-D" }
  },

  // ElevenLab voices
  elevenVoices: {
    "Bella": { id: "EXAVITQu4vr4xnSDxMaL" },
    "Elli": { id: "MF3mGyEYCl7XYWbV9V6O" },
    "Rachel": { id: "21m00Tcm4TlvDq8ikWAM" },
    "Adam": { id: "pNInz6obpgDQGcFmaJgB" },
    "Antoni": { id: "ErXwobaYiN019PkySvjV" },
    "Arnold": { id: "VR6AewLTigWG4xSOukaG" },
    "Domi": { id: "AZnzlk1XvdvUeBnXmlld" },
    "Josh": { id: "TxGEqnHWrfWFTfGW9XjX" },
    "Sam": { id: "yoZ06aMxZJJ28mfd3POQ" }
  },

  // Microsoft voices
  microsoftVoices: {
    "fi-Selma": { lang: "fi-FI", id: "fi-FI-SelmaNeural" },
    "fi-Noora": { lang: "fi-FI", id: "fi-FI-NooraNeural" },
    "fi-Harri": { lang: "fi-FI", id: "fi-FI-HarriNeural" },
    "en-Jenny": { lang: "en-US", id: "en-US-JennyNeural" },
    "en-Tony": { lang: "en-US", id: "en-US-TonyNeural" },
  },

  // Preset views
  views: {
    'DrStrange': { url: './views/strange.jpg', type: 'image/jpg', fi: 'TohtoriOuto' },
    'Matrix': { url: './views/matrix.mp4', type: 'video/mp4' }
  },

  // Preset poses (includes internal poses)
  poses: { // 在此添加姿势
    'Straight': { url: "straight", fi: 'Suora' },
    'Side': { url: "side", fi: 'Keno' },
    'Hip': { url: "hip", fi: 'Lantio' },
    'Turn': { url: "turn", fi: 'Sivu' },
    'Back': { url: "back", fi: 'Taka' },
    'Wide': { url: "wide", fi: 'Haara' },
    'OneKnee': { url: "oneknee", fi: 'Polvi' },
    'TwoKnees': { url: "kneel", fi: 'Polvet' },
    'Bend': { url: "bend", fi: 'Perä' },
    'Sitting': { url:"sitting", fi: 'Istuva' },
    'Dance': { url: './poses/dance.fbx', fi: 'Tanssi' },
    
    
  },

  // Preset gestures
  gestures: {
    'HandUp': { name: "handup", fi: 'KäsiYlös' },
    'OK': { name: "ok" },
    'Index': { name: "index", fi: 'Etusormi' },
    'ThumbUp': { name: "thumbup", fi: 'PeukaloYlös' },
    'ThumbDown': { name: "thumbdown", fi: 'PeukaloAlas' },
    'Side': { name: "side", fi: 'Sivu' },
    'Shrug': { name: "shrug", fi: 'Olankohautus' },
    'Namaste': { name: "namaste" },
  },

  // Preset animations
  animations: { // 在此添加动作
    'Walking': { url: './animations/walking.fbx', fi: 'Kävely' },
    'Ref': { url: './animations/Ref_Amin.fbx', fi: 'Kävely' },
  }, 

  /*
    '1': { url: "./animations/test/1/Animation/1.fbx", fi: 'test1' },
    '2': { url: "./animations/test/2/Animation/2.fbx", fi: 'test2' },
    '3': { url: "./animations/test/3/Animation/3.fbx", fi: 'test3' },
    '4': { url: "./animations/test/4/Animation/4.fbx", fi: 'test4' },
    '5': { url: "./animations/test/5/Animation/5.fbx", fi: 'test5' },
    '6': { url: "./animations/test/6/Animation/6.fbx", fi: 'test6' },
    '7': { url: "./animations/test/7/Animation/7.fbx", fi: 'test7' },
    '8': { url: "./animations/test/8/Animation/8.fbx", fi: 'test8' },
    '9': { url: "./animations/test/9/Animation/9.fbx", fi: 'test9' },
    '10': { url: "./animations/test/10/Animation/10.fbx", fi: 'test10' },
    '11': { url: "./animations/test/11/Animation/11.fbx", fi: 'test11' },
    '12': { url: "./animations/test/12/Animation/12.fbx", fi: 'test12' },
    '13': { url: "./animations/test/13/Animation/13.fbx", fi: 'test13' },
    '14': { url: "./animations/test/14/Animation/14.fbx", fi: 'test14' },
    '15': { url: "./animations/test/15/Animation/15.fbx", fi: 'test15' },
    '16': { url: "./animations/test/16/Animation/16.fbx", fi: 'test16' },
    '17': { url: "./animations/test/17/Animation/17.fbx", fi: 'test17' },
    '18': { url: "./animations/test/18/Animation/18.fbx", fi: 'test18' },
    '19': { url: "./animations/test/19/Animation/19.fbx", fi: 'test19' },
    '20': { url: "./animations/test/20/Animation/20.fbx", fi: 'test20' },
    '21': { url: "./animations/test/21/Animation/21.fbx", fi: 'test21' },
    '22': { url: "./animations/test/22/Animation/22.fbx", fi: 'test22' },
    '23': { url: "./animations/test/23/Animation/23.fbx", fi: 'test23' }
  */

  // Impulse responses
  impulses: {
    'Room': { url: './audio/ir-room.m4a', fi: 'Huone' },
    'Basement': { url: './audio/ir-basement.m4a', fi: 'Kellari' },
    'Forest': { url: './audio/ir-forest.m4a', fi: 'Metsä' },
    'Church': { url: './audio/ir-church.m4a', fi: 'Kirkko' }
  },

  // Background ambient sounds/music
  music: {
    'Murmur': { url: './audio/murmur.mp3', fi: 'Puheensorina'}
  }

};
// TODO: 控制动作、手势、表情、姿势的方法 → 在fn.arguments添加如下字段
// m: { action: '...', pose: '...', gesture: '...', mood: '...' }
// action -> animations
// pose -> poses
// gesture -> gestures
// mood -> avatarMood