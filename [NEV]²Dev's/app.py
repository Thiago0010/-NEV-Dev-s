import json
import os
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_url_path='', static_folder='.')
DATA_FILE = 'data.json'

# --- Dados Iniciais (Se o JSON não existir) ---
DEFAULT_DATA = {
    "projects": [],
    "clients": [],
    "freelancers": [
        {"id": 1, "name": "Thiago", "email": "Caselasthiago@email.com", "role": "Fullstack"},
        {"id": 2, "name": "Henriyque", "email": "henriyque@email.com", "role": "Designer"}
    ],
    "notes": [],
    "transactions": []
}

def load_data():
    if not os.path.exists(DATA_FILE):
        save_data(DEFAULT_DATA)
        return DEFAULT_DATA
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

# --- Rotas Frontend ---
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)

# --- API ---
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    # Login Hardcoded Simples
    if data['username'] == 'admin' and data['password'] == '123':
        return jsonify({"status": "success", "role": "admin", "name": "Sócio Admin"})
    elif data['username'] == 'dev' and data['password'] == '123':
        return jsonify({"status": "success", "role": "freelancer", "name": "Dev Freelancer"})
    return jsonify({"status": "error", "message": "Credenciais inválidas"}), 401

@app.route('/api/data', methods=['GET'])
def get_data():
    return jsonify(load_data())

@app.route('/api/update', methods=['POST'])
def update_data():
    # Endpoint genérico para atualizar qualquer chave (projetos, notas, etc)
    # Em produção real, separaríamos em rotas específicas.
    new_data = request.json
    current_data = load_data()
    
    # Atualiza apenas as chaves enviadas
    for key in new_data:
        if key in current_data:
            current_data[key] = new_data[key]
            
    save_data(current_data)
    return jsonify({"status": "success", "data": current_data})

if __name__ == '__main__':
    app.run(debug=True, port=5000)