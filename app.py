from flask import Flask, request, jsonify, send_from_directory
import sqlite3
import os
from datetime import datetime
from flask_cors import CORS

# Configure Flask to serve the "frontend" directory correctly
app = Flask(__name__, static_folder='frontend', static_url_path='')
CORS(app) # 允许跨域 in front-end
DATABASE = "dapp.db"

# 初始化数据库
def init_db():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    # 商家表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS merchant (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            wallet_address TEXT UNIQUE NOT NULL,
            store_name TEXT NOT NULL,
            store_address TEXT NOT NULL,
            license_no TEXT NOT NULL,
            contract_address TEXT,
            status INTEGER DEFAULT 0,
            create_time DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    # 核销记录表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS consume_code (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_wallet TEXT NOT NULL,
            merchant_wallet TEXT NOT NULL,
            consume_amount INTEGER NOT NULL,
            verify_code TEXT UNIQUE NOT NULL,
            status INTEGER DEFAULT 0,
            create_time DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

# 全局初始化，确保生产环境 WSGI 启动时执行
init_db()

# 0. 返回静态首页展示层
@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

# 1. 商家注册
@app.route('/api/merchant/register', methods=['POST'])
def merchant_register():
    data = request.json
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO merchant (wallet_address, store_name, store_address, license_no)
            VALUES (?, ?, ?, ?)
        ''', (data['wallet_address'], data['store_name'], data['store_address'], data['license_no']))
        conn.commit()
        return jsonify({"code": 0, "msg": "注册成功，等待审核"})
    except Exception as e:
        return jsonify({"code": -1, "msg": f"注册失败：{str(e)}"})
    finally:
        conn.close()

# 2. 商家绑定合约地址
@app.route('/api/merchant/bind-contract', methods=['POST'])
def bind_contract():
    data = request.json
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE merchant SET contract_address = ?, status = 1
        WHERE wallet_address = ?
    ''', (data['contract_address'], data['wallet_address']))
    conn.commit()
    conn.close()
    return jsonify({"code": 0, "msg": "合约绑定成功"})

# 3. 获取所有已上线门店列表
@app.route('/api/merchant/list', methods=['GET'])
def merchant_list():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM merchant WHERE status = 1')
    merchants = cursor.fetchall()
    conn.close()
    return jsonify({"code": 0, "data": [dict(m) for m in merchants]})

# 4. 生成核销码
@app.route('/api/consume/generate', methods=['POST'])
def generate_code():
    import random, string
    data = request.json
    verify_code = ''.join(random.choices(string.digits, k=6))
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO consume_code (user_wallet, merchant_wallet, consume_amount, verify_code)
        VALUES (?, ?, ?, ?)
    ''', (data['user_wallet'], data['merchant_wallet'], data['consume_amount'], verify_code))
    conn.commit()
    conn.close()
    return jsonify({"code": 0, "verify_code": verify_code})

# 5. 验证核销码
@app.route('/api/consume/verify', methods=['POST'])
def verify_code():
    data = request.json
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('''
        SELECT * FROM consume_code WHERE verify_code = ? AND merchant_wallet = ? AND status = 0
    ''', (data['verify_code'], data['merchant_wallet']))
    record = cursor.fetchone()
    if not record:
        return jsonify({"code": -1, "msg": "核销码无效"})
    cursor.execute('UPDATE consume_code SET status = 1 WHERE id = ?', (record['id'],))
    conn.commit()
    conn.close()
    return jsonify({"code": 0, "data": dict(record)})

if __name__ == '__main__':
    app.run(debug=True)