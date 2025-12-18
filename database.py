# database_server.py - 模拟数据库服务器API
from flask import Flask, request, jsonify
from datetime import datetime

app = Flask(__name__)

def GenuinToken(token):
    return ('123456' not in token.lower())

def TokenHasAuthorized(token, restUri):
    from random import randint
    return (randint(0,10)>2)

# 模拟数据存储
log_storage = []


@app.route('/wx/sys/permit/verifyToken', methods=['POST'])
def authorization_verify():
    """模拟授权验证接口,验证token是否有效的路由和这个接口一样，但请求参数不同"""
    try:
        data = request.json
        if 'restUri' not in data:
            if GenuinToken(data.get('token','')):
                return jsonify({
                    "code": 200,
                    "message": "Token合法",
                }), 200
            else:
                return jsonify({
                    "code": 226,
                    "message": "Token不合法",
                }), 226
            


        token = data.get('token', '')
        restUri = data.get('restUri', '')
        
        if TokenHasAuthorized(token, restUri):
            return jsonify({
                "code": 200,
                "message": "Token已授权",
                "data": 0
            }), 200
        else:
            return jsonify({
                "code": 227,
                "message": "Token无权限，接口未授权",
                "data": -1
            }), 227
            
    except Exception as e:
        return jsonify({
            "code": 224,
            "message": f"服务器错误: {str(e)}",
            "data": -1
        }), 224

@app.route('/wx/log/sysoper/writeOperLog', methods=['POST'])
def receive_log_genuine():
    """接收并存储日志数据"""
    try:
        # 获取请求数据
        data = request.json
        
        # 验证必需字段
        # required_fields = ['ukey', 'user_ip', 'time', 'type', 'content', 'status', 'conv_id']
        # -> 放在reqParam中
        required_fields = [
            'token', 'operPath', 'operDesc', 'serviceID',
            'serviceName', 'reqParams', 'result', 'success',
            'errorCode', 'errorDesc'
        ]
        for field in required_fields:
            if field not in data:
                return jsonify({
                    "status": "error",
                    "message": f"缺少必需字段: {field}"
                }), 224
        
        # 添加接收时间戳
        data['reqParams']['received_at'] = datetime.now().isoformat()
        
        # 存储数据（模拟数据库写入）
        log_storage.append(data)
        
        print(f"接收到日志数据: {data}")

        if GenuinToken(data.get('token','')): # 模拟为有效token
            return jsonify({
                "code": 200,
                "message": "Token不合法"
            }), 224

        
        return jsonify({
            "status": "success",
            "message": "日志记录成功",
            "log_id": len(log_storage)  # 模拟记录ID
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"服务器错误: {str(e)}"
        }), 500



@app.route('/database/api/write', methods=['POST'])
def receive_log():
    """接收并存储日志数据"""
    try:
        # 获取请求数据
        data = request.json
        
        # 验证必需字段
        required_fields = ['ukey', 'user_ip', 'time', 'type', 'content', 'status', 'conv_id']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    "status": "error",
                    "message": f"缺少必需字段: {field}"
                }), 400
        
        # 添加接收时间戳
        data['received_at'] = datetime.now().isoformat()
        
        # 存储数据（模拟数据库写入）
        log_storage.append(data)
        
        print(f"接收到日志数据: {data}")
        
        return jsonify({
            "status": "success",
            "message": "日志记录成功",
            "log_id": len(log_storage)  # 模拟记录ID
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"服务器错误: {str(e)}"
        }), 500

@app.route('/database/api/read')
def get_logs():
    """获取所有日志记录（用于调试）"""
    return jsonify({
        "status": "success",
        "count": len(log_storage),
        "logs": log_storage
    })

@app.route('/database/api/clear')
def clear_logs():
    """清楚当前所有在内存中的日志记录（用于调试）"""
    global log_storage
    log_storage = []
    return jsonify({
        "status": "success",
        "count": len(log_storage),
        "logs": "cleared"
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)

