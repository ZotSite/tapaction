// Configuration
const CONFIG = {
    TOKEN_TICKER: 'taparoo',
    MIN_BALANCE: 1,
    // URL du Cloudflare Worker
    WORKER_URL: 'https://tap-action.aigpt974.workers.dev'
};

// Elements DOM
const screens = {
    connect: document.getElementById('connect-screen'),
    loading: document.getElementById('loading-screen'),
    denied: document.getElementById('denied-screen'),
    welcome: document.getElementById('welcome-screen')
};

const elements = {
    connectBtn: document.getElementById('connect-btn'),
    retryBtn: document.getElementById('retry-btn'),
    disconnectBtn: document.getElementById('disconnect-btn'),
    noWalletMsg: document.getElementById('no-wallet-msg'),
    deniedBalance: document.getElementById('denied-balance'),
    welcomeBalance: document.getElementById('welcome-balance')
};

// Afficher un écran spécifique
function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.add('hidden'));
    screens[screenName].classList.remove('hidden');
}

// Vérifier si TAP Wallet est installé
function isTapWalletInstalled() {
    return typeof window.tap !== 'undefined';
}

// Connecter le wallet
async function connectWallet() {
    if (!isTapWalletInstalled()) {
        elements.noWalletMsg.classList.remove('hidden');
        return;
    }

    try {
        // Demander la connexion au wallet
        const accounts = await window.tap.requestAccounts();

        if (accounts && accounts.length > 0) {
            const address = accounts[0];
            await verifyTokenBalance(address);
        }
    } catch (error) {
        console.error('Erreur connexion wallet:', error);
        alert('Erreur lors de la connexion au wallet');
    }
}

// Vérifier le solde via le Cloudflare Worker
async function verifyTokenBalance(address) {
    showScreen('loading');

    try {
        // Appel au Worker Cloudflare pour vérifier le solde
        const response = await fetch(`${CONFIG.WORKER_URL}/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                address: address,
                ticker: CONFIG.TOKEN_TICKER,
                minBalance: CONFIG.MIN_BALANCE
            })
        });

        const result = await response.json();

        if (result.authorized) {
            // Accès autorisé
            elements.welcomeBalance.textContent = result.balance;
            showScreen('welcome');
        } else {
            // Accès refusé
            elements.deniedBalance.textContent = result.balance || '0';
            showScreen('denied');
        }
    } catch (error) {
        console.error('Erreur vérification:', error);
        alert('Erreur lors de la vérification du solde');
        showScreen('connect');
    }
}

// Déconnecter
function disconnect() {
    showScreen('connect');
}

// Event listeners
elements.connectBtn.addEventListener('click', connectWallet);
elements.retryBtn.addEventListener('click', connectWallet);
elements.disconnectBtn.addEventListener('click', disconnect);

// Vérifier si le wallet est installé au chargement
document.addEventListener('DOMContentLoaded', () => {
    // Petit délai pour laisser le temps au wallet de s'injecter
    setTimeout(() => {
        if (!isTapWalletInstalled()) {
            console.log('TAP Wallet non détecté');
        }
    }, 500);
});
