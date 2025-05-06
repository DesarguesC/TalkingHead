import socket

def main():
    host = '127.0.0.1'  # 本地地址
    port = 4000         # 目标端口
    while True:
        try:
            # 创建一个 TCP 客户端套接字
            client_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            # 连接到服务器
            client_socket.connect((host, port))
            print(f"✅ 已连接到服务器 {host}:{port}")
            while True:
                # 接收来自服务器的消息
                data = client_socket.recv(1024)  # 缓冲区为 1024 字节
                if not data:
                    print("⚠️ 服务器已关闭连接")
                    break
                # 打印收到的消息
                print(f"📥 收到消息: {data.decode('utf-8')}")
                client_socket.sendall('True'.encode('utf-8'))
                print("已发送应答")
    

        except ConnectionRefusedError:
            print(f"❌ 无法连接到服务器 {host}:{port}，正在重试...")
        except Exception as e:
            print(f"⚠️ 出现错误: {e}")
        finally:
            # 关闭套接字（执行完前面的过程，无论是否捕获了异常）
            client_socket.close()
            print("🔒 客户端已关闭连接，等待重试...")
        
        # 等待一段时间后重试连接
        import time
        time.sleep(2)

if __name__ == "__main__":
    main()
