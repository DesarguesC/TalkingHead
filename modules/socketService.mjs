// socketService.js
// import net from 'node:net';

// class SocketService {
//   /**
//    * 向指定主机和端口发送 socket 数据
//    * @param {string} host - 目标主机，例如 '127.0.0.1'
//    * @param {number} port - 端口号，例如 3000
//    * @param {Object} socketBody - 要发送的 JS 对象，会自动转为 JSON
//    * @returns {Promise<string>} - 服务器返回的数据
//    */
//   static async sendMessage(host, port, socketBody) {
//     return new Promise((resolve, reject) => {
//       const client = new net.Socket();

//       client.connect(port, host, () => {
//         console.log(`✅ Connected to ${host}:${port}`);
//         const message = JSON.stringify(socketBody);
//         client.write(message);
//         console.log('📤 Data sent:', message);
//       });

//       client.on('data', (data) => {
//         const response = data.toString();
//         console.log('📥 Received:', response);
//         client.destroy(); // 关闭连接
//         resolve(response);
//       });

//       client.on('close', () => {
//         console.log('🔌 Connection closed');
//       });

//       client.on('error', (err) => {
//         console.error('❌ Socket error:', err.message);
//         reject(err);
//       });
//     });
//   }
// }

const UESocketProxy = "/socket:ue/animation";

animations = {
    'UE-1': { url: '<UE>', fi: 'UE-1', name: 'U_Greet_05_Cycle_04', description: "向前走+敬礼" },
    'UE-2': { url: '<UE>', fi: 'UE-2', name: 'U_Hand_04_Cycle_01', description: "右手大拇指+左手大拇指" },
    'UE-3': { url: '<UE>', fi: 'UE-3', name: 'U_Idle_01_Cycle_04', description: "右手大拇指" },
    'UE-4': { url: '<UE>', fi: 'UE-4', name: 'U_Idle_04_Cycle_01', description: "左手大拇指" },
    'UE-5': { url: '<UE>', fi: 'UE-5', name: 'U_Idle_03_Cycle_03', description: "右手握拳加油+左手握拳加油" },
    'UE-6': { url: '<UE>', fi: 'UE-6', name: 'U_Idle_04_Cycle_01', description: "待机+两手交叉放腰前（重复）" },
    'UE-7': { url: '<UE>', fi: 'UE-7', name: '5Talk_03', description: "抬起双手" },
}

/*
  in talkinghead.mjs: this.DefultAnimation
    待机：['6']
    讲话：['2', '5'], ['3', '1'], ['5', '7'] // 随机一个list
    听声音：['6'] // 暂用待机 
*/



export default UESocketProxy;
