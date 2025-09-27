import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// In un ambiente React standard, useresti una riga come questa:
// import './index.css'; 

const container = document.getElementById('root');
if (container) {
    const root = ReactDOM.createRoot(container);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
} else {
    console.error("Elemento root non trovato. L'app React non può essere montata.");
}
