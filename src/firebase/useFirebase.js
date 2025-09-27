import { useState, useEffect, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, query, onSnapshot } from 'firebase/firestore';

// --- CONFIGURAZIONE GLOBALE E UTILS ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'devfest-default-app';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Soluzione definitiva (Usata per la verifica finale)
const SOLUTION = {
    'tipo': 'SQL Injection',
    'file': 'user_authentication.php',
    'team': 'Il Team Cobra',
    'risolutore': 'Il DevOps Hero (Marco Verdi)',
    'metodo': 'Filtro (sanificazione) ai caratteri speciali nell\'input dell\'utente'
};

// Mappatura delle URL ai contenuti degli indizi
const INDIZI_MAP = {
    'https://devfest-mystery.io/indizio/1A-SQL-INJECTION': { text: "Indizio 1A: Il bug era legato a una vulnerabilità di SQL Injection nel modulo di login.", points: 15 },
    'https://devfest-mystery.io/indizio/1B-COMMIT-TODO': { text: "Indizio 1B: Il commit incriminato aveva un commento strano: //TODO: Sistema questo schifo più tardi.", points: 15 },
    'https://devfest-mystery.io/indizio/2A-LOG-ANOMALO': { text: "Indizio 2A: Tentativo di accesso anomalo (IP sospetto).", points: 15 },
    'https://devfest-mystery.io/indizio/2B-PAYLOAD-UNION': { text: "Indizio 2B: Payload contenente la stringa UNION SELECT.", points: 15 },
    'https://devfest-mystery.io/indizio/3A-PATCH-EMERGENZA': { text: "Indizio 3A: Risolto con patch di emergenza che applica un filtro ai caratteri speciali.", points: 15 },
    'https://devfest-mystery.io/indizio/3B-COMMIT-FIX': { text: "Indizio 3B: Commit: FIX: Sanitize user input to prevent SQL Injection (CRITICAL).", points: 15 },
    'https://devfest-mystery.io/indizio/4A-FILE-AUTH': { text: "Indizio 4A: Il codice incriminato era nel file user_authentication.php.", points: 15 },
    'https://devfest-mystery.io/indizio/4B-TEAM-COBRA': { text: "Indizio 4B: Il bug è stato inserito dal Team Cobra.", points: 15 },
    'https://devfest-mystery.io/indizio/5A-BLUFF-IGNORA': { text: "Indizio 5A: Dichiarazione di Davide Gialli: 'Non so nulla di bug.' (Potenzialmente FALSO)", points: 15 },
    'https://devfest-mystery.io/indizio/5B-FUORVIANTE': { text: "Indizio 5B: Visto Andrea lavorare sul file (Fuorviante).", points: 15 },
    'https://devfest-mystery.io/indizio/6A-SNIPPET-VULN': { text: "Indizio 6A: Frammento di codice PHP vulnerabile (SQLi).", points: 15 },
    'https://devfest-mystery.io/indizio/6B-COMMENTO-ALERT': { text: "Indizio 6B: Commento: // ATTENZIONE: Questo codice è vulnerabile!", points: 15 },
    'https://devfest-mystery.io/indizio/7A-REPO-HISTORY': { text: "Indizio 7A: History del file user_authentication.php nel repository fittizio.", points: 15 },
    'https://devfest-mystery.io/indizio/7B-COMMIT-DETAILS': { text: "Indizio 7B: Dettagli del commit di fix sul file.", points: 15 },
};

export const calculateScore = (userResponses) => {
    let score = 0;
    const correctResponses = {};
    let correctCount = 0;

    const allIndizi = {
        ...(userResponses.indiziRaccolti || {}),
    };
    score += Object.keys(allIndizi).length * 15; // 15 punti per ogni indizio

    Object.keys(userResponses.soluzione || {}).forEach(key => {
        const userValue = (userResponses.soluzione[key] || '').toLowerCase().trim();
        const solutionValue = (SOLUTION[key] || '').toLowerCase().trim();

        // Controllo se la risposta è sufficientemente vicina
        const isCorrect = solutionValue && userValue.includes(solutionValue.toLowerCase().substring(0, Math.min(solutionValue.length, 10))) && userValue.length >= 5;

        if (isCorrect) {
            score += 40; // 40 punti per ogni "W" corretta
            correctResponses[key] = true;
            correctCount++;
        } else {
            correctResponses[key] = false;
        }
    });

    // Punti Bonus
    if (correctCount === 5) {
        score += 200; // Bonus per soluzione completa
    }

    return { score, correctResponses, correctCount };
};


export const useFirebase = () => {
    const [db, setDb] = useState(null);
    const [userId, setUserId] = useState(null);
    const [teamId, setTeamId] = useState('');
    const [teamName, setTeamName] = useState('');
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [isDbReady, setIsDbReady] = useState(false);
    const [userData, setUserData] = useState(null);
    const [teamData, setTeamData] = useState(null);
    const [teamResponses, setTeamResponses] = useState({ tipo: '', file: '', team: '', risolutore: '', metodo: '' });
    const [indizi, setIndizi] = useState({});
    const [message, setMessage] = useState('');
    const [leaderboard, setLeaderboard] = useState([]);
    const [isScannerActive, setIsScannerActive] = useState(false);
    const [permissionError, setPermissionError] = useState(false);
    const scannerRef = useRef(null);
    const authRef = useRef(null);

    // 1. Inizializzazione Firebase e Autenticazione
    useEffect(() => {
        if (!firebaseConfig) {
            console.error("Firebase config non disponibile.");
            return;
        }
        try {
            // Aggiungi script per html5-qrcode
            if (!document.getElementById('html5-qrcode-script')) {
                const script = document.createElement('script');
                script.src = "https://unpkg.com/html5-qrcode@2.3.4/umd/html5-qrcode.min.js";
                script.id = 'html5-qrcode-script';
                document.head.appendChild(script);
            }

            const app = initializeApp(firebaseConfig);
            const firestore = getFirestore(app);
            const authService = getAuth(app);
            authRef.current = authService; // Salva l'istanza Auth

            setDb(firestore);
            setIsDbReady(true); 

            const authenticate = async () => {
                try {
                    let userCredential;
                    if (initialAuthToken) {
                        userCredential = await signInWithCustomToken(authService, initialAuthToken);
                    } else {
                        userCredential = await signInAnonymously(authService);
                    }
                    console.log("Autenticazione riuscita. UserID:", userCredential.user.uid);
                } catch(e) {
                     console.error("Errore nell'autenticazione iniziale:", e);
                }
            };

            authenticate();

            const unsubscribeAuth = onAuthStateChanged(authService, (user) => {
                if (user) {
                    setUserId(user.uid);
                } else {
                    setUserId(crypto.randomUUID());
                }
                setIsAuthReady(true);
            });

            return () => {
                if (unsubscribeAuth) unsubscribeAuth();
            }

        } catch (e) {
            console.error("Errore nell'inizializzazione Firebase:", e);
        }
    }, []);

    // 2. Caricamento Dati Utente
    useEffect(() => {
        if (!db || !userId || !isAuthReady || !isDbReady) return;

        const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/profile/data`);

        const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
            setPermissionError(false); 

            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserData(data);

                if (data.teamId) {
                    setTeamId(data.teamId);
                }
                
                if (data.soluzione) {
                    setTeamResponses(prev => ({...prev, ...data.soluzione}));
                }
            } else {
                // Inizializza l'utente se non esiste
                const initialData = { userId, teamId: '', teamName: '', indiziRaccolti: {}, soluzione: {} };
                setDoc(userDocRef, initialData, { merge: true }).catch(e => {
                     if (e.code === 'permission-denied') {
                         console.error("Errore: Permessi di scrittura insufficienti per i dati utente.", e);
                         setPermissionError(true);
                     }
                });
                setUserData(initialData);
            }
        }, (error) => {
            if (error.code === 'permission-denied') {
                console.error("Errore onSnapshot utente: Permessi insufficienti.", error);
                setPermissionError(true);
            } else {
                console.error("Errore onSnapshot utente:", error);
            }
        });

        return () => unsubscribeUser && unsubscribeUser();
    }, [db, userId, isAuthReady, isDbReady]);

    // 3. Caricamento Dati Team, Indizi e Leaderboard
    useEffect(() => {
        if (!db || !isDbReady) return;

        const cleanup = [];

        // Listener Team
        if (teamId) {
            const teamDocRef = doc(db, `artifacts/${appId}/public/data/teams/${teamId}`);
            const unsubscribeTeam = onSnapshot(teamDocRef, (docSnap) => {
                setPermissionError(false); 
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setTeamData(data);
                    setTeamName(data.teamName);
                    if (data.soluzione) {
                        setTeamResponses(data.soluzione);
                    }
                    setIndizi(data.indiziRaccolti || {}); 
                }
            }, (error) => {
                if (error.code === 'permission-denied') {
                    console.error("Errore onSnapshot team: Permessi insufficienti.", error);
                } else {
                    console.error("Errore onSnapshot team:", error);
                }
            });
            cleanup.push(unsubscribeTeam);
        } else {
             setTeamData(null);
             setIndizi({});
        }

        // Listener Leaderboard
        const q = query(collection(db, `artifacts/${appId}/public/data/teams`));
        const unsubscribeLeaderboard = onSnapshot(q, (querySnapshot) => {
            setPermissionError(false); 
            const teams = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const { score } = calculateScore(data);
                teams.push({ id: doc.id, ...data, score });
            });
            teams.sort((a, b) => b.score - a.score);
            setLeaderboard(teams);
        }, (error) => {
            if (error.code === 'permission-denied') {
                console.error("Errore onSnapshot leaderboard: Permessi insufficienti.", error);
            } else {
                console.error("Errore onSnapshot leaderboard:", error);
            }
        });
        cleanup.push(unsubscribeLeaderboard);


        return () => cleanup.forEach(fn => fn());

    }, [db, teamId, isDbReady]);

    // 4. Gestione Iscrizione/Creazione Team
    const handleTeamAction = useCallback(async (action, name) => {
        if (!db || !userId || !name.trim()) return;
        const normalizedTeamName = name.trim();
        const teamRef = doc(db, `artifacts/${appId}/public/data/teams`, normalizedTeamName);
        const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/profile/data`);

        try {
            if (action === 'create') {
                const teamSnap = await getDoc(teamRef);
                if (teamSnap.exists()) {
                    setMessage("Nome del team già in uso.");
                    return;
                }
                await setDoc(teamRef, { teamName: normalizedTeamName, members: [userId], soluzione: {}, indiziRaccolti: {} }, { merge: true });
                await updateDoc(userDocRef, { teamId: normalizedTeamName, teamName: normalizedTeamName });
                setTeamId(normalizedTeamName);
                setMessage(`Team '${normalizedTeamName}' creato con successo!`);
            } else if (action === 'join') {
                const teamSnap = await getDoc(teamRef);
                if (!teamSnap.exists()) {
                    setMessage("Team non trovato.");
                    return;
                }
                const currentMembers = teamSnap.data().members || [];
                if (!currentMembers.includes(userId)) {
                    await updateDoc(teamRef, { members: [...currentMembers, userId] });
                }

                await updateDoc(userDocRef, { teamId: normalizedTeamName, teamName: normalizedTeamName });
                setTeamId(normalizedTeamName);
                setMessage(`Unito al team '${normalizedTeamName}' con successo!`);
            }
        } catch (e) {
            console.error("Errore operazione team:", e);
            if (e.code === 'permission-denied') {
                setMessage("Errore: Permessi insufficienti. Verifica le regole di sicurezza di Firestore.");
                setPermissionError(true);
            } else {
                setMessage("Errore durante l'operazione del team.");
            }
        }
    }, [db, userId]);

    // 5. Gestione Scanner QR Code
    const startScanner = useCallback(() => {
        if (!window.Html5QrcodeScanner) {
            setMessage("Libreria QR Code non ancora caricata. Riprova tra un istante.");
            return;
        }
        setIsScannerActive(true);
        // Spegni lo scanner precedente se esistente
        if (scannerRef.current) {
            try {
                scannerRef.current.clear().catch(e => console.error("Errore nel clear dello scanner:", e));
            } catch (e) {
                console.error("Errore nello spegnimento dello scanner:", e);
            }
            scannerRef.current = null;
        }

        const html5QrCodeScanner = new window.Html5QrcodeScanner(
            "reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false
        );
        scannerRef.current = html5QrCodeScanner;

        const handleScanSuccess = async (decodedUrl) => {
            if (!db || !teamId || !userId) {
                setMessage("Errore: Non autenticato o non in un team.");
                return;
            }
    
            const teamDocRef = doc(db, `artifacts/${appId}/public/data/teams/${teamId}`);
            const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/profile/data`);

            try {
                // Caso 1: Scansione di un INDIZIO
                if (INDIZI_MAP[decodedUrl]) {
                    const { text, points } = INDIZI_MAP[decodedUrl];
    
                    // Aggiorna l'indizio a livello di team
                    await updateDoc(teamDocRef, {
                        [`indiziRaccolti.${decodedUrl}`]: text,
                    });
    
                    setMessage(`Indizio Sbloccato! ${text.split(': ')[1]} (+${points} punti)`);
                }
                // Caso 2: Scansione del QR CODE DI PROVA (Interazione/Selfie)
                else if (decodedUrl.includes('/prova-interazione/selfie-upload')) {
                    const interazioniCount = (userData.interazioni || 0) + 1;
                    await updateDoc(userDocRef, { interazioni: interazioniCount });
                    setMessage(`Interazione (Selfie) Registrata! (${interazioniCount} totali). Carica la prova su Instagram Stories.`);
                }
                // Caso 3: URL non riconosciuta
                else {
                    setMessage(`QR Code non riconosciuto. URL: ${decodedUrl}`);
                }
            } catch (e) {
                console.error("Errore durante l'aggiornamento dei dati dopo la scansione:", e);
                if (e.code === 'permission-denied') {
                     setMessage("Errore: Permessi insufficienti per registrare l'indizio. Verifica le regole di sicurezza.");
                     setPermissionError(true);
                } else {
                     setMessage("Errore di salvataggio dopo la scansione.");
                }
            }
            html5QrCodeScanner.clear();
            setIsScannerActive(false);
            scannerRef.current = null;
        };


        html5QrCodeScanner.render(
            (decodedText) => {
                handleScanSuccess(decodedText);
            },
            () => { /* Error logging silenced */ }
        );
    }, [db, teamId, userId, userData]);

    // 6. Salvataggio Risposte Finali
    const submitFinalSolution = useCallback(async () => {
        if (!db || !teamId || !teamData) return;
        const teamDocRef = doc(db, `artifacts/${appId}/public/data/teams/${teamId}`);
        const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/profile/data`);

        try {
            await updateDoc(teamDocRef, {
                soluzione: teamResponses,
                submissionTime: new Date().toISOString()
            });

            await updateDoc(userDocRef, { soluzione: teamResponses });

            setMessage("Soluzione finale inviata con successo!");
        } catch (e) {
            console.error("Errore salvataggio soluzione finale:", e);
            if (e.code === 'permission-denied') {
                 setMessage("Errore: Permessi insufficienti per inviare la soluzione. Verifica le regole di sicurezza.");
                 setPermissionError(true);
            } else {
                 setMessage("Errore nell'invio della soluzione finale.");
            }
        }
    }, [db, teamId, teamData, teamResponses, userId]);

    // Valutazione del proprio team
    const currentEvaluation = teamData ? calculateScore(teamData) : { score: 0, correctResponses: {} };

    return {
        userId,
        teamId,
        teamName,
        userData,
        teamData,
        teamResponses,
        setTeamResponses,
        indizi,
        message,
        setMessage,
        leaderboard,
        isAuthReady,
        isDbReady,
        isScannerActive,
        permissionError,
        currentEvaluation,
        handleTeamAction,
        startScanner,
        submitFinalSolution,
    };
};
