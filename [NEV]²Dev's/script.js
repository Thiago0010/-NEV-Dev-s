const API = {
    user: null,
    data: {},
    
    async login(user, pass) {
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username: user, password: pass})
            });
            if(res.ok) {
                const json = await res.json();
                this.user = json;
                localStorage.setItem('user', JSON.stringify(json));
                return true;
            }
        } catch(e) { console.error(e); }
        return false;
    },

    async loadData() {
        const res = await fetch('/api/data');
        this.data = await res.json();
        App.render();
    },

    async save(key, value) {
        this.data[key] = value;
        await fetch('/api/update', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({[key]: value})
        });
        App.render();
    }
};

const Auth = {
    init() {
        const stored = localStorage.getItem('user');
        if(stored) {
            API.user = JSON.parse(stored);
            this.showApp();
        } else {
            document.getElementById('login-screen').classList.remove('hidden');
        }
    },
    async login() {
        const u = document.getElementById('login-user').value;
        const p = document.getElementById('login-pass').value;
        if(await API.login(u, p)) {
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
        if(API.user.role !== 'admin') {
            document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
        }
        API.loadData();
    }
};

const Nav = {
    go(viewId) {
        document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.sidebar nav button').forEach(el => el.classList.remove('active'));
        
        document.getElementById(`view-${viewId}`).classList.add('active');
        event.currentTarget.classList.add('active');
        document.getElementById('page-title').innerText = viewId.charAt(0).toUpperCase() + viewId.slice(1);
    }
};

const App = {
    render() {
        Dashboard.render();
        Projects.render();
        Notes.render();
        Finance.render();
    }
};

const Dashboard = {
    render() {
        const projects = API.data.projects || [];
        document.getElementById('dash-active-projects').innerText = projects.filter(p => p.status === 'andamento').length;
        document.getElementById('dash-notes-count').innerText = API.data.notes ? API.data.notes.length : 0;
        
        // Simples gráfico no Canvas
        this.drawChart(projects);
    },
    drawChart(projects) {
        const ctx = document.getElementById('projectsChart').getContext('2d');
        ctx.clearRect(0,0,400,200);
        
        const statuses = { 'ideia': 0, 'andamento': 0, 'concluido': 0 };
        projects.forEach(p => statuses[p.status] = (statuses[p.status] || 0) + 1);
        
        const total = projects.length || 1;
        let startAngle = 0;
        const colors = {'ideia': '#f59e0b', 'andamento': '#3b82f6', 'concluido': '#10b981'};
        
        // Desenha barras simples
        let x = 0;
        for(let s in statuses) {
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
            // Se for freelancer, só ver os dele
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
    edit(index) { /* Simplificação: Reusa modal de criar preenchendo dados - Fica como exercício */ },
    del(index) {
        if(!confirm('Apagar projeto?')) return;
        API.data.projects.splice(index, 1);
        API.save('projects', API.data.projects);
    }
};

const Notes = {
    render() {
        const filter = document.getElementById('note-search').value.toLowerCase();
        const list = document.getElementById('notes-list');
        list.innerHTML = '';
        (API.data.notes || []).forEach(n => {
            if(n.text.toLowerCase().includes(filter) || n.tags.includes(filter)) {
                const div = document.createElement('div');
                div.className = 'note-card';
                div.innerHTML = `
                    <p>${n.text}</p>
                    <div style="margin-top:10px">
                        ${n.tags.split(',').map(t => `<span class="tag">#${t.trim()}</span>`).join('')}
                    </div>
                `;
                list.appendChild(div);
            }
        });
    },
    add(text, tags) {
        const notes = API.data.notes || [];
        notes.unshift({text, tags});
        API.save('notes', notes);
        Modal.close();
    }
};

const Finance = {
    render() {
        const txs = API.data.transactions || [];
        let income = 0, expense = 0;
        const tbody = document.getElementById('finance-list');
        tbody.innerHTML = '';
        
        txs.forEach(t => {
            if(t.type === 'in') income += parseFloat(t.value);
            else expense += parseFloat(t.value);
            
            tbody.innerHTML += `
                <tr>
                    <td>${t.desc}</td>
                    <td style="color:${t.type==='in'?'green':'red'}">${t.type==='in'?'Entrada':'Saída'}</td>
                    <td>R$ ${t.value}</td>
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
        const txs = API.data.transactions || [];
        txs.push({id: Date.now(), desc, type, value});
        API.save('transactions', txs);
        Modal.close();
    },
    del(id) {
        const txs = API.data.transactions.filter(t => t.id != id);
        API.save('transactions', txs);
    }
};

const Modal = {
    open(type) {
        const body = document.getElementById('modal-body');
        const title = document.getElementById('modal-title');
        document.getElementById('modal-overlay').classList.remove('hidden');
        
        if(type === 'project') {
            title.innerText = "Novo Projeto";
            body.innerHTML = `
                <input id="m-p-name" placeholder="Nome do Projeto">
                <input id="m-p-client" placeholder="Cliente">
                <select id="m-p-status"><option value="ideia">Ideia</option><option value="andamento">Em Andamento</option><option value="concluido">Concluído</option></select>
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
                <select id="m-t-type"><option value="in">Entrada</option><option value="out">Saída</option></select>
                <input id="m-t-val" type="number" placeholder="Valor">
                <button class="btn-primary" onclick="Finance.add(document.getElementById('m-t-desc').value, document.getElementById('m-t-type').value, document.getElementById('m-t-val').value)">Salvar</button>
            `;
        }
    },
    saveProject() {
        const p = {
            name: document.getElementById('m-p-name').value,
            client: document.getElementById('m-p-client').value,
            status: document.getElementById('m-p-status').value,
            value: document.getElementById('m-p-val').value,
            freelancer: API.user.role === 'freelancer' ? API.user.name : '' 
        };
        const projects = API.data.projects || [];
        projects.push(p);
        API.save('projects', projects);
        Modal.close();
    },
    close() { document.getElementById('modal-overlay').classList.add('hidden'); }
};

const Theme = {
    toggle() {
        const body = document.body;
        const isDark = body.getAttribute('data-theme') === 'dark';
        body.setAttribute('data-theme', isDark ? 'light' : 'dark');
    }
};

window.onload = () => Auth.init();