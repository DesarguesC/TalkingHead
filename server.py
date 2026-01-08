# pip install flask_cors flask_socketio
from flask import (
    Flask, 
    send_from_directory, 
    request, 
    jsonify, 
    make_response, 
    render_template,
    render_template_string
)
from flask_cors import CORS
from flask_socketio import SocketIO
from logging.handlers import RotatingFileHandler
import requests
import logging, inspect
import socket
import threading
import time, pdb, os, ssl
import json
from uuid import uuid4
from collections import deque
from datetime import datetime
import pandas as pd
import csv


# 互斥锁
data_lock = threading.Lock()

# 并发控制参数
MAX_ACTIVE = 5
TIMEOUT = 120  # 秒
active_users = {}
waiting_queue = deque()
# 用于存放刚刚被踢出的用户SID ---
timed_out_sids = set()


def get_or_create_session_id():
    """
    获取或创建唯一sid，并将其存储在request上下文中以便全局使用。
    """
    # 检查当前请求上下文中是否已经处理过sid，避免重复执行
    if not hasattr(request, 'sid'):
        sid_from_cookie = request.cookies.get("sid")
        if not sid_from_cookie:
            # 如果cookie中没有，则创建一个新的
            request.sid = str(uuid4())
        else:
            # 如果cookie中有，则使用它
            request.sid = sid_from_cookie
    return request.sid



def set_ukey(ukey):
    # 无ukey则设置|有ukey但不同则更新|最终都返回当前ukey
    if not hasattr(request, 'ukey'):
        ukey_from_cookie = request.cookies.get("ukey")
        logger.info(f"从cookie里获得ukey：{ukey_from_cookie}")
        if not ukey_from_cookie:
            request.ukey = ukey
        else:
            if ukey_from_cookie != ukey and ukey != '':
                request.ukey = ukey
            else:
                request.ukey = ukey_from_cookie
    
    return request.ukey
        

def get_conversation_id(session_id: str = None):
    if not hasattr(request, 'conv_id'):
        request.conv_id = request.cookies.get("conv_id", "?")
    return request.conv_id
    # return request.get('conv_id', request.get("conv_id", request.cookies.get("conv_id", "")))

def cleanup():
    """释放超时用户，并让等待队列的人进来"""
    now = time.time()
    with data_lock:
        expired = [sid for sid, data in active_users.items() if now - data.get("last_activity", now) > TIMEOUT]
        for sid in expired:
            del active_users[sid]
            # --- 将被踢出的用户SID加入超时集合 ---
            timed_out_sids.add(sid)
            logger.info(f"会话 {sid} 因超时释放，已标记为超时。")
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

app = Flask(__name__, static_folder='node_modules')
CORS(app)  # 启用跨域支持

socketio = SocketIO(app, cors_allowed_origins="*")  # WebSocket支持


@app.before_request
def limit_connections():
    """每个请求前检查并发限制"""
    # 步骤 1: 确保每个请求都关联一个SID (无论是来自cookie还是新创建的)
    sid = get_or_create_session_id()

    # 步骤 2: 对特定请求不进行并发限制，但SID已经生成/获取
    if request.endpoint in ("status", "socketio_message", "static", "serve_static", "monitor_page"):
        return

    # 步骤 3: 执行原有的并发控制逻辑
    cleanup()

    with data_lock:
        if sid in active_users:
            # 用户已在活跃列表，更新活跃时间
            active_users[sid]["last_activity"] = time.time()
        elif len(active_users) < MAX_ACTIVE:
            # 活跃用户未满，直接加入
            active_users[sid] = {
                "ip": get_client_ip(),
                "connect_time": time.time(),
                "last_activity": time.time()
            }
            logger.info(f"新用户 {sid} 进入网站")
        else:
            # 人数已满，加入等待队列
            if not any(w["sid"] == sid for w in waiting_queue):
                waiting_queue.append({
                    "sid": sid,
                    "ip": get_client_ip(),
                    "queue_enter_time": time.time()
                })
                logger.info(f"用户 {sid} 加入等待队列")
            
            # 注意：这里的响应也会被下面的 after_request 钩子处理，确保cookie被设置
            return make_response("⏳ 人数已满，你正在等待队列中...")

@app.route("/status")
def status():
    """返回用户当前是active, waiting,还是timed_out"""
    cleanup()
    sid = get_or_create_session_id()
    with data_lock:
        # --- 优先检查用户是否刚被踢出 ---
        if sid in timed_out_sids:
            timed_out_sids.remove(sid)  # 移除SID，此通知只发送一次
            return jsonify({"status": "timed_out", "message": "会话已超时，请刷新页面重新排队。"})

        if sid in active_users:
            return jsonify({"status": "active"})
        else:
            position = -1
            for i, user in enumerate(waiting_queue):
                if user['sid'] == sid:
                    position = i + 1
                    break
            # 如果不在等待队列，也返回waiting状态，让他开始排队
            return jsonify({"status": "waiting", "position": position, "total": len(waiting_queue)})


# Llama 服务器地址
LLAMA_SERVER = "http://127.0.0.1:7001" 
# 此处几个TODO为「对接确认点」
Yuexiaoyin_SERVER = "https://api.dify.ai" # TODO: 替换为内网实际地址
# 需要用本机上的方法，整机测试时需将实验室服务器挂入子网中访问 (模拟后续使用内网API访问)
WHISPER_SERVER = "http://127.0.0.1:7002"
GTTS_SERVER = "http://127.0.0.1:7010"

# DATABASE_SERVER = "http://47.121.202.21:13008" # TODO: 替换为真实地址
# TokenAuthorize_SERVER = "http://47.121.202.21:13008" # TODO: 替换为真实地址
# TokenVERIFY_SERVER = "http://47.121.202.21:13008" # TODO: 替换为真实地址

DATABASE_SERVER = "http://127.0.0.1:5001" # TODO: 替换为真实地址
TokenAuthorize_SERVER = "http://127.0.0.1:5001" # TODO: 替换为真实地址
TokenVERIFY_SERVER = "http://127.0.0.1:5001" # TODO: 替换为真实地址

# 状态字典，可以根据具体需要直接更新
TYPE_MAP = {
    "login": "用户进入", # used
    "query": "用户提问"  # used
}
STATUS_MAP = {
    "success": "请求成功", # used
    "failed": "请求失败",  # used
    "denied": "拒绝访问",
    "pending": "进行中",
}
ErrorMap = {
    "200": "成功，Token 有效",
    "224": "系统异常",
    "225": "服务器忙",
    "226": "Token无效",
    "227": "接口未授权",
    "500": "请求失败或服务器错误",
    "503": "网络连接错误",
    "none": "无错误发现",
}

def get_failure_html(code, message):
    code = str(code)
    message = str(message)
    return """<!doctype html>
        <html lang="zh-CN">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width,initial-scale=1">
            <title>{format_code} || {format_message}</title>
            <style>
                body {{
                    font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial;
                    background: #f7f7f7;
                    margin: 0;
                    padding: 40px;
                    text-align: center;
                }}
                .box {{
                    background: #fff;
                    max-width: 500px;
                    margin: 0 auto;
                    padding: 30px 28px;
                    border-radius: 10px;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.1);
                }}
                h1 {{
                    margin-top: 0;
                    font-size: 32px;
                    color: #d9822b;
                }}
                p {{
                    font-size: 16px;
                    color: #444;
                    line-height: 1.6;
                }}
                .code {{
                    font-size: 48px;
                    font-weight: bold;
                    color: #c76b1a;
                }}
                a.btn {{
                    display: inline-block;
                    margin-top: 20px;
                    padding: 10px 18px;
                    text-decoration: none;
                    border: 1px solid #d9822b;
                    color: #d9822b;
                    border-radius: 6px;
                }}
                a.btn:hover {{
                    background: #d9822b;
                    color: #fff;
                }}
            </style>
        </head>
        <body>

        <div class="box">
            <div class="code">{xxx_code}</div>
            <h1>{err_message}</h1>
            <p>
                当前请求返回了异常状态码 <strong>{codeeee}</strong>。<br>
                意味着需要进一步操作或等待处理完成。
            </p>
            <p>
                如果这是意外情况，请稍后重试或联系管理员。
            </p>

            <a class="btn" href="/">返回首页</a>
        </div>

        </body>
        </html>
        """.format(format_code=code, format_message=message, xxx_code=code, err_message=message, codeeee=code)
# TODO: <a class="btn" href="/">返回首页</a> 中的href="/"修改为重定向前的路径

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
        # logger.debug(f"收到 {sid} 心跳包")

@socketio.on('disconnect')
def ws_disconnect():
    sid = request.cookies.get("sid")
    with data_lock:
        if sid in active_users:
            del active_users[sid]
            logger.info(f"用户 {sid} 关闭页面释放会话")
            if waiting_queue:
                # --- 从等待队列中提升用户时使用正确的数据结构 ---
                next_user = waiting_queue.popleft()
                next_sid = next_user['sid']
                now = time.time()
                active_users[next_sid] = {
                    "ip": next_user['ip'],
                    "connect_time": now,
                    "last_activity": now
                }
                logger.info(f"等待用户 {next_sid} 进入网站")

UE_Socket_Host = '0.0.0.0'  # 本地地址
UE_Socket_Port = 4000         # 目标端口
# TCP_Socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

# 已弃用 | 原用于UE动作驱动的类
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

# 已弃用 | 原用于UE动作驱动信号的传输
@app.route('/socket:ue/animation', methods=['POST'])
def animation():
    if UE_Animate:
        global TCP_Socket
        
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

# 已弃用 | 原用于通过网络请求获取token
# @app.route('/app/jwt/get', methods=['POST'])
def get_jwt():
    try:
        filePath = request.json().get('filePath', None)
        env_key = os.environ.get('USE_APIKEY')
        if env_key:            
            # 创建jwtGet所需的json返回
            logger.info(f"Using JWT from environment variable USE_APIKEY = {env_key}.")
            return jsonify({
                "status": "success",
                "code": 200,
                "message": "JWT request processed successfully",
                "data": {
                    "jwt": env_key
                }
            }), 200
        elif filePath:
            logger.info(f"Reading JWT from file: {filePath}")
            if os.path.exists(filePath):
                if filePath.endswith('.csv'): file_key = pandas.read_csv(filePath)['key'][0]
                else: # txt, etc.
                    with open(filePath, 'r') as f:
                        file_key = f.read().strip()
                return jsonify({
                    "status": "success",
                    "code": 200,
                    "message": "JWT request processed successfully",
                    "data": {
                        "jwt": file_key
                    }
                }), 200
            else:
                return jsonify({
                    "error": {
                        "code": 404,
                        "message": f"文件路径 {filePath} 不存在",
                        "status": "BAD_REQUEST"
                    }
                }), 404
        else:
            return jsonify({
                    "status": "success",
                    "code": 204,
                    "message": "JWT request got an empty return",
                    "data": {
                        "jwt": ""
                    }
            }), 204
    except Exception as e:
        print(f"⚠️ 处理 GET 请求时出错: {e}")
        logger.error(f"获取 JWT 失败: {str(e)}")

# 读取本地token「大模型请求权限」
def get_apikey(filePath='./key.csv'):
    try:
        filePath = request.json.get('filePath', None)
        env_key = os.environ.get('USE_APIKEY')
        if env_key:            
            # 创建jwtGet所需的json返回
            logger.info(f"Using JWT from environment variable USE_APIKEY = {env_key}.")
            return env_key
        elif filePath:
            logger.info(f"Reading JWT from file: {filePath}")
            if os.path.exists(filePath):
                if filePath.endswith('.csv'): 
                    import pandas
                    file_key = pandas.read_csv(filePath)['key'][0]
                else: # txt, etc.
                    with open(filePath, 'r') as f:
                        file_key = f.read().strip()
                return file_key
    except Exception as e:
        print(f"⚠️ 处理 GET 请求时出错: {e}")
        logger.error(f"获取 JWT 失败: {str(e)}")
        return ""

# 获取用户ip
def get_client_ip():
    """获取用户真实IP地址（考虑代理情况）"""
    if request.headers.get('X-Forwarded-For'):
        ip = request.headers['X-Forwarded-For'].split(',')[0]
    elif request.headers.get('X-Real-IP'):
        ip = request.headers['X-Real-IP']
    else:
        ip = request.remote_addr
    return ip

def get_log_string():
    ukey = request.args.get('wxtoken')
    
    if not ukey:
        logger.error("WARNING: no ukey valid")
        ukey = "12121212121211212121"
    user_ip = get_client_ip()
    current_time = datetime.now().strftime("%y-%m-%d %H-%M-%S")
    return ukey, user_ip, current_time

# 全局日志设定
def setup_logging():
    # 创建本地日志格式
    formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s'
    )
    
    # 创建文件处理器，设置日志文件最大为10MB，保留5个备份
    file_handler = RotatingFileHandler(
        'ukey_access.log', 
        maxBytes=10*1024*1024, 
        backupCount=5,
        encoding='utf-8'
    )
    file_handler.setFormatter(formatter)
    file_handler.setLevel(logging.INFO)
    
    # 添加到app的logger
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)


import json # 确保文件开头导入了 json

def log_ukey_access(ukey, user_ip, operation_time, operation_type, operation_content, operation_status, conv_id, errCode=None, errMsg=None):
    """
    统一记录日志：
    1. 写入本地 ukey_access.log
    2. 动态映射 0001/0002 并推送到网校数据库
    """
    # 1. 写入本地日志文件 (用于排查服务器本地问题)
    log_message = (f"[ {operation_time} ] ukey_access | ukey: {ukey} | "
                   f"ip: {user_ip} | 类型: {operation_type} | "
                   f"内容: {operation_content} | 状态: {operation_status} | 编号: {conv_id}")
    
    print(f'LOG: {log_message}')
    app.logger.info(log_message)

    # 2. 准备业务数据字典 (对应 reqParams 内部)
    biz_data = {
        "user_ip": user_ip,
        "type": operation_type,
        "content": operation_content,
        "conv_id": conv_id
    }

    # 3. 将字典转为符合网校要求的 JSON 字符串
    req_params_json_str = json.dumps(biz_data, ensure_ascii=False)

    # 4. 判定是否成功 (使用您定义的 STATUS_MAP)
    is_success = (operation_status == STATUS_MAP['success'])

    # 5. 核心：根据操作类型动态映射 operPath
    # TYPE_MAP['login'] -> "0001" (进入系统)
    # TYPE_MAP['query'] -> "0002" (用户提问)
    path_map = {
        TYPE_MAP['login']: "0001",
        TYPE_MAP['query']: "0002"
    }
    current_path = path_map.get(operation_type, "0001")

    # 6. 构建最终推送 Payload (严格对齐合作伙伴截图)
    payload = {
        "token": ukey if ukey else "", 
        "operPath": current_path,               # 动态传入 0001 或 0002
        "operDesc": operation_type,             # "用户进入" 或 "用户提问"
        "serviceId": "DigitizeHuman",           # 核心修正：去掉末尾多余的 'd'
        "serviceName": "数字人",
        "reqParams": req_params_json_str, 
        "result": operation_status,
        "success": is_success                   # 必须是布尔值
    }

    # 7. 只有在失败时才加入错误描述参数
    if not is_success:
        payload["errorCode"] = int(errCode) if (errCode and str(errCode).isdigit()) else 500
        payload["errorDesc"] = errMsg if errMsg else "操作失败"

    # 8. 执行 HTTP POST 发送
    try:
        response = requests.post(
            f'{DATABASE_SERVER}/nsw/log/sysoper/writeOperLog', 
            json=payload, 
            timeout=5
        )
        
        # 记录推送的原始数据包以便调试
        app.logger.info(f"推送日志数据包: {json.dumps(payload, ensure_ascii=False)}")
        
        if response.status_code == 200:
            res_json = response.json()
            if res_json.get("code") == 200:
                app.logger.info(f"网校日志 [{current_path}] 推送成功")
                return 200
            else:
                app.logger.error(f"网校业务报错: {res_json.get('code')} - {res_json.get('msg')}")
                return res_json.get("code")
        else:
            app.logger.error(f"网络响应错误码: {response.status_code}")
            return response.status_code
            
    except Exception as e:
        app.logger.error(f"日志接口调用崩溃: {str(e)}")
        return 500


# 服务静态文件（index.html 等）
# 已经删除此路由 | 此处无权限校验
# [IMPORTANT]
# @app.route('/')
def serve_index():
    ukey, user_ip, current_time = get_log_string()
    log_ukey_access(ukey, user_ip, current_time, TYPE_MAP['login'], "", STATUS_MAP['success'], request.cookies.get("conv_id", "?"), errCode="none")
    return send_from_directory('.', 'index.html')

# 服务其他静态文件（js, css, images 等）
@app.route('/<path:path>')
def serve_static(path):
    # if path == 'monitor':
        # return monitor_page()
    return send_from_directory('.', path)
@app.route("/node_modules/<path:filename>")
def node_modules(filename):
    return send_from_directory("node_modules", filename)

# 已删除测试路由
# [IMPORTANT]
# @app.route('/show224')
def show_224():
    return render_template_string(get_failure_html("224", "系统异常")), 224
# @app.route('/show225')
def show_225():
    """显示225错误页面（仅用于测试）"""
    return render_template_string(get_failure_html("225", "服务器繁忙")), 225
# @app.route('/show226')
def show_226():
    return render_template_string(get_failure_html("226", "Token无效")), 226
# @app.route('/show227')
def show_227():
    return render_template_string(get_failure_html("227", "接口未授权")), 227

def show_err_page(code):
    return show_224() if code == 224 else (
        show_225() if code == 225 else (
            show_226() if code == 226 else (
                show_227() if code == 227 else (
                    render_template_string(get_failure_html(str(code), "未知错误")), code
                )
            )
        )
    )



# 解析ukey参数 | [无需验证·已废弃的接口]
# @app.route('/ukey_access')
@app.route('/')
def ukey_access_handler():
    """处理带有ukey参数的访问请求"""
    # 获取ukey参数
    ukey = request.args.get('wxtoken', '') #or request.cookies.get('ukey', '')
    #ukey = "p/kebZFEAc1kCIOb67ra0yaBBMIwQfeb/nEVEAHLKsKyObODGEG0pMFv/uUciQXciYftj7eipfm8VMJQZEze3Xc1QNjxuQyywAv16mjdWVI9P6GXup09OFncrjRHDR1c"
    logger.info(ukey)
    ukey = ukey.replace(' ', '+')
    logger.info(ukey)

    
    # 自然会被deny
    # if not ukey:
    #     return jsonify({
    #         "status": "error",
    #         "message": "缺少ukey参数"
    #     }), 400


    # 获取用户IP
    user_ip = get_client_ip()
    
    # 获取当前时间（格式：yy-mm-dd hh-mm-ss）
    current_time = datetime.now().strftime("%y-%m-%d %H-%M-%S")
    # token合法性检验
    token_request = requests.post(
        f'{TokenVERIFY_SERVER}/nsw/sys/permit/verifyToken',
        json={"token": ukey},
        headers={
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ',
        }
    )
    logger.info(f"Token 验证响应: {token_request.status_code} | 内容: {token_request.text}")
    if token_request.status_code != 200:
        # 记录失败日志
        errCode = token_request.json().get("code", 224)
        errMsg = token_request.json().get("message", "Token无效或系统异常")
        log_ukey_access(ukey, user_ip, current_time, TYPE_MAP['login'], "", STATUS_MAP['denied'], 
                        token_request.cookies.get("conv_id", "?"), errCode=str(errCode), errMsg=errMsg)
        return show_err_page(errCode)
        # render_template_string(get_failure_html(errCode, errMsg)), 224
    
    # 权限核验
    auth_request = requests.post(
        f'{TokenAuthorize_SERVER}/nsw/sys/permit/checkPermit',
        json={"token": ukey, "restUri": "0001"},
        headers={
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ',
        }
    )
    logger.info(f"Token 授权响应: {auth_request.status_code} | 内容: {auth_request.text}")
    if auth_request.status_code != 200 or auth_request.json().get("data", -1) == -1:
        # 记录失败日志
        errCode = auth_request.json().get("code", 224)
        errMsg = auth_request.json().get("msg", "未授权或系统异常")
        log_ukey_access(ukey, user_ip, current_time, TYPE_MAP['login'], "", STATUS_MAP['denied'], 
                        auth_request.cookies.get("conv_id", "?"), errCode=errCode, errMsg=errMsg)
        return show_err_page(errCode)
        # render_template_string(get_failure_html(errCode, errMsg)), 224
    
    
    # 记录日志
    log_ukey_access(ukey, user_ip, current_time, TYPE_MAP['login'], "", STATUS_MAP['success'], auth_request.cookies.get("conv_id", "?"), errCode=200)
    resp = make_response(send_from_directory('./', 'index.html'))
    #resp = make_response(render_template('index.html', ukey=ukey))
    ukey = set_ukey(ukey)
    logger.info(f'接收到的 ukey 参数: {ukey}')
    resp.set_cookie('ukey', ukey, max_age=3600)  # 设置ukey cookie，1h有效期
    resp.set_cookie('sid', get_or_create_session_id(), max_age=3600)  # 设置sid cookie，1h有效期
    resp.set_cookie('conv_id', '', max_age=3600)  # 刚进入，需要清空conv_id cookie，1h有效期
    return resp

    # # ... 前面是你的验证逻辑 ...
    # log_ukey_access(ukey, user_ip, current_time, TYPE_MAP['login'], "", STATUS_MAP['success'], auth_request.cookies.get("conv_id", "?"), errCode=200)
    
    # resp = make_response(send_from_directory('./', 'index.html'))
    
    # # 1. 在调用 set_ukey 之前，强制把空格还原为加号（修复损坏的 Token）
    # ukey = ukey.replace(' ', '+') 
    # ukey = set_ukey(ukey)
    
    # logger.info(f'最终存入 Cookie 的 ukey: {ukey}')

    # # 2. 增加 path='/'，确保局域网下重启浏览器后，所有路径都能读到 Cookie
    # # 3. 建议调大 max_age 或者保持 3600，但必须加 path
    # resp.set_cookie('ukey', ukey, max_age=3600, path='/')  
    # resp.set_cookie('sid', get_or_create_session_id(), max_age=3600, path='/')
    
    # # 4. 彻底清空 conv_id，建议将 max_age 设为 0
    # resp.set_cookie('conv_id', '', max_age=0, path='/')  
    
    # return resp

    # # 返回成功响应
    # return jsonify({
    #     "status": "success",
    #     "message": "访问记录已保存",
    #     "data": {
    #         "ukey": ukey,
    #         "user_ip": user_ip,
    #         "received_at": current_time
    #     }
    # })

# 已删除测试路由
# [IMPORTANT]
# @app.route('/logs/recent')
def show_recent_logs():
    """显示最近的日志记录（仅用于调试）"""
    try:
        with open('ukey_access.log', 'r', encoding='utf-8') as f:
            lines = f.readlines()[-100:]  # 显示最后100行
        return "<pre>" + "".join(lines) + "</pre>"
    except FileNotFoundError:
        return "日志文件不存在"


# 转发 llama 请求到指定服务器
@app.route('/llama/v1/chat/completions', methods=['POST'])
def llama_chat():
    try:
        logger.info(f"Forwarding request to {LLAMA_SERVER}")
        logger.info(f"Request data: {request.json}")
        ukey, user_ip, current_time = get_log_string()
        ukey = set_ukey("")
        #ukey = request.json.get('ukey', '')
        logger.info(f"当前ukey: {ukey}") # DEBUG
        
        query = request.json.get('messages', [{"content": ""}])[-1].get("content", "你好") # 只需要当前提问；单轮对话，无上下文
        # 检查是否为流式请求
        is_stream = request.json.get('stream', False)
        
        logger.info(f"准备验证,操作0002, ukey: {ukey}") # DEBUG
        auth_request = requests.post(
            f'{TokenAuthorize_SERVER}/nsw/sys/permit/checkPermit',
            json={"token": ukey, "restUri": "0002"},
            headers={
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ',
            }
        )
        data = auth_request.json().get("data", -1)
        if data == -1:
            return render_template_string(get_failure_html(227, "接口未授权")), 227
        elif auth_request.status_code != 200:
            # 记录失败日志
            errCode = auth_request.json().get("code", 224)
            errMsg = auth_request.json().get("msg", "未授权或系统异常")
            conv_id = "未授权的对话" # 未授权
            log_ukey_access(ukey, user_ip, current_time, TYPE_MAP['login'], "", STATUS_MAP['denied'], 
                            conv_id, errCode=errCode, errMsg=errMsg)
            return render_template_string(get_failure_html(errCode, errMsg)), 224
        
        logger.info(f"验证成功,操作0002, ukey: {ukey}") # DEBUG
        logger.info(f"开始记录操作, ukey: {ukey}") # DEBUG
        code = log_ukey_access(ukey, user_ip, current_time, TYPE_MAP['query'], query, STATUS_MAP['success'], request.cookies.get("conv_id", "?"), errCode=200)
        
        # 转发请求到 Llama 服务器
        response = requests.post(
            f"{LLAMA_SERVER}/v1/chat/completions",
            json=request.json,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f"Bearer {get_apikey()}"
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
                        # logger.info(f"Response chunk: {chunk.decode('utf-8')}")
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

"""
llamaChatCompletionsProxy [javascript fetch]
    {
        method: "POST",
        mode: "cors",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + await jwtGet()
        },
        body: JSON.stringify(body),
        signal
    }

body [original] 
    {
      model: cfg('ai-model'),
      messages: msgs.map( x => {
        const {role,content,name} = x;
        return (name ? {role,content,name} : {role,content});
      }),
      temperature: cfg('ai-openai-temperature'),
      presence_penalty: cfg('ai-openai-presence'),
      frequency_penalty: cfg('ai-openai-frequency'),
      max_tokens: cfg('ai-openai-output'),
      stream: true
    };

=> [new]
    {
        "inputs": {},
        "query": Question,
        "response_mode": "streaming",
        "conversation_id": "",
        "user": "",
        "files":[] 
    }

"""

# 内网语言模型请求
@app.route('/yuexiaoyin/v1/chat/completions', methods=['POST'])
# @app.route('/llama/v1/chat/completions', methods=['POST'])
def yuexiaoyin_chat():
    # 请求结构转换
    ukey, user_ip, current_time = get_log_string()

    ukey = set_ukey('')
    #ukey = request.json.get('ukey', '')
    
    # TODO: 如有报错，请考虑大模型的请求格式，此处按照行业标准实现，且在dify.com的伪装接口上测试无误
    query = request.json.get('messages', [{"content": ""}])[-1].get("content", "你好") # 只需要当前提问；单轮对话，无上下文
    
    logger.info(f"当前ukey: {ukey}") # DEBUG
    session_id = get_or_create_session_id() # 此时必有id，直接获取
    conv_id = request.conv_id if hasattr(request, 'conv_id') else request.cookies.get("conv_id", "")
    request.conv_id  = conv_id
    # 获取上下文ID，可能为空（""），如果已经返回过，js中会放在cookies里
    logger.info(f"所有cookies: {request.cookies}") # DEBUG
    logger.info(f"Extracted query: {query}") # DEBUG

    user_cookies = request.ukey if hasattr(request, 'ukey') else request.cookies.get("ukey", "")

    new_request = jsonify({
        "inputs": {}, 
        "query": query,
        "response_mode": "streaming",
        "conversation_id": conv_id, # 后续放在request中
        "user": f"{user_cookies}%{session_id}", # TODO: user字段信息从哪里获取（session_id? ukey? ...） | 「对接点」
        "files":[]
    })
    # TODO: inputs里面的role, content, name等结构体字段可能需要修改 | 「对接点」

    logger.info(f"Extracted New Request: {new_request}") # DEBUG
    print(f"Extracted New Request: {new_request}")
    print(f"Extracted conv_id: {conv_id}")

    try:
        logger.info(f"Forwarding request to {Yuexiaoyin_SERVER}")
        logger.info(f"Request data: {request.json}")
        
        # 检查是否为流式请求
        is_stream = request.json.get('stream', False)
        
        # 权限核验
        
        logger.info(f"准备验证,操作0002, ukey: {ukey}") # DEBUG
        auth_request = requests.post(
            f'{TokenAuthorize_SERVER}/nsw/sys/permit/checkPermit',
            json={"token": ukey, "restUri": "0002"},
            headers={
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ',
            }
        )
        data = auth_request.json().get("data", -1)
        if data == -1:
            return render_template_string(get_failure_html(227, "接口未授权")), 227
        elif auth_request.status_code != 200:
            # 记录失败日志
            errCode = auth_request.json().get("code", 224)
            errMsg = auth_request.json().get("msg", "未授权或系统异常")
            conv_id = "未授权的对话" # 未授权
            log_ukey_access(ukey, user_ip, current_time, TYPE_MAP['login'], "", STATUS_MAP['denied'], 
                            conv_id, errCode=errCode, errMsg=errMsg)
            return render_template_string(get_failure_html(errCode, errMsg)), 224
        
        logger.info(f"验证成功,操作0002, ukey: {ukey}") # DEBUG
        logger.info(f"开始记录操作, ukey: {ukey}") # DEBUG
        code = log_ukey_access(ukey, user_ip, current_time, TYPE_MAP['query'], query, STATUS_MAP['success'], request.cookies.get("conv_id", "?"), errCode=200)
        # 转发请求到 Llama 服务器
        if code == 200:
            response = requests.post(
                f"{Yuexiaoyin_SERVER}/v1/chat-messages", # TODO: 如果路由有变化的话
                json=new_request.json,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f"Bearer {get_apikey()}"
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
                            # logger.info(f"Response chunk: {chunk.decode('utf-8')}")
                            yield chunk + b'\n\n'
                
                return generate(), response.status_code, {'Content-Type': 'text/event-stream'}
            else:
                # 非流式请求，返回完整的 JSON 响应
                logger.info(f"Response content: {response.text}")
                return response.json(), response.status_code
        else:
            raise Exception("Logging ukey access failed")
        
    except requests.exceptions.ConnectionError as e:
        error_msg = f"Connection error: Could not connect to {Yuexiaoyin_SERVER}"
        logger.error(error_msg)
        logger.error(str(e))
        log_ukey_access(ukey, user_ip, current_time, TYPE_MAP['query'], query, STATUS_MAP['failed'] + f' | 错误信息 [{error_msg}]', request.cookies.get("conv_id", "?"), errCode="503", errMsg=error_msg)
        return jsonify({
            "error": "Connection Error",
            "detail": error_msg,
            "exception": str(e)
        }), 503
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Request failed: {str(e)}"
        logger.error(error_msg)
        log_ukey_access(ukey, user_ip, current_time, TYPE_MAP['query'], query, STATUS_MAP['failed'] + f' | 错误信息 [{error_msg}]', request.cookies.get("conv_id", "?"), errCode="500", errMsg=error_msg)
        return jsonify({
            "error": "Request Failed",
            "detail": error_msg,
            "exception": str(e)
        }), 500
        
    except Exception as e:
        log_ukey_access(ukey, user_ip, current_time, TYPE_MAP['query'], query, STATUS_MAP['failed'] + f' | 错误信息 [{error_msg}]', request.cookies.get("conv_id", "?"), errCode="500", errMsg=error_msg)
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
    
# 设置session id
@app.after_request
def set_sid_if_needed(response):
    """
    在每个请求结束时检查是否需要设置sid cookie。
    这是修复“多session-id”问题的核心。
    """
    try:
        # 检查在请求处理过程中是否生成了sid
        if hasattr(request, 'sid'):
            # 如果请求中的cookie与我们最终确定的sid不一致（说明是新创建的sid）
            # 就需要在响应中设置cookie
            if request.cookies.get('sid') != request.sid:
                response.set_cookie('sid', request.sid, max_age=3600*24*7) # 设置7天有效期
    except Exception as e:
        # 即使发生异常，也确保程序不会崩溃
        logger.error(f"设置SID Cookie时出错: {e}")
    
    return response

# 跨域
# @app.after_request
# def add_cors_headers(resp):
#     resp.headers["Access-Control-Allow-Origin"] = "http://localhost:8000"  # 前端的域
#     resp.headers["Access-Control-Allow-Credentials"] = "true"
#     return resp

# 打session-id
def log_user_status_to_file():
    """
    将活跃用户和等待用户的状态信息格式化并写入到 user.txt 文件中。
    """
    header = f"{'session-id':<38}{'IP地址':<17}{'接入时间':<21}{'最后一次操作时间':<21}{'无操作时间(秒)':<17}{'等待时间(秒)':<15}\n"
    separator = "-" * 130 + "\n"
    
    with open("./configs/user.txt", "w", encoding="utf-8") as f:
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

# 每10s更新session信息
def run_periodic_logging():
    """
    每隔10秒调用一次日志记录函数。
    """
    while True:
        try:
            log_user_status_to_file()
        except Exception as e:
            logger.error(f"Failed to log user status: {e}")
        time.sleep(10)

# 查看 session log
# 已删除测试路由
# [IMPORTANT]
# @app.route('/monitor')
def monitor_page():
    """
    在网页上展示 user.txt 的内容。
    """
    try:
        # 读取日志文件的全部内容
        with open("user.txt", "r", encoding="utf-8") as f:
            content = f.read()
        
        # 使用 <pre> 标签可以保留原始文本的换行和空格格式
        # style 属性让页面更好看一些：黑色背景、白色文字、自动换行
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
        # 在主线程中启动后台日志记录线程 ---
        # 使用 daemon=True 确保主程序退出时，该线程也会随之退出
        setup_logging()
        log_thread = threading.Thread(target=run_periodic_logging, daemon=True)
        log_thread.start()
        logger.info("后台用户状态日志记录线程已启动...")

        # init_dict = {'session_id': 'test_id', 'conversation_id': 'test_id'}
        # with open('./configs/key.csv', 'r') as f:
        #     writer = csv.DictWriter(f, fieldnames=init_dict.keys())
        #     writer.writeheader()
        #     writer.writerow(data)
        
        # 网络诊断时注释掉 
        if os.environ.get('WERKZEUG_RUN_MAIN') == 'true' and UE_Animate:
            # 只会在 Flask 的 "重载子进程" 中运行 —— 真正运行你的应用
            TCP_Socket = SocketService(UE_Socket_Host, UE_Socket_Port) 
    
    # app.run(host='0.0.0.0', port=8000, debug=True)

    # 确保当前目录下有"server.pem"证书文件，若没有或提示已过期，可使用指令
    # openssl req -new -x509 -keyout server.pem -out server.pem -days 365 -nodes # 后按照提示输入即可
    if os.path.exists("./server.pem"):
        certfile = "server.pem"
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(certfile)   # 如果cert + key已分离，则传 (certfile, keyfile)
    else:
        context = None

    # 可选：禁用 werkzeug 自动 reloader（避免复杂的子进程逻辑）
    # app.run(host='0.0.0.0', port=8000, debug=True, use_reloader=False, ssl_context=context)

    # 保持你当前的 debug 设定（你已经用 WERKZEUG_RUN_MAIN 管理线程），直接传 context
    app.run(host='0.0.0.0', port=8000, debug=True, ssl_context=context)