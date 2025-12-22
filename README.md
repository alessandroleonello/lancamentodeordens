# Sistema de Gerenciamento de Ordens de Serviço - Global Segurança

Sistema completo e moderno para gerenciar ordens de serviço, clientes e produtos, com integração Firebase.

## 🚀 Funcionalidades

### Ordens de Serviço
- ✅ Criação automática de números sequenciais
- ✅ Cadastro rápido de clientes e motivos durante a criação da OS
- ✅ Adicionar múltiplos produtos/serviços com cálculo automático
- ✅ Sistema de desconto
- ✅ Geração automática de PDF para impressão (meia folha A4)
- ✅ Controle de status (Lançada, Em Andamento, Concluída)
- ✅ Edição e exclusão de ordens
- ✅ Filtros por status e busca

### Clientes
- ✅ CRUD completo (Create, Read, Update, Delete)
- ✅ Cadastro de: Nome, Telefone, Endereço, Bairro
- ✅ Prevenção de exclusão se houver OS vinculadas
- ✅ Busca e filtros

### Produtos/Serviços
- ✅ CRUD completo
- ✅ Auto-complete de produtos ao criar OS
- ✅ Gestão de preços

## 📋 Pré-requisitos

- Conta no Firebase (gratuita)
- Navegador moderno
- Servidor web (pode usar o Live Server do VS Code)

## ⚙️ Configuração do Firebase

### 1. Criar Projeto no Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em "Adicionar projeto"
3. Dê um nome ao projeto (ex: "global-seguranca-os")
4. Desabilite o Google Analytics (opcional)
5. Clique em "Criar projeto"

### 2. Configurar Authentication

1. No menu lateral, clique em "Authentication"
2. Clique em "Começar"
3. Na aba "Sign-in method", habilite "E-mail/senha"
4. Na aba "Users", clique em "Adicionar usuário"
5. Cadastre seu e-mail e senha para acessar o sistema

### 3. Configurar Firestore Database

1. No menu lateral, clique em "Firestore Database"
2. Clique em "Criar banco de dados"
3. Escolha "Iniciar no modo de teste" (você pode mudar depois)
4. Escolha a localização mais próxima (ex: southamerica-east1)
5. Clique em "Ativar"

### 4. Obter Credenciais

1. Clique no ícone de engrenagem ⚙️ ao lado de "Visão geral do projeto"
2. Clique em "Configurações do projeto"
3. Role até "Seus aplicativos" e clique no ícone Web `</>`
4. Dê um nome ao app (ex: "OS Web App")
5. Clique em "Registrar app"
6. Copie as credenciais que aparecem

### 5. Configurar o Projeto

1. Abra o arquivo `firebase-config.js`
2. Substitua as credenciais pelas suas:

```javascript
const firebaseConfig = {
    apiKey: "SUA_API_KEY_AQUI",
    authDomain: "seu-projeto.firebaseapp.com",
    projectId: "seu-projeto-id",
    storageBucket: "seu-projeto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123"
};
```

### 6. Configurar Regras de Segurança do Firestore

No Firebase Console, vá em Firestore Database > Regras e substitua por:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir acesso apenas a usuários autenticados
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Clique em "Publicar"

## 🖥️ Como Usar o Sistema

### Primeira Execução

1. Abra o arquivo `index.html` em um servidor web
2. Faça login com o e-mail e senha cadastrados no Firebase
3. O sistema carregará automaticamente

### Cadastrar Dados Iniciais

**Produtos (recomendado fazer primeiro):**
1. Acesse "Produtos" no menu lateral
2. Clique em "Novo Produto"
3. Cadastre seus produtos/serviços com descrição e valor

**Clientes:**
1. Acesse "Clientes" no menu lateral
2. Clique em "Novo Cliente"
3. Preencha os dados do cliente

### Criar Ordem de Serviço

1. Na página inicial, clique em "Nova OS"
2. O número da OS é gerado automaticamente
3. A data vem preenchida com hoje (editável)
4. Selecione ou crie um novo cliente
5. Selecione ou crie um novo motivo
6. Adicione produtos:
   - Use o auto-complete para produtos cadastrados
   - Ou digite manualmente
   - Ajuste a quantidade
   - O valor total é calculado automaticamente
7. Adicione desconto se necessário
8. Adicione observações (opcional)
9. Clique em "Salvar OS"
10. O PDF será gerado automaticamente para impressão

### Gerenciar Ordens de Serviço

- **Filtrar:** Use os filtros de status e busca
- **Ver/Editar:** Clique no card da OS
- **Mudar Status:** Use o dropdown de status no card
- **Imprimir:** Clique no ícone de impressora
- **Excluir:** Clique no ícone de lixeira

## 📱 Recursos do Sistema

### Design Moderno
- Interface dark mode profissional
- Animações suaves
- Responsivo para mobile
- Feedbacks visuais

### Segurança
- Autenticação obrigatória
- Dados protegidos no Firebase
- Validações em todos os formulários

### Usabilidade
- Auto-complete de produtos
- Cálculos automáticos
- Numeração automática de OS
- Prevenção de exclusão acidental
- Impressão otimizada (meia folha A4)

## 🎨 Personalização

### Cores
Para mudar as cores do sistema, edite as variáveis CSS em `styles.css`:

```css
:root {
    --primary: #0a0e27;      /* Cor primária */
    --accent: #00d9ff;       /* Cor de destaque */
    --success: #00ff88;      /* Cor de sucesso */
    --danger: #ff3366;       /* Cor de perigo */
}
```

### Nome da Empresa
Procure por "GLOBAL SEGURANÇA" nos arquivos e substitua pelo nome da sua empresa.

## 🔧 Solução de Problemas

### Erro ao fazer login
- Verifique se o usuário foi cadastrado no Firebase Authentication
- Confirme que o e-mail e senha estão corretos
- Verifique se a autenticação por e-mail/senha está habilitada

### Dados não aparecem
- Verifique se as credenciais do Firebase estão corretas
- Confirme que as regras de segurança do Firestore estão configuradas
- Verifique o console do navegador (F12) para erros

### PDF não imprime
- Verifique se o bloqueador de pop-ups está desabilitado
- Tente em outro navegador
- Verifique se há erros no console

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique o console do navegador (F12) para erros
2. Confirme que todas as configurações do Firebase estão corretas
3. Teste com dados de exemplo primeiro

## 🚀 Deploy (Hospedagem)

### Firebase Hosting (Recomendado - Gratuito)

1. Instale o Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Faça login:
```bash
firebase login
```

3. Inicialize o projeto:
```bash
firebase init hosting
```

4. Selecione seu projeto
5. Use o diretório público atual (.)
6. Configure como single-page app: Não
7. Deploy:
```bash
firebase deploy
```

### Outras opções
- Netlify
- Vercel
- GitHub Pages
- Servidor próprio

## 📄 Estrutura de Arquivos

```
├── index.html          # Estrutura HTML
├── styles.css          # Estilos e design
├── firebase-config.js  # Configuração Firebase
├── app.js             # Lógica da aplicação
└── README.md          # Este arquivo
```

## 💡 Dicas de Uso

1. **Cadastre produtos primeiro** para usar o auto-complete ao criar OS
2. **Use motivos padrão** para agilizar o preenchimento
3. **Revise a OS** antes de salvar (ela imprime automaticamente)
4. **Mantenha backup** dos dados importantes
5. **Configure regras de segurança** adequadas no Firebase para produção

## 📝 Licença

Sistema desenvolvido para uso interno. Todos os direitos reservados.

---

**Desenvolvido com ❤️ usando Firebase, HTML, CSS e JavaScript puro**
