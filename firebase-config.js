// Configuração do Firebase
// IMPORTANTE: Substitua estas credenciais pelas suas do Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyBh2UotQT9AdgQ5Jkt5eO6qyI1Pn9h6fy0",
  authDomain: "ordens-de-servico-global.firebaseapp.com",
  projectId: "ordens-de-servico-global",
  storageBucket: "ordens-de-servico-global.firebasestorage.app",
  messagingSenderId: "284865253152",
  appId: "1:284865253152:web:0156cdd90c95b3db251145"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referências
const auth = firebase.auth();
const db = firebase.firestore();

// Collections
// Alterado para 'let' para permitir multi-tenancy (multi-empresa)
// Elas serão inicializadas no app.js após o login do usuário
let clientesCollection;
let produtosCollection;
let osCollection;
let motivosCollection;
let configCollection;
let tecnicosCollection;
let logsCollection;
let atendentesCollection;
