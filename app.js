// Estado da Aplicação
let currentUser = null;
let currentUserProfile = null;
let clientes = [];
let produtos = [];
let ordensServico = [];
let tecnicos = [];
let motivos = [];
let ultimoNumeroOS = 0;
let editingOsId = null;
let quickClienteCallback = null;
let currentOsConclusaoId = null;
let produtoItemCounter = 0;
let selectedOsIds = new Set();
let currentViewMode = localStorage.getItem('viewMode') || 'grid';
let currentSort = { field: 'numero', direction: 'desc' };
let currentPage = 1;
const itemsPerPage = 10;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    updateViewButtons();
    initializeAuth();
    initializeEventListeners();
});

// ==================== AUTENTICAÇÃO ====================

function initializeAuth() {
    auth.onAuthStateChanged(async user => {
        if (user) {
            // Configura a empresa do usuário (Multi-tenancy)
            await setupCompany(user);
            currentUser = user; // Garante que currentUser está setado após o setup
            
            const userDisplay = document.getElementById('currentUserDisplay');
            if (userDisplay && currentUserProfile) {
                userDisplay.innerHTML = `${user.email}<br><small style="opacity:0.5; font-size:0.7em">${currentUserProfile.role === 'admin' ? 'Admin' : 'Membro'}</small>`;
            }

            showMainSystem();
            loadAllData();
        } else {
            showLoginScreen();
        }
    });
}

async function setupCompany(user) {
    // Referência ao documento do usuário na coleção global 'users'
    const userRef = db.collection('users').doc(user.uid);
    const doc = await userRef.get();

    if (doc.exists && doc.data().companyId) {
        // Usuário já tem empresa vinculada
        currentUserProfile = { uid: user.uid, ...doc.data() };
    } else {
        // Primeiro acesso: cria uma nova empresa (usando o ID do usuário como ID da empresa)
        const profile = {
            email: user.email,
            companyId: user.uid, // A própria empresa do usuário
            role: 'admin', // O criador é o admin
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        };
        await userRef.set(profile, { merge: true });
        currentUserProfile = { uid: user.uid, ...profile };
    }

    const companyId = currentUserProfile.companyId;

    // Aponta as coleções para dentro da empresa específica
    const companyRef = db.collection('companies').doc(companyId);
    
    clientesCollection = companyRef.collection('clientes');
    produtosCollection = companyRef.collection('produtos');
    osCollection = companyRef.collection('ordens_servico');
    motivosCollection = companyRef.collection('motivos');
    configCollection = companyRef.collection('config');
    tecnicosCollection = companyRef.collection('tecnicos');
    logsCollection = companyRef.collection('logs');

    return companyId;
}

function showLoginScreen() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('mainSystem').classList.add('hidden');
}

function showMainSystem() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('mainSystem').classList.remove('hidden');
}

// ==================== EVENT LISTENERS ====================

function initializeEventListeners() {
    // Login
    document.getElementById('loginBtn').addEventListener('click', handleLogin);
    document.getElementById('loginPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    document.getElementById('showRegisterLink').addEventListener('click', (e) => {
        e.preventDefault();
        openModal('registerModal');
    });
    document.getElementById('forgotPasswordLink').addEventListener('click', handlePasswordResetRequest);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Theme Toggle
    document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);

    // Navegação
    document.querySelectorAll('.sidebar-menu li').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            navigateToPage(page);
        });
    });

    // Botões de Nova Entidade
    document.getElementById('newOsBtn').addEventListener('click', () => openOsModal());
    document.getElementById('newClienteBtn').addEventListener('click', () => openClienteModal());
    document.getElementById('newProdutoBtn').addEventListener('click', () => openProdutoModal());
    document.getElementById('newTecnicoBtn').addEventListener('click', () => openTecnicoModal());

    // Botão de Impressão em Lote
    document.getElementById('printSelectedBtn').addEventListener('click', printBatchOS);

    // Botão de Exportar
    document.getElementById('exportBtn').addEventListener('click', exportOS);

    // Forms
    document.getElementById('osForm').addEventListener('submit', handleOsSubmit);
    document.getElementById('clienteForm').addEventListener('submit', handleClienteSubmit);
    document.getElementById('produtoForm').addEventListener('submit', handleProdutoSubmit);
    document.getElementById('tecnicoForm').addEventListener('submit', handleTecnicoSubmit);
    document.getElementById('motivoForm').addEventListener('submit', handleMotivoSubmit);

    // Cliente Selection
    document.getElementById('osCliente').addEventListener('change', handleClienteChange);

    // Máscaras e Inputs
    document.getElementById('clienteTelefone').addEventListener('input', (e) => maskTelefoneInput(e.target));
    document.getElementById('produtoValor').addEventListener('input', (e) => maskMoedaInput(e.target));
    document.getElementById('osDesconto').addEventListener('input', (e) => { maskMoedaInput(e.target); calcularTotais(); });

    // Filtros
    document.getElementById('filterStatus').addEventListener('change', filterOS);
    document.getElementById('searchOs').addEventListener('input', filterOS);
    document.getElementById('searchCliente').addEventListener('input', filterClientes);
    document.getElementById('searchProduto').addEventListener('input', filterProdutos);
    document.getElementById('searchTecnico').addEventListener('input', filterTecnicos);
    document.getElementById('filterDataInicio').addEventListener('change', filterOS);
    document.getElementById('filterDataFim').addEventListener('change', filterOS);

    // Select All
    document.getElementById('selectAllHeader').addEventListener('change', toggleSelectAll);

    // Clear Selection
    document.getElementById('clearSelectionBtn').addEventListener('click', clearAllSelections);

    // View Toggle
    document.getElementById('viewGridBtn').addEventListener('click', () => setViewMode('grid'));
    document.getElementById('viewListBtn').addEventListener('click', () => setViewMode('list'));

    // Profile Page
    document.getElementById('copyCompanyIdBtn').addEventListener('click', copyCompanyId);
    document.getElementById('joinCompanyBtn').addEventListener('click', handleJoinCompany);
    document.getElementById('changePasswordBtn').addEventListener('click', handlePasswordResetRequest);
}

// ==================== THEME ====================

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const btn = document.getElementById('themeToggleBtn');
    if (theme === 'light') {
        btn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
            Modo Escuro
        `;
    } else {
        btn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
            Modo Claro
        `;
    }
}

// ==================== VIEW MODE ====================

function setViewMode(mode) {
    currentViewMode = mode;
    localStorage.setItem('viewMode', mode);
    updateViewButtons();
    renderOS();
}

function updateViewButtons() {
    const gridBtn = document.getElementById('viewGridBtn');
    const listBtn = document.getElementById('viewListBtn');
    
    if (currentViewMode === 'grid') {
        gridBtn.classList.add('active');
        listBtn.classList.remove('active');
    } else {
        gridBtn.classList.remove('active');
        listBtn.classList.add('active');
    }
}

// ==================== AUTENTICAÇÃO HANDLERS ====================

async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');

    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        errorEl.textContent = 'E-mail ou senha incorretos';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const errorEl = document.getElementById('registerError');
    errorEl.textContent = '';

    try {
        await auth.createUserWithEmailAndPassword(email, password);
        closeModal('registerModal');
        // onAuthStateChanged irá lidar com o resto
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            errorEl.textContent = 'Este e-mail já está em uso.';
        } else if (error.code === 'auth/weak-password') {
            errorEl.textContent = 'A senha deve ter pelo menos 6 caracteres.';
        } else {
            errorEl.textContent = 'Ocorreu um erro ao criar a conta.';
        }
        console.error("Erro no registro:", error);
    }
}

async function handleLogout() {
    try {
        await auth.signOut();
    } catch (error) {
        console.error('Erro ao sair:', error);
    }
}

// ==================== NAVEGAÇÃO ====================

function navigateToPage(page) {
    // Atualizar menu
    document.querySelectorAll('.sidebar-menu li').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-page="${page}"]`).classList.add('active');

    // Mostrar página
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`${page}Page`).classList.add('active');

    if (page !== 'dashboard') {
        selectedOsIds.clear();
        updateSelectionUI();
    }

    // Recarregar dados se necessário
    if (page === 'dashboard') renderOS();
    if (page === 'clientes') renderClientes();
    if (page === 'produtos') renderProdutos();
    if (page === 'tecnicos') renderTecnicos();
    if (page === 'trash') renderTrash();
    if (page === 'profile') renderProfilePage();
}

// ==================== CARREGAR DADOS ====================

async function loadAllData() {
    try {
        await Promise.all([
            loadClientes(),
            loadProdutos(),
            loadTecnicos(),
            loadOS(),
            loadMotivos(),
            loadUltimoNumeroOS()
        ]);
        renderOS();
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
    }
}

async function loadClientes() {
    const snapshot = await clientesCollection.orderBy('nome').get();
    clientes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    populateClienteSelect();
}

async function loadProdutos() {
    const snapshot = await produtosCollection.orderBy('descricao').get();
    produtos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function loadTecnicos() {
    const snapshot = await tecnicosCollection.orderBy('nome').get();
    tecnicos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function loadOS() {
    const snapshot = await osCollection.orderBy('numero', 'desc').get();
    ordensServico = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function loadMotivos() {
    const snapshot = await motivosCollection.orderBy('descricao').get();
    motivos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    populateMotivoSelect();
}

async function loadUltimoNumeroOS() {
    try {
        const doc = await configCollection.doc('ultimo_numero_os').get();
        if (doc.exists) {
            ultimoNumeroOS = doc.data().numero;
        } else {
            ultimoNumeroOS = 0;
            await configCollection.doc('ultimo_numero_os').set({ numero: 0 });
        }
    } catch (error) {
        console.error('Erro ao carregar último número:', error);
        ultimoNumeroOS = 0;
    }
}

async function getProximoNumeroOS() {
    ultimoNumeroOS++;
    await configCollection.doc('ultimo_numero_os').set({ numero: ultimoNumeroOS });
    return ultimoNumeroOS;
}

// ==================== RENDER ====================

function renderOS() {
    const grid = document.getElementById('osGrid');
    const listHeader = document.getElementById('osListHeader');
    const paginationContainer = document.getElementById('pagination');
    const filteredOS = getFilteredOS();
    
    // Configuração de visualização
    grid.className = currentViewMode === 'list' ? 'os-list' : 'os-grid';
    if (currentViewMode === 'list') {
        listHeader.classList.remove('hidden');
        updateSortIcons();
    } else {
        listHeader.classList.add('hidden');
    }

    if (filteredOS.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                </svg>
                <h3>Nenhuma ordem de serviço encontrada</h3>
                <p>Clique em "Nova OS" para criar sua primeira ordem</p>
            </div>
        `;
        paginationContainer.innerHTML = '';
        return;
    }

    // Lógica de Paginação
    const totalPages = Math.ceil(filteredOS.length / itemsPerPage);
    
    // Ajusta página atual se necessário (ex: se filtrou e reduziu páginas)
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedItems = filteredOS.slice(start, end);

    grid.innerHTML = paginatedItems.map(os => {
        const cliente = clientes.find(c => c.id === os.clienteId);
        const isSelected = selectedOsIds.has(os.id);
        return `
            <div class="os-card ${isSelected ? 'selected' : ''}" data-os-id="${os.id}" onclick="viewOS('${os.id}')">
                <input type="checkbox" class="os-select-checkbox" 
                       onclick="toggleOsSelection(event, '${os.id}')" 
                       ${isSelected ? 'checked' : ''}>

                <div class="os-card-header">
                    <div class="os-number">#${String(os.numero).padStart(4, '0')}</div>
                    <select class="os-status ${os.status}" onclick="event.stopPropagation()" 
                            onchange="updateStatus('${os.id}', this.value)">
                        <option value="lancada" ${os.status === 'lancada' ? 'selected' : ''}>Lançada</option>
                        <option value="andamento" ${os.status === 'andamento' ? 'selected' : ''}>Em Andamento</option>
                        <option value="concluida" ${os.status === 'concluida' ? 'selected' : ''}>Concluída</option>
                    </select>
                </div>
                <div class="os-card-body">
                    <div class="os-info">
                        <div><strong>Cliente:</strong> ${cliente?.nome || 'N/A'}</div>
                        <div><strong>Data:</strong> ${formatDate(os.data)}</div>
                        <div><strong>Motivo:</strong> ${os.motivo}</div>
                        ${os.usuarioCriador ? `<div><small style="opacity:0.7">Por: ${os.usuarioCriador.split('@')[0]}</small></div>` : ''}
                        ${os.tecnicoNome ? `<div class="os-tecnico"><strong>Técnico:</strong> ${os.tecnicoNome}</div>` : '<div></div>'}
                    </div>
                    <div class="os-total">R$ ${formatMoney(os.total)}</div>
                </div>
                <div class="os-card-actions" onclick="event.stopPropagation()">
                    <button class="btn-icon" onclick="viewOsHistory('${os.id}')" title="Histórico de Atividades">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                        </svg>
                    </button>
                    <button class="btn-icon" onclick="editOS('${os.id}')" title="Editar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                        </svg>
                    </button>
                    <button class="btn-icon" onclick="printOS('${os.id}')" title="Imprimir">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 6 2 18 2 18 9"/>
                            <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
                            <rect x="6" y="14" width="12" height="8"/>
                        </svg>
                    </button>
                    <button class="btn-icon danger" onclick="deleteOS('${os.id}')" title="Excluir">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    renderPagination(totalPages);
}

function toggleSelectAll() {
    const checkbox = document.getElementById('selectAllHeader');
    const isChecked = checkbox.checked;
    const filteredOS = getFilteredOS();
    
    filteredOS.forEach(os => {
        if (isChecked) {
            selectedOsIds.add(os.id);
        } else {
            selectedOsIds.delete(os.id);
        }
    });
    
    renderOS();
    updateSelectionUI();
}

function toggleOsSelection(event, osId) {
    event.stopPropagation();
    const card = document.querySelector(`.os-card[data-os-id="${osId}"]`);
    const checkbox = event.target;

    if (checkbox.checked) {
        selectedOsIds.add(osId);
        card.classList.add('selected');
    } else {
        selectedOsIds.delete(osId);
        card.classList.remove('selected');
    }
    updateSelectionUI();
}

function clearAllSelections() {
    selectedOsIds.clear();
    renderOS();
    updateSelectionUI();
}

function updateSelectionUI() {
    const printBtn = document.getElementById('printSelectedBtn');
    const selectionBar = document.getElementById('selectionBar');
    const selectionCountText = document.getElementById('selectionCountText');
    const selectionCount = selectedOsIds.size;
    const hasSelection = selectionCount > 0;

    // Toggle top print button
    printBtn.classList.toggle('hidden', !hasSelection);
    
    // Toggle bottom selection bar
    selectionBar.classList.toggle('visible', hasSelection);

    if (hasSelection) {
        const itemText = `item${selectionCount > 1 ? 's' : ''}`;
        const selectedText = `selecionado${selectionCount > 1 ? 's' : ''}`;
        printBtn.querySelector('svg').nextSibling.textContent = ` Imprimir Selecionadas (${selectionCount})`;
        selectionCountText.textContent = `${selectionCount} ${itemText} ${selectedText}`;
    }

    // Update header checkbox
    const selectAllCheckbox = document.getElementById('selectAllHeader');
    if (selectAllCheckbox) {
        const filteredOS = getFilteredOS();
        if (filteredOS.length > 0) {
            const allSelected = filteredOS.every(os => selectedOsIds.has(os.id));
            const someSelected = filteredOS.some(os => selectedOsIds.has(os.id));
            selectAllCheckbox.checked = allSelected;
            selectAllCheckbox.indeterminate = someSelected && !allSelected;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        }
    }
}

function renderPagination(totalPages) {
    const container = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <button class="btn-secondary" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
            Anterior
        </button>
        <span class="page-info">Página ${currentPage} de ${totalPages}</span>
        <button class="btn-secondary" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
            Próxima
        </button>
    `;
}

function changePage(newPage) {
    currentPage = newPage;
    renderOS();
    document.querySelector('.content').scrollTo({ top: 0, behavior: 'smooth' });
}

function renderClientes() {
    const tbody = document.getElementById('clientesTable');
    const filtered = getFilteredClientes();

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    Nenhum cliente encontrado
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filtered.map(cliente => `
        <tr>
            <td>${cliente.nome}</td>
            <td>${cliente.telefone}</td>
            <td>${cliente.endereco}</td>
            <td>${cliente.bairro}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-icon" onclick="viewClienteHistory('${cliente.id}')" title="Histórico de OS">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </button>
                    <button class="btn-icon" onclick="editCliente('${cliente.id}')" title="Editar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                        </svg>
                    </button>
                    <button class="btn-icon danger" onclick="deleteCliente('${cliente.id}')" title="Excluir">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function viewClienteHistory(clienteId) {
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente) return;

    const title = document.getElementById('clienteHistoryTitle');
    title.textContent = `Histórico - ${cliente.nome}`;

    const tbody = document.getElementById('clienteHistoryTable');
    
    // Filtrar OS do cliente e ordenar por número decrescente (mais recente primeiro)
    const historicoOS = ordensServico
        .filter(os => os.clienteId === clienteId && !os.deleted)
        .sort((a, b) => b.numero - a.numero);

    if (historicoOS.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    Nenhuma Ordem de Serviço encontrada para este cliente.
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = historicoOS.map(os => `
            <tr>
                <td>#${String(os.numero).padStart(4, '0')}</td>
                <td>${formatDate(os.data)}</td>
                <td><span class="os-status ${os.status}">${os.status === 'lancada' ? 'Lançada' : (os.status === 'andamento' ? 'Em Andamento' : 'Concluída')}</span></td>
                <td>R$ ${formatMoney(os.total)}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn-icon" onclick="editOS('${os.id}')" title="Editar">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                            </svg>
                        </button>
                        <button class="btn-icon" onclick="printOS('${os.id}')" title="Imprimir">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6 9 6 2 18 2 18 9"/>
                                <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
                                <rect x="6" y="14" width="12" height="8"/>
                            </svg>
                        </button>
                        <button class="btn-icon danger" onclick="deleteOS('${os.id}')" title="Excluir">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    openModal('clienteHistoryModal');
}

function renderProdutos() {
    const tbody = document.getElementById('produtosTable');
    const filtered = getFilteredProdutos();

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    Nenhum produto encontrado
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filtered.map(produto => `
        <tr>
            <td>${produto.descricao}</td>
            <td>R$ ${formatMoney(produto.valor)}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-icon" onclick="editProduto('${produto.id}')" title="Editar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                        </svg>
                    </button>
                    <button class="btn-icon danger" onclick="deleteProduto('${produto.id}')" title="Excluir">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderTecnicos() {
    const tbody = document.getElementById('tecnicosTable');
    const filtered = getFilteredTecnicos();

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    Nenhum técnico encontrado
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filtered.map(tecnico => `
        <tr>
            <td>${tecnico.nome}</td>
            <td>${tecnico.cargo || '-'}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-icon" onclick="editTecnico('${tecnico.id}')" title="Editar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                        </svg>
                    </button>
                    <button class="btn-icon danger" onclick="deleteTecnico('${tecnico.id}')" title="Excluir">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ==================== FILTROS ====================

function getFilteredOS() {
    const status = document.getElementById('filterStatus').value;
    const search = document.getElementById('searchOs').value.toLowerCase();
    const dataInicio = document.getElementById('filterDataInicio').value;
    const dataFim = document.getElementById('filterDataFim').value;

    const filtered = ordensServico.filter(os => {
        if (os.deleted) return false; // Não mostrar excluídos na lista principal
        const matchStatus = !status || os.status === status;
        const cliente = clientes.find(c => c.id === os.clienteId);
        const matchSearch = !search || 
            String(os.numero).includes(search) ||
            cliente?.nome.toLowerCase().includes(search) ||
            os.motivo.toLowerCase().includes(search);
        
        let matchDate = true;
        if (dataInicio) {
            matchDate = matchDate && os.data >= dataInicio;
        }
        if (dataFim) {
            matchDate = matchDate && os.data <= dataFim;
        }

        return matchStatus && matchSearch && matchDate;
    });

    // Aplicar Ordenação
    return filtered.sort((a, b) => {
        let valA, valB;
        
        switch(currentSort.field) {
            case 'cliente':
                valA = (clientes.find(c => c.id === a.clienteId)?.nome || '').toLowerCase();
                valB = (clientes.find(c => c.id === b.clienteId)?.nome || '').toLowerCase();
                break;
            case 'data':
                valA = a.data;
                valB = b.data;
                break;
            case 'total':
                valA = a.total;
                valB = b.total;
                break;
            case 'numero':
            default:
                valA = a.numero;
                valB = b.numero;
        }
        
        if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });
}

function getFilteredClientes() {
    const search = document.getElementById('searchCliente').value.toLowerCase();
    return clientes.filter(c => 
        c.nome.toLowerCase().includes(search) ||
        c.telefone.includes(search) ||
        c.endereco.toLowerCase().includes(search) ||
        c.bairro.toLowerCase().includes(search)
    );
}

function getFilteredProdutos() {
    const search = document.getElementById('searchProduto').value.toLowerCase();
    return produtos.filter(p => p.descricao.toLowerCase().includes(search));
}

function getFilteredTecnicos() {
    const search = document.getElementById('searchTecnico').value.toLowerCase();
    return tecnicos.filter(t => t.nome.toLowerCase().includes(search) || 
                               (t.cargo && t.cargo.toLowerCase().includes(search)));
}

function filterOS() {
    currentPage = 1; // Reseta para primeira página ao filtrar
    renderOS();
}

function filterClientes() {
    renderClientes();
}

function filterProdutos() {
    renderProdutos();
}

function filterTecnicos() {
    renderTecnicos();
}

// ==================== SORTING ====================

function handleSort(field) {
    if (currentSort.field === field) {
        // Inverter direção
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        // Novo campo
        currentSort.field = field;
        // Padrão: desc para números/datas, asc para texto
        if (field === 'data' || field === 'numero' || field === 'total') {
            currentSort.direction = 'desc';
        } else {
            currentSort.direction = 'asc';
        }
    }
    currentPage = 1; // Reseta para primeira página ao ordenar
    renderOS();
}

function updateSortIcons() {
    document.querySelectorAll('.sortable').forEach(el => {
        // Remove ícones existentes
        const text = el.textContent.replace(' ↑', '').replace(' ↓', '');
        el.textContent = text;
        
        if (el.dataset.sort === currentSort.field) {
            el.textContent += currentSort.direction === 'asc' ? ' ↑' : ' ↓';
            el.style.color = 'var(--accent)';
        } else {
            el.style.color = '';
        }
    });
}

// ==================== MODAL HANDLERS ====================

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    if (modalId === 'osModal') {
        document.getElementById('osForm').reset();
        document.getElementById('produtosContainer').innerHTML = '';
        editingOsId = null;
        produtoItemCounter = 0;
    }
    if (modalId === 'clienteModal') {
        document.getElementById('clienteForm').reset();
    }
    if (modalId === 'produtoModal') {
        document.getElementById('produtoForm').reset();
    }
    if (modalId === 'tecnicoModal') {
        document.getElementById('tecnicoForm').reset();
    }
    if (modalId === 'selectTecnicoModal') {
        // Se cancelou a seleção do técnico, recarrega para voltar o select do status ao anterior
        renderOS();
    }
    if (modalId === 'clienteHistoryModal') {
        document.getElementById('clienteHistoryTable').innerHTML = '';
    }
    if (modalId === 'registerModal') {
        document.getElementById('registerForm').reset();
        document.getElementById('registerError').textContent = '';
    }
    if (modalId === 'osHistoryModal') {
        document.getElementById('osHistoryTable').innerHTML = '';
    }
}

// ==================== ORDEM DE SERVIÇO ====================

async function openOsModal(osId = null) {
    editingOsId = osId;
    const modal = document.getElementById('osModal');
    const title = document.getElementById('osModalTitle');
    const osNumeroInput = document.getElementById('osNumero');
    
    if (osId) {
        title.textContent = 'Editar Ordem de Serviço';
        osNumeroInput.readOnly = true;
        const os = ordensServico.find(o => o.id === osId);
        if (os) {
            document.getElementById('osId').value = os.id;
            osNumeroInput.value = String(os.numero).padStart(4, '0');
            document.getElementById('osData').value = os.data;
            document.getElementById('osCliente').value = os.clienteId;
            handleClienteChange();
            document.getElementById('osMotivo').value = os.motivo;
            document.getElementById('osDesconto').value = formatCurrency(os.desconto || 0);
            document.getElementById('osObservacoes').value = os.observacoes || '';
            
            // Adicionar produtos
            document.getElementById('produtosContainer').innerHTML = '';
            os.produtos.forEach(p => {
                addProdutoItem(p);
            });
            calcularTotais();
        }
    } else {
        title.textContent = 'Nova Ordem de Serviço';
        osNumeroInput.readOnly = false;
        
        let proximoNumero = 1;
        if (ordensServico.length > 0) {
            const maxNumero = ordensServico.reduce((max, os) => Math.max(max, os.numero || 0), 0);
            proximoNumero = maxNumero + 1;
        }
        
        osNumeroInput.value = String(proximoNumero).padStart(4, '0');
        document.getElementById('osData').value = new Date().toISOString().split('T')[0];
        addProdutoItem(); // Adicionar primeiro item vazio
    }
    
    openModal('osModal');
}

function populateClienteSelect() {
    const select = document.getElementById('osCliente');
    select.innerHTML = '<option value="">Selecione um cliente</option>' +
        clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
}

function populateMotivoSelect() {
    const select = document.getElementById('osMotivo');
    select.innerHTML = '<option value="">Selecione um motivo</option>' +
        motivos.map(m => `<option value="${m.descricao}">${m.descricao}</option>`).join('');
}

function handleClienteChange() {
    const clienteId = document.getElementById('osCliente').value;
    const cliente = clientes.find(c => c.id === clienteId);
    
    if (cliente) {
        document.getElementById('osClienteTelefone').value = cliente.telefone;
        document.getElementById('osClienteEndereco').value = cliente.endereco;
        document.getElementById('osClienteBairro').value = cliente.bairro;
    } else {
        document.getElementById('osClienteTelefone').value = '';
        document.getElementById('osClienteEndereco').value = '';
        document.getElementById('osClienteBairro').value = '';
    }
}

function addProdutoItem(produtoData = null) {
    const container = document.getElementById('produtosContainer');
    const itemId = `produto-${produtoItemCounter++}`;
    
    const div = document.createElement('div');
    div.className = 'produto-item';
    div.id = itemId;
    div.innerHTML = `
        <div class="form-group">
            <label>Qtd</label>
            <input type="number" class="produto-qtd" min="1" value="${produtoData?.quantidade || 1}" oninput="calcularTotais()">
        </div>
        <div class="form-group">
            <label>Descrição</label>
            <input type="text" class="produto-desc" list="produtosList" value="${produtoData?.descricao || ''}" 
                   onchange="autoFillProduto(this)">
            <datalist id="produtosList">
                ${produtos.map(p => `<option value="${p.descricao}" data-valor="${p.valor}"></option>`).join('')}
            </datalist>
        </div>
        <div class="form-group">
            <label>Valor Unit.</label>
            <input type="text" class="produto-valor" inputmode="numeric" value="${produtoData?.valorUnitario ? formatCurrency(produtoData.valorUnitario) : ''}" oninput="maskMoedaInput(this); calcularTotais()">
        </div>
        <div class="form-group">
            <label>Valor Total</label>
            <input type="text" class="produto-total" readonly value="R$ 0,00">
        </div>
        <button type="button" class="btn-icon danger" onclick="removeProdutoItem('${itemId}')" title="Remover">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    `;
    
    container.appendChild(div);
    calcularTotais();
}

function removeProdutoItem(itemId) {
    document.getElementById(itemId).remove();
    calcularTotais();
}

function autoFillProduto(input) {
    const descricao = input.value;
    const produto = produtos.find(p => p.descricao === descricao);
    
    if (produto) {
        const item = input.closest('.produto-item');
        item.querySelector('.produto-valor').value = formatCurrency(produto.valor);
        calcularTotais();
    }
}

function calcularTotais() {
    let subtotal = 0;
    
    document.querySelectorAll('.produto-item').forEach(item => {
        const qtd = parseFloat(item.querySelector('.produto-qtd').value) || 0;
        const valor = parseCurrency(item.querySelector('.produto-valor').value);
        const total = qtd * valor;
        
        item.querySelector('.produto-total').value = `R$ ${formatMoney(total)}`;
        subtotal += total;
    });
    
    const desconto = parseCurrency(document.getElementById('osDesconto').value);
    const total = subtotal - desconto;
    
    document.getElementById('osSubtotal').textContent = `R$ ${formatMoney(subtotal)}`;
    document.getElementById('osTotal').textContent = `R$ ${formatMoney(total)}`;
}

async function handleOsSubmit(e) {
    e.preventDefault();
    
    const produtos = [];
    document.querySelectorAll('.produto-item').forEach(item => {
        const qtd = parseFloat(item.querySelector('.produto-qtd').value);
        const desc = item.querySelector('.produto-desc').value;
        const valor = parseCurrency(item.querySelector('.produto-valor').value);
        
        if (desc && qtd && valor) {
            produtos.push({
                quantidade: qtd,
                descricao: desc,
                valorUnitario: valor,
                valorTotal: qtd * valor
            });
        }
    });
    
    if (produtos.length === 0) {
        alert('Adicione pelo menos um produto/serviço');
        return;
    }
    
    const numeroOS = parseInt(document.getElementById('osNumero').value);
    const osExistente = ordensServico.find(o => o.numero === numeroOS && o.id !== editingOsId);
    
    if (osExistente) {
        alert(`Já existe uma OS com o número ${numeroOS}. Por favor, escolha outro número.`);
        return;
    }

    const subtotal = produtos.reduce((sum, p) => sum + p.valorTotal, 0);
    const desconto = parseCurrency(document.getElementById('osDesconto').value);
    const total = subtotal - desconto;
    
    const osData = {
        numero: parseInt(document.getElementById('osNumero').value),
        data: document.getElementById('osData').value,
        clienteId: document.getElementById('osCliente').value,
        motivo: document.getElementById('osMotivo').value,
        produtos: produtos,
        subtotal: subtotal,
        desconto: desconto,
        total: total,
        observacoes: document.getElementById('osObservacoes').value,
        status: editingOsId ? ordensServico.find(o => o.id === editingOsId).status : 'lancada',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        if (editingOsId) {
            await osCollection.doc(editingOsId).update(osData);
            await logOsActivity(editingOsId, 'Edição', 'Dados da OS atualizados');
        } else {
            osData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            osData.usuarioCriador = currentUser.email;
            const docRef = await osCollection.add(osData);
            await logOsActivity(docRef.id, 'Criação', 'Ordem de Serviço criada');
            // Imprimir automaticamente após criar
            await printOS(docRef.id);
        }
        
        closeModal('osModal');
        await loadOS();
        renderOS();
    } catch (error) {
        console.error('Erro ao salvar OS:', error);
        alert('Erro ao salvar ordem de serviço');
    }
}

async function updateStatus(osId, newStatus) {
    if (newStatus === 'concluida') {
        currentOsConclusaoId = osId;
        populateSelectTecnicoModal();
        openModal('selectTecnicoModal');
        return;
    }

    const os = ordensServico.find(o => o.id === osId);
    const oldStatus = os ? os.status : 'desconhecido';

    try {
        await osCollection.doc(osId).update({ status: newStatus });
        await logOsActivity(osId, 'Alteração de Status', `Status alterado de '${oldStatus}' para '${newStatus}'`);
        await loadOS();
        renderOS();
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
    }
}

function populateSelectTecnicoModal() {
    const select = document.getElementById('selectTecnicoId');
    select.innerHTML = '<option value="">Selecione...</option>' +
        tecnicos.map(t => `<option value="${t.id}">${t.nome}</option>`).join('');
}

async function confirmConclusaoOS() {
    const tecnicoId = document.getElementById('selectTecnicoId').value;
    
    if (!tecnicoId) {
        alert('Por favor, selecione um técnico.');
        return;
    }

    const tecnico = tecnicos.find(t => t.id === tecnicoId);

    try {
        await osCollection.doc(currentOsConclusaoId).update({ 
            status: 'concluida',
            tecnicoId: tecnicoId,
            tecnicoNome: tecnico.nome
        });
        await logOsActivity(currentOsConclusaoId, 'Conclusão', `OS concluída pelo técnico ${tecnico.nome}`);
        closeModal('selectTecnicoModal');
        await loadOS();
        renderOS();
    } catch (error) {
        console.error('Erro ao concluir OS:', error);
        alert('Erro ao concluir OS');
    }
}

function viewOS(osId) {
    editOS(osId);
}

function editOS(osId) {
    openOsModal(osId);
}

async function deleteOS(osId) {
    if (confirm('Tem certeza que deseja mover esta ordem de serviço para a lixeira?')) {
        try {
            await osCollection.doc(osId).update({
                deleted: true,
                deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
                deletedBy: currentUser.email
            });
            await logOsActivity(osId, 'Exclusão', 'OS movida para a lixeira');
            await loadOS();
            renderOS();
        } catch (error) {
            console.error('Erro ao excluir OS:', error);
        }
    }
}

async function logOsActivity(osId, action, details) {
    try {
        await logsCollection.add({
            osId: osId,
            action: action,
            details: details,
            user: currentUser.email,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Erro ao registrar log:", error);
    }
}

async function viewOsHistory(osId) {
    const os = ordensServico.find(o => o.id === osId);
    if (!os) return;

    const title = document.getElementById('osHistoryTitle');
    title.textContent = `Histórico - OS #${String(os.numero).padStart(4, '0')}`;

    const tbody = document.getElementById('osHistoryTable');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Carregando...</td></tr>';
    
    openModal('osHistoryModal');

    try {
        const snapshot = await logsCollection
            .where('osId', '==', osId)
            .orderBy('timestamp', 'desc')
            .get();

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Nenhum registro encontrado.</td></tr>';
            return;
        }

        tbody.innerHTML = snapshot.docs.map(doc => {
            const log = doc.data();
            const date = log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString('pt-BR') : 'Data desconhecida';
            return `
                <tr>
                    <td>${date}</td>
                    <td>${log.user}</td>
                    <td><strong>${log.action}</strong></td>
                    <td>${log.details}</td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error("Erro ao carregar histórico:", error);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--danger);">Erro ao carregar histórico.</td></tr>';
    }
}

function renderTrash() {
    const tbody = document.getElementById('trashTable');
    const deletedOS = ordensServico.filter(os => os.deleted).sort((a, b) => {
        const dateA = a.deletedAt ? a.deletedAt.seconds : 0;
        const dateB = b.deletedAt ? b.deletedAt.seconds : 0;
        return dateB - dateA;
    });

    if (deletedOS.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    Lixeira vazia
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = deletedOS.map(os => {
        const cliente = clientes.find(c => c.id === os.clienteId);
        const deletedDate = os.deletedAt ? new Date(os.deletedAt.seconds * 1000).toLocaleString('pt-BR') : 'N/A';
        return `
            <tr>
                <td>#${String(os.numero).padStart(4, '0')}</td>
                <td>${cliente?.nome || 'N/A'}</td>
                <td>${deletedDate}</td>
                <td>${os.deletedBy || 'Desconhecido'}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn-icon" onclick="restoreOS('${os.id}')" title="Restaurar">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="1 4 1 10 7 10"></polyline>
                                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function restoreOS(osId) {
    if (confirm('Deseja restaurar esta ordem de serviço?')) {
        try {
            await osCollection.doc(osId).update({
                deleted: false,
                deletedAt: firebase.firestore.FieldValue.delete(),
                deletedBy: firebase.firestore.FieldValue.delete()
            });
            await logOsActivity(osId, 'Restauração', 'OS restaurada da lixeira');
            await loadOS();
            renderTrash();
        } catch (error) {
            console.error('Erro ao restaurar OS:', error);
        }
    }
}

async function printOS(osId) {
    const os = ordensServico.find(o => o.id === osId);
    if (!os) return;
    const cliente = clientes.find(c => c.id === os.clienteId);
    if (!cliente) return;
    
    // Criar PDF
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>OS #${String(os.numero).padStart(4, '0')}</title>
            <style>
                @page {
                    size: A4; margin: 0;
                }
                body {
                    font-family: Arial, sans-serif;
                    -webkit-print-color-adjust: exact;
                    margin: 0;
                    padding: 20mm 10mm;
                    font-size: 11pt;
                }
                .os-container {
                    border: 2px solid #000;
                    padding: 10px;
                    height: 130mm;
                    box-sizing: border-box;
                }
                .header {
                    text-align: center;
                    font-weight: bold;
                    font-size: 14pt;
                    margin-bottom: 10px;
                    border-bottom: 2px solid #000;
                    padding-bottom: 5px;
                }
                .info-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                    margin-bottom: 5px;
                }
                .info-field {
                    border: 1px solid #000;
                    padding: 3px 5px;
                    min-height: 20px;
                }
                .info-label {
                    font-weight: bold;
                    font-size: 9pt;
                }
                .produtos-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 10px 0;
                }
                .produtos-table th,
                .produtos-table td {
                    border: 1px solid #000;
                    padding: 3px 5px;
                    text-align: left;
                }
                .produtos-table th {
                    background: #f0f0f0;
                    font-size: 9pt;
                }
                .obs-field {
                    border: 1px solid #000;
                    padding: 5px;
                    min-height: 40px;
                    margin: 5px 0;
                }
                .footer {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: 10px;
                    margin-top: 50px;
                }
                .signature {
                    text-align: center;
                    border-top: 1px solid #000;
                    padding-top: 5px;
                    font-size: 9pt;
                }
                .total-geral {
                    text-align: right;
                    font-weight: bold;
                    padding: 5px;
                    background: #f0f0f0;
                    border: 1px solid #000;
                }
            </style>
        </head>
        <body>
            ${generateSingleOsPrintHTML(os, cliente)}
        </body>
        </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => {
        try { printWindow.print(); } catch (e) { console.error(e); }
    }, 250);
}

function generateSingleOsPrintHTML(os, cliente) {
    if (!os || !cliente) return '';
    return `
        <div class="os-container">
            <div class="header">GLOBAL SEGURANÇA - ORDEM DE SERVIÇO Nº ${String(os.numero).padStart(4, '0')}</div>
            <div class="info-row">
                <div class="info-field"><span class="info-label">NOME:</span> ${cliente.nome}</div>
                <div class="info-field"><span class="info-label">DATA:</span> ${formatDate(os.data)}</div>
            </div>
            <div class="info-row">
                <div class="info-field"><span class="info-label">ENDEREÇO:</span> ${cliente.endereco}</div>
                <div class="info-field"><span class="info-label">TELEFONE:</span> ${cliente.telefone}</div>
            </div>
            <div class="info-row">
                <div class="info-field"><span class="info-label">MOTIVO DA O.S.:</span> ${os.motivo}</div>
                <div class="info-field"><span class="info-label">BAIRRO:</span> ${cliente.bairro}</div>
            </div>
            <table class="produtos-table">
                <thead>
                    <tr>
                        <th style="width: 60px;">QTDE</th>
                        <th>DESCRIÇÃO</th>
                        <th style="width: 100px;">VALOR UNIT.</th>
                        <th style="width: 100px;">VALOR TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    ${os.produtos.map(p => `
                        <tr>
                            <td>${p.quantidade}</td>
                            <td>${p.descricao}</td>
                            <td>R$ ${formatMoney(p.valorUnitario)}</td>
                            <td>R$ ${formatMoney(p.valorTotal)}</td>
                        </tr>
                    `).join('')}
                    ${Array(Math.max(0, 5 - os.produtos.length)).fill(0).map(() => `
                        <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="total-geral">
                ${os.desconto > 0 ? `SUBTOTAL: R$ ${formatMoney(os.subtotal)}<br>DESCONTO: R$ ${formatMoney(os.desconto)}<br>` : ''}
                TOTAL GERAL: R$ ${formatMoney(os.total)}
            </div>
            <div class="obs-field"><span class="info-label">OBS.:</span> ${os.observacoes || ''}</div>
            <div class="footer">
                <div class="signature">ASS. TÉCNICO</div>
                <div class="signature">DATA CONCLUSÃO: ___/___/___</div>
                <div class="signature">ASS. CLIENTE</div>
            </div>
        </div>
    `;
}

async function printBatchOS() {
    if (selectedOsIds.size === 0) return;

    const osToPrint = Array.from(selectedOsIds).map(id => {
        const os = ordensServico.find(os => os.id === id);
        if (!os) return null;
        const cliente = clientes.find(c => c.id === os.clienteId);
        return { os, cliente };
    }).filter(Boolean);

    let batchHTML = '';
    for (let i = 0; i < osToPrint.length; i += 2) {
        batchHTML += '<div class="os-print-page">';
        if (osToPrint[i]) {
            batchHTML += generateSingleOsPrintHTML(osToPrint[i].os, osToPrint[i].cliente);
        }
        if (osToPrint[i + 1]) {
            batchHTML += generateSingleOsPrintHTML(osToPrint[i + 1].os, osToPrint[i + 1].cliente);
        }
        batchHTML += '</div>';
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Impressão em Lote de OS</title>
            <style>
                @page { size: A4; margin: 10mm; }
                body { font-family: Arial, sans-serif; margin: 0; padding: 0; font-size: 11pt; -webkit-print-color-adjust: exact; }
                .os-print-page { height: 277mm; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; }
                .os-print-page:last-child { page-break-after: auto; }
                .os-container { border: 2px solid #000; padding: 10px; height: 130mm; box-sizing: border-box; display: flex; flex-direction: column; }
                .header { text-align: center; font-weight: bold; font-size: 14pt; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 5px; }
                .info-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 5px; }
                .info-field { border: 1px solid #000; padding: 3px 5px; min-height: 20px; }
                .info-label { font-weight: bold; font-size: 9pt; }
                .produtos-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                .produtos-table th, .produtos-table td { border: 1px solid #000; padding: 3px 5px; text-align: left; }
                .produtos-table th { background: #f0f0f0; font-size: 9pt; }
                .obs-field { border: 1px solid #000; padding: 5px; min-height: 40px; margin: 5px 0; }
                .footer { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 35px; }
                .signature { text-align: center; border-top: 1px solid #000; padding-top: 5px; font-size: 9pt; }
                .total-geral { text-align: right; font-weight: bold; padding: 5px; background: #f0f0f0; border: 1px solid #000; }
            </style>
        </head>
        <body>
            ${batchHTML}
        </body>
        </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
        try { printWindow.print(); } catch (e) { console.error(e); }
    }, 500);
}

function exportOS() {
    // Determinar quais OS exportar: Selecionadas OU Filtradas atualmente
    let osToExport = [];
    
    if (selectedOsIds.size > 0) {
        osToExport = ordensServico.filter(os => selectedOsIds.has(os.id));
    } else {
        osToExport = getFilteredOS();
    }

    if (osToExport.length === 0) {
        alert('Nenhuma Ordem de Serviço para exportar.');
        return;
    }

    // Cabeçalho do CSV
    let csvContent = "Numero;Data;Cliente;Telefone;Status;Valor Total;Tecnico;Motivo\n";

    osToExport.forEach(os => {
        const cliente = clientes.find(c => c.id === os.clienteId);
        
        // Tratar dados para evitar quebra do CSV (remover ponto e vírgula e quebras de linha)
        const clean = (text) => text ? String(text).replace(/;/g, ' ').replace(/(\r\n|\n|\r)/gm, " ") : '';
        const formatDateCSV = (dateStr) => dateStr ? dateStr.split('-').reverse().join('/') : '';
        const formatMoneyCSV = (val) => val ? val.toFixed(2).replace('.', ',') : '0,00';

        const row = [
            os.numero,
            formatDateCSV(os.data),
            clean(cliente?.nome),
            clean(cliente?.telefone),
            clean(os.status.toUpperCase()),
            formatMoneyCSV(os.total),
            clean(os.tecnicoNome),
            clean(os.motivo)
        ];

        csvContent += row.join(";") + "\n";
    });

    // Criar Blob e Download
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' }); // \ufeff adiciona BOM para o Excel abrir com acentos corretos
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_os_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ==================== CLIENTES ====================

function openClienteModal(clienteId = null, isQuick = false) {
    const modal = document.getElementById('clienteModal');
    const title = document.getElementById('clienteModalTitle');
    
    if (clienteId) {
        title.textContent = 'Editar Cliente';
        const cliente = clientes.find(c => c.id === clienteId);
        if (cliente) {
            document.getElementById('clienteId').value = cliente.id;
            document.getElementById('clienteNome').value = cliente.nome;
            document.getElementById('clienteTelefone').value = cliente.telefone;
            document.getElementById('clienteEndereco').value = cliente.endereco;
            document.getElementById('clienteBairro').value = cliente.bairro;
        }
    } else {
        title.textContent = isQuick ? 'Novo Cliente (Rápido)' : 'Novo Cliente';
        document.getElementById('clienteForm').reset();
    }
    
    openModal('clienteModal');
}

function openQuickClienteModal() {
    quickClienteCallback = (clienteId) => {
        document.getElementById('osCliente').value = clienteId;
        handleClienteChange();
    };
    openClienteModal(null, true);
}

async function handleClienteSubmit(e) {
    e.preventDefault();
    
    const clienteData = {
        nome: document.getElementById('clienteNome').value,
        telefone: document.getElementById('clienteTelefone').value,
        endereco: document.getElementById('clienteEndereco').value,
        bairro: document.getElementById('clienteBairro').value
    };
    
    try {
        const clienteId = document.getElementById('clienteId').value;
        
        if (clienteId) {
            await clientesCollection.doc(clienteId).update(clienteData);
        } else {
            const docRef = await clientesCollection.add(clienteData);
            if (quickClienteCallback) {
                quickClienteCallback(docRef.id);
                quickClienteCallback = null;
            }
        }
        
        closeModal('clienteModal');
        await loadClientes();
        renderClientes();
    } catch (error) {
        console.error('Erro ao salvar cliente:', error);
        alert('Erro ao salvar cliente');
    }
}

function editCliente(clienteId) {
    openClienteModal(clienteId);
}

async function deleteCliente(clienteId) {
    // Verificar se cliente tem OS
    const hasOS = ordensServico.some(os => os.clienteId === clienteId);
    if (hasOS) {
        alert('Não é possível excluir este cliente pois ele possui ordens de serviço cadastradas.');
        return;
    }
    
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
        try {
            await clientesCollection.doc(clienteId).delete();
            await loadClientes();
            renderClientes();
        } catch (error) {
            console.error('Erro ao excluir cliente:', error);
        }
    }
}

// ==================== PRODUTOS ====================

function openProdutoModal(produtoId = null) {
    const modal = document.getElementById('produtoModal');
    const title = document.getElementById('produtoModalTitle');
    
    if (produtoId) {
        title.textContent = 'Editar Produto';
        const produto = produtos.find(p => p.id === produtoId);
        if (produto) {
            document.getElementById('produtoId').value = produto.id;
            document.getElementById('produtoDescricao').value = produto.descricao;
            document.getElementById('produtoValor').value = formatCurrency(produto.valor);
        }
    } else {
        title.textContent = 'Novo Produto';
        document.getElementById('produtoForm').reset();
    }
    
    openModal('produtoModal');
}

async function handleProdutoSubmit(e) {
    e.preventDefault();
    
    const produtoData = {
        descricao: document.getElementById('produtoDescricao').value,
        valor: parseCurrency(document.getElementById('produtoValor').value)
    };
    
    try {
        const produtoId = document.getElementById('produtoId').value;
        
        if (produtoId) {
            await produtosCollection.doc(produtoId).update(produtoData);
        } else {
            await produtosCollection.add(produtoData);
        }
        
        closeModal('produtoModal');
        await loadProdutos();
        renderProdutos();
    } catch (error) {
        console.error('Erro ao salvar produto:', error);
        alert('Erro ao salvar produto');
    }
}

function editProduto(produtoId) {
    openProdutoModal(produtoId);
}

async function deleteProduto(produtoId) {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
        try {
            await produtosCollection.doc(produtoId).delete();
            await loadProdutos();
            renderProdutos();
        } catch (error) {
            console.error('Erro ao excluir produto:', error);
        }
    }
}

// ==================== TÉCNICOS ====================

function openTecnicoModal(tecnicoId = null) {
    const modal = document.getElementById('tecnicoModal');
    const title = document.getElementById('tecnicoModalTitle');
    
    if (tecnicoId) {
        title.textContent = 'Editar Técnico';
        const tecnico = tecnicos.find(t => t.id === tecnicoId);
        if (tecnico) {
            document.getElementById('tecnicoId').value = tecnico.id;
            document.getElementById('tecnicoNome').value = tecnico.nome;
            document.getElementById('tecnicoCargo').value = tecnico.cargo || '';
        }
    } else {
        title.textContent = 'Novo Técnico';
        document.getElementById('tecnicoForm').reset();
    }
    
    openModal('tecnicoModal');
}

async function handleTecnicoSubmit(e) {
    e.preventDefault();
    
    const tecnicoData = {
        nome: document.getElementById('tecnicoNome').value,
        cargo: document.getElementById('tecnicoCargo').value
    };
    
    try {
        const tecnicoId = document.getElementById('tecnicoId').value;
        
        if (tecnicoId) {
            await tecnicosCollection.doc(tecnicoId).update(tecnicoData);
        } else {
            await tecnicosCollection.add(tecnicoData);
        }
        
        closeModal('tecnicoModal');
        await loadTecnicos();
        renderTecnicos();
    } catch (error) {
        console.error('Erro ao salvar técnico:', error);
        alert('Erro ao salvar técnico');
    }
}

function editTecnico(tecnicoId) {
    openTecnicoModal(tecnicoId);
}

async function deleteTecnico(tecnicoId) {
    if (confirm('Tem certeza que deseja excluir este técnico?')) {
        try {
            await tecnicosCollection.doc(tecnicoId).delete();
            await loadTecnicos();
            renderTecnicos();
        } catch (error) {
            console.error('Erro ao excluir técnico:', error);
        }
    }
}

// ==================== PERFIL E USUÁRIOS ====================

async function renderProfilePage() {
    if (!currentUserProfile) return;

    // Preencher ID da empresa
    document.getElementById('profileCompanyId').value = currentUserProfile.companyId;

    // Lógica de visibilidade do painel de admin
    const adminPanel = document.getElementById('adminUserManagement');
    adminPanel.classList.toggle('hidden', currentUserProfile.role !== 'admin');

    if (currentUserProfile.role === 'admin') {
        // Carregar e listar usuários da empresa
        const usersTable = document.getElementById('companyUsersTable');
        usersTable.innerHTML = '<tr><td colspan="3">Carregando...</td></tr>';

        const usersSnapshot = await db.collection('users')
            .where('companyId', '==', currentUserProfile.companyId)
            .get();
        
        const companyUsers = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));

        if (companyUsers.length > 0) {
            usersTable.innerHTML = companyUsers.map(user => `
                <tr>
                    <td>${user.email}</td>
                    <td><span class="os-status ${user.role === 'admin' ? 'andamento' : 'lancada'}">${user.role}</span></td>
                    <td>
                        ${user.uid !== currentUser.uid ? `
                        <div class="table-actions">
                            <button class="btn-icon danger" onclick="removeUserFromCompany('${user.uid}')" title="Remover da Empresa">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                            </button>
                        </div>
                        ` : ''}
                    </td>
                </tr>
            `).join('');
        } else {
            usersTable.innerHTML = '<tr><td colspan="3">Nenhum usuário encontrado.</td></tr>';
        }
    }
}

function copyCompanyId() {
    const input = document.getElementById('profileCompanyId');
    input.select();
    document.execCommand('copy');
    alert('ID da Empresa copiado para a área de transferência!');
}

async function handleJoinCompany() {
    const newCompanyId = document.getElementById('joinCompanyId').value.trim();
    if (!newCompanyId) {
        alert('Por favor, insira um ID de empresa.');
        return;
    }

    if (confirm(`Tem certeza que deseja entrar na empresa com ID: ${newCompanyId}? Você perderá o acesso aos dados da sua empresa atual.`)) {
        try {
            await db.collection('users').doc(currentUser.uid).update({
                companyId: newCompanyId,
                role: 'member' // Ao entrar em outra empresa, se torna membro
            });
            alert('Você entrou na nova empresa! Por favor, saia e entre novamente para ver as alterações.');
            await handleLogout();
        } catch (error) {
            console.error("Erro ao entrar na empresa:", error);
            alert("Erro ao entrar na empresa. Verifique se o ID está correto.");
        }
    }
}

async function removeUserFromCompany(userIdToRemove) {
    if (confirm('Tem certeza que deseja remover este usuário da sua empresa? Ele perderá o acesso aos dados.')) {
        try {
            // Reverte o usuário para sua própria empresa, tornando-o admin dela
            await db.collection('users').doc(userIdToRemove).update({
                companyId: userIdToRemove,
                role: 'admin'
            });
            alert('Usuário removido com sucesso.');
            renderProfilePage(); // Atualiza a lista
        } catch (error) {
            console.error("Erro ao remover usuário:", error);
            alert("Ocorreu um erro ao remover o usuário.");
        }
    }
}

async function handlePasswordResetRequest(e) {
    e.preventDefault();
    const email = currentUser ? currentUser.email : document.getElementById('loginEmail').value;
    if (!email) {
        alert('Por favor, digite seu e-mail no campo de login para redefinir a senha.');
        return;
    }
    try {
        await auth.sendPasswordResetEmail(email);
        alert(`Um e-mail de redefinição de senha foi enviado para ${email}. Verifique sua caixa de entrada.`);
    } catch (error) {
        console.error("Erro ao enviar e-mail de redefinição:", error);
        alert("Ocorreu um erro. Verifique se o e-mail está correto.");
    }
}

// ==================== MOTIVOS ====================

function openQuickMotivoModal() {
    openModal('motivoModal');
}

async function handleMotivoSubmit(e) {
    e.preventDefault();
    
    const descricao = document.getElementById('motivoDescricao').value;
    
    try {
        await motivosCollection.add({ descricao });
        closeModal('motivoModal');
        document.getElementById('motivoForm').reset();
        await loadMotivos();
        document.getElementById('osMotivo').value = descricao;
    } catch (error) {
        console.error('Erro ao salvar motivo:', error);
        alert('Erro ao salvar motivo');
    }
}

// ==================== UTILS ====================

function formatDate(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

function formatMoney(value) {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Formata valor para input (R$ 1.000,00)
function formatCurrency(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Converte string formatada (R$ 1.000,00) para number (1000.00)
function parseCurrency(value) {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    return Number(value.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
}

// Máscara para inputs de moeda
function maskMoedaInput(input) {
    let value = input.value.replace(/\D/g, '');
    if (value === '') {
        input.value = '';
        return;
    }
    const numberValue = Number(value) / 100;
    input.value = numberValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Máscara para telefone (11) 99999-9999
function maskTelefoneInput(input) {
    let v = input.value.replace(/\D/g, "");
    v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
    v = v.replace(/(\d)(\d{4})$/, "$1-$2");
    input.value = v;
}
