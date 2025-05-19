from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS
import requests
import logging
import socket
import threading
import time, pdb, os
import json

UE_Animate = True
# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # 启用跨域支持

# Llama 服务器地址
# LLAMA_SERVER = "http://192.168.23.84:7001"
LLAMA_SERVER = "http://10.162.175.238:7001"
WHISPER_SERVER = "http://10.162.175.238:7002"
GTTS_SERVER = "http://10.214.194.234:7010"
# 服务静态文件（index.html 等）
@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

# 服务其他静态文件（js, css, images 等）
@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)


UE_Socket_Host = '0.0.0.0'  # 本地地址
UE_Socket_Port = 4000         # 目标端口
# TCP_Socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

class SocketService:
    def __init__(self, host='0.0.0.0', port=3000):
        self.host = host
        self.port = port
        self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.server_socket.bind((self.host, self.port))
        self.server_socket.listen(5)
        print(f"🚀 服务正在监听 {self.host}:{self.port}")
        client_socket, address = self.server_socket.accept()
        self.client_socket = client_socket
        self.address = address
        print(f"🔌 客户端已连接：{self.address}")
        
    def handle_client(self, data_to_send = None):
        # print(f"🔌 客户端已连接：{self.address}")
        if data_to_send is None:
            print(f"⚠️ 没有可发送的数据")
            return
        
        message = json.dumps(data_to_send).encode('utf-8')
        self.client_socket.sendall(message)
        print(f"📤 已发送数据到 {self.address}: {message.decode('utf-8')}")
        
        # 取消应答收发
        # response = None
        # try:
        #     self.client_socket.settimeout(2)  # 设置超时时间为2秒
        #     response = self.client_socket.recv(1024)
        #     if response:
        #         print(f"📥 来自 {self.address} 的回应: {response.decode('utf-8')}")
        # except socket.timeout:
        #     print(f"⚠️ 超时：2秒内未收到来自 {self.address} 的回应，跳过 recv 方法")


    def start(self, data_to_send = None):
        print("🟢 正在等待客户端连接...")
        cnt = 0
        while True:
            cnt += 1
            try:
                
                self.handle_client(data_to_send)
                break
            except KeyboardInterrupt:
                print("\n🛑 服务终止")
                try: self.client_socket.close()
                except Exception as err: print(f"⚠️⚠️⚠️ 关闭客户端连接时出错: {err}")
                print(f"🔒 已关闭与客户端 {self.address} 的连接")
                self.server_socket.close()
            except Exception as e:
                print(f"⚠️ 接收客户端 [连接 & 传输]时出错: {e}")
                print(f"待发送数据：{data_to_send}")
                if cnt > 5:
                    return jsonify({"error": "重传失败"}), 500

        # self.server_socket.close()
        return jsonify({"message": "✅ 数据已发送"}), 200

@app.route('/socket:ue/animation', methods=['POST'])
def animation():
    global TCP_Socket
    
    """
    处理动画请求
    """
    try:
        # 从请求体中获取数据
        request_data = request.json
        logger.info(f"收到动画请求: {request_data}")
        print(f"✅ 已接收到数据: {request_data}")
        if not request_data:
            return jsonify({"error": "请求体不能为空"}), 400
        
        # 提取输入参数
        action_data = request_data.get('action', [])
        assert isinstance(action_data, list), f'action参数必须是列表: action = {action_data}'
        
        # 创建socket的json请求
        response = {
            "status": "success",
            "code": 200,
            "message": "Animation request processed successfully",
            "data": {
                "action": action_data
            }
        }
        # 将数据存储到 SocketService 实例中
        
        socket_response = TCP_Socket.start(response)

        return socket_response
    
    except Exception as e:
        print(f"⚠️ 处理 POST 请求时出错: {e}")
        logger.error(f"通过 TCP 发送数据失败: {str(e)}")
        return jsonify({
            "error": {
                "code": 500,
                "message": str(e),
                "status": "INTERNAL"
            }
        }), 500  



# 转发 llama 请求到指定服务器
@app.route('/llama/v1/chat/completions', methods=['POST'])
def llama_chat():
    try:
        logger.info(f"Forwarding request to {LLAMA_SERVER}")
        logger.info(f"Request data: {request.json}")
        
        # 检查是否为流式请求
        is_stream = request.json.get('stream', False)
        
        # 转发请求到 Llama 服务器
        response = requests.post(
            f"{LLAMA_SERVER}/v1/chat/completions",
            json=request.json,
            headers={
                'Content-Type': 'application/json'
            },
            stream=is_stream  # 设置流式传输
        )
        
        # 记录响应信息
        logger.info(f"Response status code: {response.status_code}")
        
        # 如果是流式请求，直接流式返回响应
        if is_stream:
            def generate():
                for chunk in response.iter_lines():
                    if chunk:
                        logger.info(f"Response chunk: {chunk.decode('utf-8')}")
                        yield chunk + b'\n\n'
            
            return generate(), response.status_code, {'Content-Type': 'text/event-stream'}
        else:
            # 非流式请求，返回完整的 JSON 响应
            logger.info(f"Response content: {response.text}")
            return response.json(), response.status_code
        
    except requests.exceptions.ConnectionError as e:
        error_msg = f"Connection error: Could not connect to {LLAMA_SERVER}"
        logger.error(error_msg)
        logger.error(str(e))
        return jsonify({
            "error": "Connection Error",
            "detail": error_msg,
            "exception": str(e)
        }), 503
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Request failed: {str(e)}"
        logger.error(error_msg)
        return jsonify({
            "error": "Request Failed",
            "detail": error_msg,
            "exception": str(e)
        }), 500
        
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        logger.error(error_msg)
        return jsonify({
            "error": "Server Error",
            "detail": error_msg,
            "exception": str(e)
        }), 500

# 转发 gtts 请求到指定服务器
@app.route('/gtts/', methods=['POST'])
def gtts_chat():
    try:
        logger.info(f"Forwarding request to {GTTS_SERVER}")
        logger.info(f"Request data: {request.json}")
        
        # 转发请求到 gtts 服务器
        response = requests.post(
            f"{GTTS_SERVER}/v1beta1/text:synthesize",
            json=request.json,
            headers={
                'Content-Type': 'application/json'
            },
        )
        
        # 记录响应信息
        logger.info(f"Response status code: {response.status_code}")
        # 非流式请求，返回完整的 JSON 响应
        # logger.info(f"Response content: {response.text}")
        return response.json(), response.status_code
        
    except Exception as e:
        logger.error(f"An error occurred: {str(e)}")
        return jsonify({
            "error": "An error occurred",
            "message": str(e)
        }), 500

# 转发 whisper.cpp 请求到指定服务器
@app.route('/whisper/inference', methods=['POST'])
def whisper_chat():
    try:
        logger.info(f"Forwarding request to {WHISPER_SERVER}")
        
        # 获取请求中的文件
        files = {}
        if 'file' in request.files:
            file = request.files['file']
            files = {
                'file': (file.filename, file.read(), file.content_type)
            }
        
        # 获取表单数据
        form_data = {}
        for key in request.form:
            form_data[key] = request.form[key]
        
        # 获取授权头
        headers = {}
        if 'Authorization' in request.headers:
            headers['Authorization'] = request.headers['Authorization']
        
        # 转发请求到 whisper 服务器
        response = requests.post(
            f"{WHISPER_SERVER}/inference",
            files=files,
            data=form_data,
            headers=headers
        )
        
        # 记录响应信息
        logger.info(f"Response status code: {response.status_code}")
        
        # 尝试返回JSON响应，如果不是JSON则返回原始内容
        try:
            return response.json(), response.status_code
        except ValueError:
            return response.content, response.status_code, {'Content-Type': response.headers.get('Content-Type')}
        
    except requests.exceptions.ConnectionError as e:
        error_msg = f"Connection error: Could not connect to {WHISPER_SERVER}"
        logger.error(error_msg)
        logger.error(str(e))
        return jsonify({
            "error": "Connection Error",
            "detail": error_msg,
            "exception": str(e)
        }), 503

    except requests.exceptions.RequestException as e:
        error_msg = f"Request failed: {str(e)}"
        logger.error(error_msg)
        return jsonify({
            "error": "Request Failed",
            "detail": error_msg,
            "exception": str(e)
        }), 500

    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        logger.error(error_msg)
        return jsonify({
            "error": "Server Error",
            "detail": error_msg,
            "exception": str(e)
        }), 500
        

    
if __name__ == '__main__':
    # 网络诊断时注释掉 
    if os.environ.get('WERKZEUG_RUN_MAIN') == 'true' and UE_Animate:
        # 只会在 Flask 的 "重载子进程" 中运行 —— 真正运行你的应用
        TCP_Socket = SocketService(UE_Socket_Host, UE_Socket_Port) 
    app.run(host='0.0.0.0', port=8000, debug=True)

    
