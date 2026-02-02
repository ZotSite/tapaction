// Configuration
const CONFIG = {
    TOKEN_NAME: 'TNK',
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
const ENCRYPTED_SECRET = 'U2FsdGVkX1/QN75nhu4tHCHNYpjBEBPVQ9ziNipjWQb+mUB7FX5Ioo4Dq3CpYti8twgUuotDsTu5w7dWVNBlPfW02fs9BAbLZtYQyr8gopFmzzYTUKVxVo8hpdtcDYh5ktKDfQIwNsyfsZ+/CrOxB+OOhUtuPRI+CYnufj5KG/MI7c88oFrbJpT1luTpWyS8bK8Yy7lhRfDJfIjt0hoh5pxz2FPrvDCqQHo82CLQSLPy0WsnDS3C1dMAlEALsCUjWeR961NNutoFjSRKCV+HTSSxy32ktV7goOvVT2fqcoCMmP6N7qoi/dMtABxQqAoyqhfxG96RSBjuGU0WufIbjlGlBNWgqVkGdCLpcV5B19mIb/XtWAkz+NYNqD6b3J40O0AyqJetbdXLFARorEnqrxvVEx0jhfyylzUgOUQ4Itk=';

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

// Vérifier si TAP Wallet est installé (avec support TRAC)
function isTapWalletInstalled() {
    return typeof window.tracnetwork !== 'undefined';
}

// Connecter le wallet
async function connectWallet() {
    if (!isTapWalletInstalled()) {
        elements.noWalletMsg.classList.remove('hidden');
        return;
    }

    try {
        // Demander la connexion au réseau TRAC
        await window.tracnetwork.requestAccount();

        // Récupérer l'adresse TRAC (différente de l'adresse Bitcoin)
        const tracAddress = await window.tracnetwork.getAddress();

        if (tracAddress) {
            await verifyTokenBalance(tracAddress);
        } else {
            alert('Impossible de récupérer l\'adresse TRAC');
        }
    } catch (error) {
        console.error('Erreur connexion wallet:', error);
        alert('Erreur lors de la connexion au wallet');
    }
}

// Vérifier le solde TNK via le Cloudflare Worker
async function verifyTokenBalance(tracAddress) {
    showScreen('loading');

    try {
        // Appel au Worker Cloudflare pour vérifier le solde TNK
        const response = await fetch(`${CONFIG.WORKER_URL}/verify-tnk`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tracAddress: tracAddress,
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
            console.log('TAP Wallet (TRAC network) non détecté');
        }
    }, 500);
});
