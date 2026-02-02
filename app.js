// Configuration
const CONFIG = {
    TOKEN_TICKER: '$sora',
    MIN_BALANCE: 1,
    // URL du Cloudflare Worker
    WORKER_URL: 'https://tapaction.aigpt974.workers.dev'
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
    welcomeBalance: document.getElementById('welcome-balance'),
    encryptedContent: document.getElementById('encrypted-content'),
    decryptedContent: document.getElementById('decrypted-content')
};

// Contenu secret chiffré avec AES
const ENCRYPTED_SECRET = 'U2FsdGVkX18sms7lrRhM895/OYaHo3iJOTKhXNbNDyKj6u5oZL0BTBve+62eUDYfQGiIPfAlJUdR8oWYi39PiL2jVffcnX1hZFnHw2zE420MxrD6mXDDzarMqnI8xNdOkgbBko/CeFPPfcoygbeYt4OICCWC7QSeavwR/hhlzc147spyCOy5tv0Q8o01AdjDrUDt8oV37GkCw4jBHfkTLlJOsRUWIztlilMr6lIVgg1EHNOIX7yhpwmEqzEJlp4LU7z/VbWw4ZPaDHbn2LscoLr49FZrJpsEzQFUCiiyN7bnjd4/Sv++fJYRDV2aK3Pj0on4JKkg4UdJWROA2Ef1yR21eT3kkLiRweelTWRGcdB+dgJZ71wYkMBkXEzIVydDk3z6rBet6s1fnWOFbO0J9iwgjs+ZG9mbLEvovyK09gM=';

// Afficher un écran spécifique
function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.add('hidden'));
    screens[screenName].classList.remove('hidden');
}

// Déchiffrer le contenu secret avec la clé reçue du Worker
function decryptContent(key) {
    try {
        // Déchiffrement AES avec CryptoJS
        const decrypted = CryptoJS.AES.decrypt(ENCRYPTED_SECRET, key);
        const plaintext = decrypted.toString(CryptoJS.enc.Utf8);

        if (plaintext) {
            elements.decryptedContent.innerHTML = plaintext;
        } else {
            elements.decryptedContent.innerHTML = '<p style="color: #e74c3c;">Erreur de déchiffrement</p>';
        }
    } catch (error) {
        console.error('Erreur déchiffrement:', error);
        elements.decryptedContent.innerHTML = '<p style="color: #e74c3c;">Erreur de déchiffrement</p>';
    }
}

// Vérifier si TAP Wallet est installé
function isTapWalletInstalled() {
    return typeof window.tapprotocol !== 'undefined';
}

// Connecter le wallet
async function connectWallet() {
    if (!isTapWalletInstalled()) {
        elements.noWalletMsg.classList.remove('hidden');
        return;
    }

    try {
        // Demander la connexion au wallet
        const accounts = await window.tapprotocol.requestAccounts();

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

        if (result.authorized && result.decryptionKey) {
            // Accès autorisé - déchiffrer le contenu secret
            elements.welcomeBalance.textContent = result.balance;
            decryptContent(result.decryptionKey);
            showScreen('welcome');
        } else if (result.authorized) {
            // Autorisé mais pas de clé (ne devrait pas arriver)
            elements.welcomeBalance.textContent = result.balance;
            elements.decryptedContent.innerHTML = '<p>Contenu non disponible</p>';
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
