from flask import Flask, request, jsonify
import random

app = Flask(__name__)

# 假设 token 校验逻辑（你可自行修改）
VALID_TOKEN = "123456"

def is_authorized(token):
    # 模拟鉴权逻辑
    return ("2" in token)

@app.route("/wx/sys/permit/verifyToken", methods=["POST"])
def handle_request():
    try:
        data = request.get_json()

        # 请求体必须包含 token
        if not data or "token" not in data:
            return jsonify({"code": 226, "msg": "token字段为空或空请求"}), 400

        token = data["token"]

        # 模拟服务器繁忙逻辑（可删除）
        if random.random() < 0.4:
            return jsonify({"code": 225, "msg": "服务器繁忙"}), 503

        # 模拟：token 不正确
        if VALID_TOKEN not in token:
            return jsonify({"code": 226, "msg": "token无效"}), 401

        # 鉴权
        if not is_authorized(token):
            return jsonify({"code": 227, "msg": "接口未授权"}), 403

        # 成功返回
        return jsonify({"code": 200, "msg": "token有效，请求成功"})

    except Exception as e:
        # 系统异常
        return e
        return jsonify({"code": 224, "msg": "系统异常", "error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002, debug=True)
