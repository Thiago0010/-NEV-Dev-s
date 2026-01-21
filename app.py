# import json
# import os
# from flask import Flask, request, jsonify, send_from_directory

# app = Flask(__name__, static_url_path='', static_folder='.')
# DATA_FILE = 'data.json'

# # --- Dados Iniciais (Se o JSON não existir) ---
# DEFAULT_DATA = {
#     "projects": [],
#     "clients": [],
#     "freelancers": [
#         {"id": 1, "name": "Thiago", "email": "Caselasthiago@email.com", "role": "Fullstack"},
#         {"id": 2, "name": "Henriyque", "email": "henriyque@email.com", "role": "Designer"}
#     ],
#     "notes": [],
#     "transactions": []
# }

# def load_data():
#     if not os.path.exists(DATA_FILE):
#         save_data(DEFAULT_DATA)
#         return DEFAULT_DATA
#     with open(DATA_FILE, 'r', encoding='utf-8') as f:
#         return json.load(f)

# def save_data(data):
#     with open(DATA_FILE, 'w', encoding='utf-8') as f:
#         json.dump(data, f, indent=4, ensure_ascii=False)

# # --- Rotas Frontend ---
# @app.route('/')
# def index():
#     return send_from_directory('.', 'index.html')

# @app.route('/<path:path>')
# def static_files(path):
#     return send_from_directory('.', path)

# # --- API ---
# @app.route('/api/login', methods=['POST'])
# def login():
#     data = request.json
#     # Login Hardcoded Simples
#     if data['username'] == 'admin' and data['password'] == '123':
#         return jsonify({"status": "success", "role": "admin", "name": "Sócio Admin"})
#     elif data['username'] == 'dev' and data['password'] == '123':
#         return jsonify({"status": "success", "role": "freelancer", "name": "Dev Freelancer"})
#     return jsonify({"status": "error", "message": "Credenciais inválidas"}), 401


# @app.route('/api/data', methods=['GET'])
# def get_data():
#     return jsonify(load_data())



# @app.route('/api/update', methods=['POST'])
# def update_data():
#     # Endpoint genérico para atualizar qualquer chave (projetos, notas, etc)
#     # Em produção real, separaríamos em rotas específicas.
#     new_data = request.json
#     current_data = load_data()
    
#     # Atualiza apenas as chaves enviadas
#     for key in new_data:
#         if key in current_data:
#             current_data[key] = new_data[key]
            
#     save_data(current_data)
#     return jsonify({"status": "success", "data": current_data})

# if __name__ == '__main__':
#     app.run(debug=True, port=5000)

import json
import os
import secrets
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_url_path='', static_folder='.')
DATA_FILE = 'database.json'

# --- Estrutura Inicial do Banco ---
DEFAULT_DATA = {
    "users": [],        # Armazena {username, password, name, role}
    "projects": [],     # Cada item terá "owner"
    "notes": [],        # Cada item terá "owner"
    "transactions": []  # Cada item terá "owner"
}

def load_db():
    if not os.path.exists(DATA_FILE):
        save_db(DEFAULT_DATA)
        return DEFAULT_DATA
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_db(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

# --- Rotas Frontend ---
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)

# --- API Autenticação ---
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    db = load_db()
    
    # Verifica se usuário já existe
    if any(u['username'] == data['username'] for u in db['users']):
        return jsonify({"status": "error", "message": "Usuário já existe"}), 400
    
    new_user = {
        "username": data['username'],
        "password": data['password'], # Em prod, use hash (ex: bcrypt)
        "name": data.get('name', 'Usuário'),
        "role": "user"
    }
    
    db['users'].append(new_user)
    save_db(db)
    return jsonify({"status": "success", "user": new_user})

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    db = load_db()
    
    user = next((u for u in db['users'] if u['username'] == data['username'] and u['password'] == data['password']), None)
    
    if user:
        # Retorna o usuário sem a senha
        user_response = {k:v for k,v in user.items() if k != 'password'}
        return jsonify({"status": "success", "user": user_response})
    
    return jsonify({"status": "error", "message": "Credenciais inválidas"}), 401

# --- API de Dados (Escopada por Usuário) ---
@app.route('/api/data', methods=['GET'])
def get_user_data():
    username = request.args.get('user')
    if not username:
        return jsonify({"error": "Unauthorized"}), 401
        
    db = load_db()
    
    # FILTRAGEM: Retorna apenas dados que pertencem a este usuário
    user_data = {
        "projects": [p for p in db['projects'] if p.get('owner') == username],
        "notes": [n for n in db['notes'] if n.get('owner') == username],
        "transactions": [t for t in db['transactions'] if t.get('owner') == username]
    }
    
    return jsonify(user_data)

@app.route('/api/sync', methods=['POST'])
def sync_data():
    # Recebe o estado atual do frontend e atualiza o banco JSON
    req = request.json
    username = req.get('user')
    new_data = req.get('data')
    
    if not username or not new_data:
        return jsonify({"error": "Bad Request"}), 400

    db = load_db()
    
    # Lógica de "Limpar e Substituir" apenas para este usuário
    # (Removemos os antigos deste usuário e adicionamos os novos vindos do front)
    
    # 1. Limpar dados antigos deste usuário
    db['projects'] = [p for p in db['projects'] if p.get('owner') != username]
    db['notes'] = [n for n in db['notes'] if n.get('owner') != username]
    db['transactions'] = [t for t in db['transactions'] if t.get('owner') != username]
    
    # 2. Inserir novos dados com a tag de propriedade
    for p in new_data.get('projects', []):
        p['owner'] = username
        db['projects'].append(p)
        
    for n in new_data.get('notes', []):
        n['owner'] = username
        db['notes'].append(n)
        
    for t in new_data.get('transactions', []):
        t['owner'] = username
        db['transactions'].append(t)

    save_db(db)
    return jsonify({"status": "success"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)