

// Inicializar Firebase usando el objeto global
const firebaseConfig = {
    apiKey: "AIzaSyAaEmQApj65zftBpVPBjDz10pJPsjFm_NQ",
    authDomain: "ventas-9f734.firebaseapp.com",
    databaseURL: "https://ventas-9f734-default-rtdb.firebaseio.com",
    projectId: "ventas-9f734",
    storageBucket: "ventas-9f734.appspot.com",
    messagingSenderId: "183579140497",
    appId: "1:183579140497:web:366c8ac9e3253d53f83a30",
    measurementId: "G-3FZ1W9FQT0"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Inicializar servicios
const db = firebase.firestore();
const storage = firebase.storage();
const realtimeDB = firebase.database();
