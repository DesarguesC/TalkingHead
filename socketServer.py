import socket
import json
import threading
import base64
import time

class SocketService:
    def __init__(self, host='0.0.0.0', port=3000):
        self.host = host
        self.port = port
        self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.server_socket.bind((self.host, self.port))
        self.server_socket.listen(5)
        print(f"🚀 服务正在监听 {self.host}:{self.port}")

    def handle_client(self, client_socket, address):
        print(f"🔌 客户端已连接：{address}")
        try:
            # 要发送的数据
            data = {
                # "action": ["Idle_01to04", "U_Idle_01_Cycle_04","U_Idle_02_Cycle_03","U_Idle_04_Cycle_01","U_Hand_04_Cycle_01","U_Idle_01_Cycle_04","U_Greet_05_Cycle_04","5Talk_03"]
                'action': ["U_Idle_03_Cycle_03", "U_Idle_04_Cycle_01","U_Idle_04_Cycle_01", "5Talk_03"],
            }
            message = json.dumps(data).encode('utf-8')
            # message = base64.b64encode("2Talk_4".encode('utf-8'))
            # 发送数据
            client_socket.sendall(message)
            print(f"📤 已发送数据到 {address}: {message.decode('utf-8')}")
            # response = client_socket.recv(1024)
            # if response:
            #     print(f"📥 来自 {address} 的回应: {response.decode('utf-8')}")
        except Exception as e:
            print(f"⚠️ 向客户端发送数据时出错: {e}")
        finally:
            client_socket.close()
            print(f"🔒 已关闭与 {address} 的连接")

    def start(self):
        print("🟢 正在等待客户端连接...")
        try:
            while True:
                client_socket, address = self.server_socket.accept()
                client_thread = threading.Thread(target=self.handle_client, args=(client_socket, address))
                client_thread.start()
        except KeyboardInterrupt:
            print("\n🛑 服务终止")
        finally:
            self.server_socket.close()
            print("🔒 套接字已关闭")

if __name__ == '__main__':
    service = SocketService(host='0.0.0.0', port=4000)
    service.start()

