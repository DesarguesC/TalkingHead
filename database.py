# database_server.py - 模拟数据库服务器API
from flask import Flask, request, jsonify
from datetime import datetime

app = Flask(__name__)

# 模拟数据存储
log_storage = []

@app.route('/database/api/write', methods=['POST'])
def receive_log():
    """接收并存储日志数据"""
    try:
        # 获取请求数据
        data = request.json
        
        # 验证必需字段
        required_fields = ['ukey', 'user_ip', 'time', 'type', 'content', 'status']
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
    app.run(host='0.0.0.0', port=5000, debug=True)

