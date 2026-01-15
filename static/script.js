const API = {
    user: null,
    data: {},

    async login(user, pass) {
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user, password: pass })
            });

            if (res.ok) {
                const json = await res.json();
                this.user = json;
                localStorage.setItem('user', JSON.stringify(json));
                return true;
            }
        } catch (e) {
            console.error("Login error:", e);
        }
        return false;
    },

    async loadData() {
        try {
            const res = await fetch('/api/data');
            if (res.ok) {
                this.data = await res.json();
                App.render();
            } else {
                console.error("Erro ao carregar dados:", res.status);
            }
        } catch (e) {
            console.error("Load data error:", e);
        }
    },

    async save(key, value) {
        try {
            const res = await fetch('/api/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [key]: value })
            });

            if (res.ok) {
                this.data[key] = value; // Atualiza só depois do sucesso
                App.render();
            } else {
                console.error("Erro ao salvar", key, ":", res.status);
            }
        } catch (e) {
            console.error("Save error:", e);
        }
    }
};

const Auth = {
    init() {
        const stored = localStorage.getItem('user');
        if (stored) {
            API.user = JSON.parse(stored);
            this.showApp();
        } else {
            document.getElementById('login-screen').classList.remove('hidden');
        }
    },

    async login() {
        const u = document.getElementById('login-user').value;
        const p = document.getElementById('login-pass').value;

        if (!u || !p) {
            alert("Preencha usuário e senha");
            return;
        }

        if (await API.login(u, p)) {
            this.showApp();
        } else {
            document.getElementById('login-error').classList.remove('hidden');
        }
    },

    logout() {
        localStorage.removeItem('user');
        location.reload();
    },

    showApp() {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        document.getElementById('user-name').innerText = API.user.name;

        if (API.user.role !== 'admin') {
            document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
        }

        API.loadData();
    }
};

const Nav = {
    go(viewId, event) {
        // Se for "all", ativa todas as views
        if (viewId === 'all') {
            document.querySelectorAll('.view').forEach(el => el.classList.add('active'));
        } else {
            // Remove active de todas as views
            document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
            // Ativa apenas a view clicada
            document.getElementById(`view-${viewId}`).classList.add('active');
        }

        // Remove active de todos os botões
        document.querySelectorAll('.sidebar nav button').forEach(el => el.classList.remove('active'));
        // Adiciona active ao botão clicado
        if (event) event.currentTarget.classList.add('active');

        // Atualiza título da página
        document.getElementById('page-title').innerText =
            viewId === 'all' ? "Tudo" : viewId.charAt(0).toUpperCase() + viewId.slice(1);

        // Renderiza views
        App.render(viewId);
    }
};

const App = {
    render(activeView) {
        if (activeView === 'dashboard' || activeView === 'all' || !activeView) {
            // Renderiza todas as views juntas
            Dashboard.render();
            Projects.render();
            Notes.render();
            Finance.render();
        } else {
            // Renderiza apenas a view selecionada
            switch(activeView) {
                case 'projects': Projects.render(); break;
                case 'notes': Notes.render(); break;
                case 'finance': Finance.render(); break;
            }
        }
    }
};


const Dashboard = {
    render() {
        const projects = API.data.projects || [];
        document.getElementById('dash-active-projects').innerText = projects.filter(p => p.status === 'andamento').length;
        document.getElementById('dash-notes-count').innerText = API.data.notes ? API.data.notes.length : 0;
        this.drawChart(projects);
    },

    drawChart(projects) {
        const ctx = document.getElementById('projectsChart').getContext('2d');
        ctx.clearRect(0, 0, 400, 200);

        const statuses = { 'ideia': 0, 'andamento': 0, 'concluido': 0 };
        projects.forEach(p => statuses[p.status] = (statuses[p.status] || 0) + 1);

        const total = projects.length || 1;
        let x = 0;
        const colors = { 'ideia': '#f59e0b', 'andamento': '#3b82f6', 'concluido': '#10b981' };

        for (let s in statuses) {
            const h = (statuses[s] / total) * 150;
            ctx.fillStyle = colors[s] || '#ccc';
            ctx.fillRect(x + 20, 180 - h, 50, h);
            ctx.fillStyle = '#666';
            ctx.fillText(s, x + 20, 195);
            x += 80;
        }
    }
};

const Projects = {
    render() {
        const list = document.getElementById('projects-list');
        list.innerHTML = '';

        (API.data.projects || []).forEach((p, index) => {
            if (API.user.role === 'freelancer' && p.freelancer !== API.user.name) return;

            const div = document.createElement('div');
            div.className = `card status-${p.status}`;
            div.innerHTML = `
                <h4>${p.name}</h4>
                <p class="text-muted">${p.client || 'Sem cliente'}</p>
                <small>${p.status.toUpperCase()} | R$ ${p.value || 0}</small>
                <div style="margin-top:10px">
                    <button class="btn-primary" style="font-size:0.8rem" onclick="Projects.edit(${index})">Editar</button>
                    ${API.user.role === 'admin' ? `<button style="color:red;border:none;background:none;cursor:pointer" onclick="Projects.del(${index})">Excluir</button>` : ''}
                </div>
            `;
            list.appendChild(div);
        });
    },

    edit(index) {
        const project = API.data.projects[index];
        if (!project) return;

        // Abre o modal
        Modal.open('project');

        // Preenche os inputs com os dados do projeto
        document.getElementById('m-p-name').value = project.name;
        document.getElementById('m-p-client').value = project.client || '';
        document.getElementById('m-p-status').value = project.status;
        document.getElementById('m-p-val').value = project.value || 0;

        // Define que estamos editando esse índice
        Modal.editIndex = index;
    },

    del(index) {
        if (!confirm('Apagar projeto?')) return;
        API.data.projects.splice(index, 1);
        API.save('projects', API.data.projects);
    }
};

const Notes = {
    render() {
        const filter = document.getElementById('note-search').value.toLowerCase();
        const list = document.getElementById('notes-list');
        list.innerHTML = '';

        (API.data.notes || []).forEach((n, index) => {
            const matchesText = n.text.toLowerCase().includes(filter);
            const matchesTags = n.tags.split(',').some(t => t.trim().toLowerCase().includes(filter));

            if (matchesText || matchesTags) {
                const div = document.createElement('div');
                div.className = 'note-card';
                div.innerHTML = `
                    <p>${n.text}</p>
                    <div style="margin-top:10px">
                        ${n.tags.split(',').map(t => `<span class="tag">#${t.trim()}</span>`).join('')}
                    </div>
                    <div style="margin-top:5px">
                        <button style="color:red;border:none;background:none;cursor:pointer;font-size:0.8rem" onclick="Notes.del(${index})">Excluir</button>
                    </div>
                `;
                list.appendChild(div);
            }
        });
    },

    add(text, tags) {
        if (!text.trim()) return alert("A anotação não pode estar vazia");

        const notes = API.data.notes || [];
        notes.unshift({ text, tags });
        API.save('notes', notes);
        Modal.close();
    },

    del(index) {
        if (!confirm("Deseja realmente excluir esta nota?")) return;

        API.data.notes.splice(index, 1);
        API.save('notes', API.data.notes);
    }
};

const Finance = {
    render() {
        const txs = API.data.transactions || [];
        let income = 0, expense = 0;
        const tbody = document.getElementById('finance-list');
        tbody.innerHTML = '';

        txs.forEach(t => {
            const val = parseFloat(t.value) || 0;
            if (t.type === 'in') income += val;
            else expense += val;

            tbody.innerHTML += `
                <tr>
                    <td>${t.desc}</td>
                    <td style="color:${t.type==='in'?'green':'red'}">${t.type==='in'?'Entrada':'Saída'}</td>
                    <td>R$ ${val.toFixed(2)}</td>
                    <td><i class="fas fa-trash" style="cursor:pointer" onclick="Finance.del('${t.id}')"></i></td>
                </tr>
            `;
        });

        document.getElementById('fin-in').innerText = `R$ ${income.toFixed(2)}`;
        document.getElementById('fin-out').innerText = `R$ ${expense.toFixed(2)}`;
        document.getElementById('fin-bal').innerText = `R$ ${(income - expense).toFixed(2)}`;
        document.getElementById('dash-income').innerText = `R$ ${income.toFixed(2)}`;
    },

    add(desc, type, value) {
        if (!desc.trim() || !type || !value) return alert("Preencha todos os campos");
        const txs = API.data.transactions || [];
        txs.push({ id: Date.now(), desc, type, value });
        API.save('transactions', txs);
        Modal.close();
    },

    del(id) {
        API.data.transactions = (API.data.transactions || []).filter(t => t.id != id);
        API.save('transactions', API.data.transactions);
    }
};

const Modal = {
    open(type) {
        const body = document.getElementById('modal-body');
        const title = document.getElementById('modal-title');
        document.getElementById('modal-overlay').classList.remove('hidden');

        if (type === 'project') {
            title.innerText = "Novo Projeto";
            body.innerHTML = `
                <input id="m-p-name" placeholder="Nome do Projeto">
                <input id="m-p-client" placeholder="Cliente">
                <select id="m-p-status">
                    <option value="ideia">Ideia</option>
                    <option value="andamento">Em Andamento</option>
                    <option value="concluido">Concluído</option>
                </select>
                <input id="m-p-val" type="number" placeholder="Valor">
                <button class="btn-primary" onclick="Modal.saveProject()">Salvar</button>
            `;
        } else if (type === 'note') {
            title.innerText = "Nova Anotação";
            body.innerHTML = `
                <textarea id="m-n-text" rows="5" placeholder="Sua anotação..."></textarea>
                <input id="m-n-tags" placeholder="Tags (sep. por vírgula)">
                <button class="btn-primary" onclick="Notes.add(document.getElementById('m-n-text').value, document.getElementById('m-n-tags').value)">Salvar</button>
            `;
        } else if (type === 'transaction') {
            title.innerText = "Nova Movimentação";
            body.innerHTML = `
                <input id="m-t-desc" placeholder="Descrição">
                <select id="m-t-type">
                    <option value="in">Entrada</option>
                    <option value="out">Saída</option>
                </select>
                <input id="m-t-val" type="number" placeholder="Valor">
                <button class="btn-primary" onclick="Finance.add(document.getElementById('m-t-desc').value, document.getElementById('m-t-type').value, document.getElementById('m-t-val').value)">Salvar</button>
            `;
        }
    },

    saveProject() {
    const p = {
        name: document.getElementById('m-p-name').value.trim(),
        client: document.getElementById('m-p-client').value.trim(),
        status: document.getElementById('m-p-status').value,
        value: parseFloat(document.getElementById('m-p-val').value) || 0,
        freelancer: API.user.role === 'freelancer' ? API.user.name : ''
    };

    if (!p.name) return alert("Nome do projeto é obrigatório");

    const projects = API.data.projects || [];

    if (Modal.editIndex != null) {
        // Editando projeto existente
        projects[Modal.editIndex] = p;
        Modal.editIndex = null; // limpa o índice após salvar
    } else {
        // Criando novo projeto
        projects.push(p);
    }

    API.save('projects', projects);
    Modal.close();
},

    close() {
        document.getElementById('modal-overlay').classList.add('hidden');
    }
};

const Theme = {
    toggle() {
        const body = document.body;
        const isDark = body.getAttribute('data-theme') === 'dark';
        body.setAttribute('data-theme', isDark ? 'light' : 'dark');
    }
};

window.onload = () => {
    Auth.init();
    // depois de inicializar o app, mostra a aba "Tudo"
    Nav.go('all');
};