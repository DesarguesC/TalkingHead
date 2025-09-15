# pip install flask_cors flask_socketio
from flask import Flask, send_from_directory, request, jsonify, make_response
from flask_cors import CORS
from flask_socketio import SocketIO
import requests
import logging
import socket
import threading
import time, pdb, os
import json
from uuid import uuid4
from collections import deque
from datetime import datetime

# 互斥锁
data_lock = threading.Lock()

# 并发控制参数
MAX_ACTIVE = 5
TIMEOUT = 120  # 秒
active_users = {}
waiting_queue = deque()

def get_or_create_session_id():
    """获取或创建唯一sid"""
    sid = request.cookies.get("sid")
    if not sid:
        sid = str(uuid4())
    return sid

def cleanup():
    """释放超时用户，并让等待队列的人进来"""
    now = time.time()
    with data_lock:
        expired = [sid for sid, data in active_users.items() if now - data.get("last_activity", now) > TIMEOUT]
        for sid in expired:
            del active_users[sid]
            logger.info(f"会话 {sid} 因超时释放")
            if waiting_queue:
                next_user = waiting_queue.popleft()
                next_sid = next_user['sid']
                active_users[next_sid] = {
                    "ip": next_user['ip'],
                    "connect_time": now,
                    "last_activity": now
                }
                logger.info(f"等待用户 {next_sid} 进入网站")

def get_client_ip():
    return request.headers.get('X-Forwarded-For', request.remote_addr)

def update_activity(sid):
    """更新最后活跃时间"""
    with data_lock:
        if sid in active_users:
            active_users[sid]["last_activity"] = time.time()

UE_Animate = False
# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # 启用跨域支持

socketio = SocketIO(app, cors_allowed_origins="*")  # WebSocket支持


@app.before_request
def limit_connections():
    """每个请求前检查并发限制"""
    # 对 status、socketio 和静态文件的请求不进行并发限制
    if request.endpoint in ("status", "socketio_message", "static", "serve_static", "monitor_page"):
        return

    cleanup()
    sid = get_or_create_session_id()

    with data_lock:
        if sid in active_users:
            # 用户已在活跃列表，更新活跃时间
            active_users[sid]["last_activity"] = time.time()
            request.sid = sid
        elif len(active_users) < MAX_ACTIVE:
            # 活跃用户未满，直接加入
            active_users[sid] = {
                "ip": get_client_ip(),
                "connect_time": time.time(),
                "last_activity": time.time()
            }
            logger.info(f"新用户 {sid} 进入网站")
            request.sid = sid
        else:
            # 人数已满，加入等待队列
            if not any(w["sid"] == sid for w in waiting_queue):
                waiting_queue.append({
                    "sid": sid,
                    "ip": get_client_ip(),
                    "queue_enter_time": time.time()
                })
                logger.info(f"用户 {sid} 加入等待队列")
            
            resp = make_response("⏳ 人数已满，你正在等待队列中...")
            resp.set_cookie("sid", sid)
            return resp

@app.route("/status")
def status():
    """返回用户当前是active还是waiting"""
    cleanup()
    sid = get_or_create_session_id()
    with data_lock:
        if sid in active_users:
            return {"status": "active"}
        else:
            # 细化等待状态，提供排队位置
            position = -1
            for i, user in enumerate(waiting_queue):
                if user['sid'] == sid:
                    position = i + 1
                    break
            return {"status": "waiting", "position": position, "total": len(waiting_queue)}


# Llama 服务器地址
LLAMA_SERVER = "http://10.1.0.106:7001"
WHISPER_SERVER = "http://10.1.0.106:7002"
GTTS_SERVER = "http://127.0.0.1:7010"


# ===== WebSocket事件 =====
@socketio.on('connect')
def ws_connect():
    sid = request.cookies.get("sid")
    if sid:
        update_activity(sid)
        logger.info(f"用户 {sid} WebSocket 连接建立")

@socketio.on('heartbeat')
def ws_heartbeat():
    # 心跳包也应该更新活跃时间
    sid = request.cookies.get("sid")
    if sid:
        update_activity(sid)

@socketio.on('disconnect')
def ws_disconnect():
    sid = request.cookies.get("sid")
    with data_lock:
        if sid in active_users:
            del active_users[sid]
            logger.info(f"用户 {sid} 关闭页面释放会话")
            if waiting_queue:
                next_user = waiting_queue.popleft()
                next_sid = next_user['sid']
                now = time.time()
                active_users[next_sid] = {
                    "ip": next_user['ip'],
                    "connect_time": now,
                    "last_activity": now
                }
                logger.info(f"等待用户 {next_sid} 进入网站")


# 服务静态文件（index.html 等）
@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

# 服务其他静态文件（js, css, images 等）
@app.route('/<path:path>')
def serve_static(path):
    # 确保监控页面不会被当作静态文件处理
    if path == 'monitor':
        return monitor_page()
    return send_from_directory('.', path)


UE_Socket_Host = '0.0.0.0'
UE_Socket_Port = 4000
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
        if data_to_send is None:
            print(f"⚠️ 没有可发送的数据")
            return
        
        message = json.dumps(data_to_send).encode('utf-8')
        self.client_socket.sendall(message)
        print(f"📤 已发送数据到 {self.address}: {message.decode('utf-8')}")

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

        return jsonify({"message": "✅ 数据已发送"}), 200

@app.route('/socket:ue/animation', methods=['POST'])
def animation():
    if UE_Animate:
        global TCP_Socket
        
        try:
            request_data = request.json
            logger.info(f"收到动画请求: {request_data}")
            print(f"✅ 已接收到数据: {request_data}")
            if not request_data:
                return jsonify({"error": "请求体不能为空"}), 400
            
            action_data = request_data.get('action', [])
            assert isinstance(action_data, list), f'action参数必须是列表: action = {action_data}'
            
            response = {
                "status": "success",
                "code": 200,
                "message": "Animation request processed successfully",
                "data": {
                    "action": action_data
                }
            }
            
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
        
        is_stream = request.json.get('stream', False)
        
        response = requests.post(
            f"{LLAMA_SERVER}/v1/chat/completions",
            json=request.json,
            headers={
            'Content-Type': 'application/json'
            },
            stream=is_stream
        )
        
        logger.info(f"Response status code: {response.status_code}")
        
        if is_stream:
            def generate():
                for chunk in response.iter_lines():
                    if chunk:
                        # logger.info(f"Response chunk: {chunk.decode('utf-8')}")
                        yield chunk + b'\n\n'
            
            return generate(), response.status_code, {'Content-Type': 'text/event-stream'}
        else:
            logger.info(f"Response content: {response.text}")
            return response.json(), response.status_code
        
    except requests.exceptions.ConnectionError as e:
        error_msg = f"Connection error: Could not connect to {LLAMA_SERVER}"
        logger.error(error_msg)
        logger.error(str(e))
        return jsonify({"error": "Connection Error", "detail": error_msg, "exception": str(e)}), 503
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Request failed: {str(e)}"
        logger.error(error_msg)
        return jsonify({"error": "Request Failed", "detail": error_msg, "exception": str(e)}), 500
        
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        logger.error(error_msg)
        return jsonify({"error": "Server Error", "detail": error_msg, "exception": str(e)}), 500

# 转发 gtts 请求到指定服务器
@app.route('/gtts/', methods=['POST'])
def gtts_chat():
    try:
        logger.info(f"Forwarding request to {GTTS_SERVER}")
        logger.info(f"Request data: {request.json}")
        
        response = requests.post(
            f"{GTTS_SERVER}/v1beta1/text:synthesize",
            json=request.json,
            headers={'Content-Type': 'application/json'},
        )
        
        logger.info(f"Response status code: {response.status_code}")
        return response.json(), response.status_code
        
    except Exception as e:
        logger.error(f"An error occurred: {str(e)}")
        return jsonify({"error": "An error occurred", "message": str(e)}), 500

# 转发 whisper.cpp 请求到指定服务器
@app.route('/whisper/inference', methods=['POST'])
def whisper_chat():
    try:
        logger.info(f"Forwarding request to {WHISPER_SERVER}")
        
        files = {}
        if 'file' in request.files:
            file = request.files['file']
            files = {'file': (file.filename, file.read(), file.content_type)}
        
        form_data = {key: request.form[key] for key in request.form}
        
        headers = {}
        if 'Authorization' in request.headers:
            headers['Authorization'] = request.headers['Authorization']
        
        response = requests.post(
            f"{WHISPER_SERVER}/inference",
            files=files,
            data=form_data,
            headers=headers
        )
        
        logger.info(f"Response status code: {response.status_code}")
        
        try:
            return response.json(), response.status_code
        except ValueError:
            return response.content, response.status_code, {'Content-Type': response.headers.get('Content-Type')}
        
    except requests.exceptions.ConnectionError as e:
        error_msg = f"Connection error: Could not connect to {WHISPER_SERVER}"
        logger.error(error_msg)
        logger.error(str(e))
        return jsonify({"error": "Connection Error", "detail": error_msg, "exception": str(e)}), 503

    except requests.exceptions.RequestException as e:
        error_msg = f"Request failed: {str(e)}"
        logger.error(error_msg)
        return jsonify({"error": "Request Failed", "detail": error_msg, "exception": str(e)}), 500

    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        logger.error(error_msg)
        return jsonify({"error": "Server Error", "detail": error_msg, "exception": str(e)}), 500
        
# --- 日志记录与监控 ---

def log_user_status_to_file():
    """
    将活跃用户和等待用户的状态信息格式化并写入到 user.txt 文件中。
    """
    header = f"{'session-id':<38}{'IP地址':<17}{'接入时间':<21}{'最后一次操作时间':<21}{'无操作时间(秒)':<17}{'等待时间(秒)':<15}\n"
    separator = "-" * 130 + "\n"
    
    with open("user.txt", "w", encoding="utf-8") as f:
        f.write(f"--- 用户状态更新于: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ---\n\n")
        f.write(header)
        f.write(separator)

        now = time.time()
        
        with data_lock:
            # 记录活跃用户
            for sid, data in active_users.items():
                ip = data.get('ip', '--')
                connect_time_str = datetime.fromtimestamp(data.get('connect_time', 0)).strftime('%Y-%m-%d %H:%M:%S')
                last_activity_str = datetime.fromtimestamp(data.get('last_activity', 0)).strftime('%Y-%m-%d %H:%M:%S')
                idle_time = int(now - data.get('last_activity', now))
                line = f"{sid:<38}{ip:<17}{connect_time_str:<21}{last_activity_str:<21}{idle_time:<17}{'--':<15}\n"
                f.write(line)

            # 记录等待用户
            for user in waiting_queue:
                sid = user.get('sid', 'N/A')
                ip = user.get('ip', '--')
                waiting_time = int(now - user.get('queue_enter_time', now))
                line = f"{sid:<38}{ip:<17}{'--':<21}{'--':<21}{'--':<17}{waiting_time:<15}\n"
                f.write(line)
        
        f.write("\n--- 日志结束 ---\n")

def run_periodic_logging():
    """
    一个无限循环的函数，每隔10秒调用一次日志记录函数。
    """
    while True:
        try:
            log_user_status_to_file()
        except Exception as e:
            logger.error(f"Failed to log user status: {e}")
        time.sleep(10)

# --- 新增的监控页面路由 ---
@app.route('/monitor')
def monitor_page():
    """
    在网页上展示 user.txt 的内容。
    页面会每 5 秒自动刷新。
    """
    try:
        # 读取日志文件的全部内容
        with open("user.txt", "r", encoding="utf-8") as f:
            content = f.read()
        
        # 使用 <pre> 标签保留原始文本的换行和空格格式
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>用户状态监控</title>
            <meta http-equiv="refresh" content="5">
            <style>
                body {{ background-color: #1e1e1e; color: #d4d4d4; font-family: Consolas, monaco, monospace; }}
                pre {{ white-space: pre-wrap; word-wrap: break-word; }}
            </style>
        </head>
        <body>
            <pre>{content}</pre>
        </body>
        </html>
        """
        return html_content, 200

    except FileNotFoundError:
        return "日志文件 'user.txt' 尚未生成，请稍后刷新。", 404
    except Exception as e:
        return f"读取日志文件时出错: {e}", 500

    
if __name__ == '__main__':
    is_main_process = os.environ.get('WERKZEUG_RUN_MAIN') == 'true'

    if is_main_process:
        # 在主线程中启动后台日志记录线程
        log_thread = threading.Thread(target=run_periodic_logging, daemon=True)
        log_thread.start()
        logger.info("后台用户状态日志记录线程已启动...")
        
        # 如果需要与UE交互，则初始化Socket服务
        if UE_Animate:
            TCP_Socket = SocketService(UE_Socket_Host, UE_Socket_Port) 
    
    # 启动主Flask应用，监听8000端口
    app.run(host='0.0.0.0', port=8000, debug=True)