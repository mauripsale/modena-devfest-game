import React, { useState } from 'react';
import { useFirebase } from './firebase/useFirebase.js'; // <- AGGIORNATO: Aggiunta l'estensione .js
import { Loader, Users, CheckCircle, XCircle, Trophy, AlertTriangle } from 'lucide-react';

const App = () => {
    const {
        userId,
        teamId,
        teamName,
        userData,
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
    } = useFirebase();

    // 6. Salvataggio Risposte Finali (Spostato qui per gestire l'input locale)
    const handleResponseChange = (e) => {
        setTeamResponses({
            ...teamResponses,
            [e.target.name]: e.target.value
        });
    };

    // Schermata di caricamento iniziale
    if (!isAuthReady || !isDbReady || !userData) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
                <Loader className="animate-spin mr-3 text-yellow-400" size={24} />
                Caricamento dati del Detective...
            </div>
        );
    }
    
    // Schermata di errore permessi
    if (permissionError) {
         return (
             <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4 text-center">
                 <AlertTriangle className="text-red-500 mb-4" size={48} />
                 <h1 className="text-2xl font-bold mb-2 text-red-400">Errore di Connessione al Database (Permessi)</h1>
                 <p className="text-gray-300">
                     L'applicazione non è in grado di leggere o scrivere i dati a causa di **permessi insufficienti** (regole di sicurezza Firestore).
                 </p>
                 <p className="text-sm mt-4 text-gray-500">
                     Assicurati che le regole di sicurezza di Firebase Firestore consentano la lettura e la scrittura al percorso:
                     <code className="bg-gray-700 p-1 rounded font-mono text-xs">/artifacts/&#123;appId&#125;/users/&#123;userId&#125;/profile/data</code> e <code className="bg-gray-700 p-1 rounded font-mono text-xs">/artifacts/&#123;appId&#125;/public/data/teams/&#123;teamId&#125;</code>
                 </p>
                 <p className="text-sm mt-2 text-gray-500">
                     UserID corrente: <span className="font-mono break-all">{userId}</span>
                 </p>
             </div>
         );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-4 md:p-8">
            <header className="flex flex-col md:flex-row justify-between items-center pb-6 border-b border-gray-700 mb-6">
                <h1 className="text-3xl font-bold text-yellow-400">
                    Developer Detective App
                </h1>
                <div className="text-sm mt-2 md:mt-0 bg-gray-800 p-2 rounded-lg flex items-center">
                    <span className="mr-2">UserID:</span>
                    <span className="font-mono text-xs text-blue-300 overflow-x-auto break-all">{userId}</span>
                </div>
            </header>

            {message && (
                <div 
                    className="bg-blue-600 p-3 rounded-lg mb-4 text-center font-semibold transition duration-300 cursor-pointer hover:bg-blue-700"
                    onClick={() => setMessage('')}
                >
                    {message} (Clicca per chiudere)
                </div>
            )}

            {/* Scheda Iscrizione Team */}
            {!teamId ? (
                <TeamJoinForm teamName={teamName} setTeamName={setTeamResponses} handleTeamAction={handleTeamAction} />
            ) : (
                <DetectiveDashboard
                    teamName={teamName}
                    currentEvaluation={currentEvaluation}
                    startScanner={startScanner}
                    isScannerActive={isScannerActive}
                    indizi={indizi}
                    teamResponses={teamResponses}
                    handleResponseChange={handleResponseChange}
                    submitFinalSolution={submitFinalSolution}
                    teamData={userData.teamData} 
                    leaderboard={leaderboard}
                />
            )}
        </div>
    );
};


// Componente per l'iscrizione al team (Separato per chiarezza)
const TeamJoinForm = ({ teamName, setTeamName, handleTeamAction }) => {
    const [localTeamName, setLocalTeamName] = useState('');

    return (
        <div className="max-w-md mx-auto bg-gray-800 p-6 rounded-xl shadow-2xl border border-yellow-500/50">
            <h2 className="text-xl font-semibold mb-4 text-center">Unisciti o Crea un Team</h2>
            <input
                type="text"
                placeholder="Nome del Team (es. Team Cobra)"
                value={localTeamName}
                onChange={(e) => setLocalTeamName(e.target.value)}
                className="w-full p-3 mb-4 rounded-lg bg-gray-700 text-white border border-gray-600 focus:ring-yellow-500 focus:border-yellow-500"
            />
            <div className="flex space-x-4">
                <button
                    onClick={() => handleTeamAction('create', localTeamName)}
                    className="flex-1 p-3 rounded-lg bg-yellow-600 hover:bg-yellow-700 font-bold transition duration-200 shadow-md text-gray-900"
                    disabled={!localTeamName.trim()}
                >
                    Crea Team
                </button>
                <button
                    onClick={() => handleTeamAction('join', localTeamName)}
                    className="flex-1 p-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 font-bold transition duration-200 shadow-md"
                    disabled={!localTeamName.trim()}
                >
                    Unisciti
                </button>
            </div>
        </div>
    );
};

// Componente per la Dashboard (Separato per chiarezza)
const DetectiveDashboard = ({ 
    teamName, 
    currentEvaluation, 
    startScanner, 
    isScannerActive, 
    indizi, 
    teamResponses, 
    handleResponseChange, 
    submitFinalSolution, 
    teamData, 
    leaderboard 
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Colonna 1: Azioni e Punteggio */}
            <div className="md:col-span-1 space-y-6">
                <div className="bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700">
                    <h2 className="text-2xl font-bold mb-3 flex items-center">
                        <Users className="mr-2 text-yellow-400" /> Team: {teamName}
                    </h2>
                    <p className="text-4xl font-extrabold text-green-400 mb-4">{currentEvaluation.score} Punti</p>
                    <button
                        onClick={startScanner}
                        disabled={isScannerActive}
                        className="w-full p-4 rounded-xl bg-green-600 hover:bg-green-700 font-bold transition duration-200 shadow-lg disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isScannerActive ? <Loader className="animate-spin mr-2" /> : 'Scannerizza QR Code'}
                    </button>
                    {/* Il div 'reader' è dove viene renderizzato lo scanner */}
                    <div id="reader" className="mt-4 w-full h-auto rounded-lg overflow-hidden border-4 border-gray-600"></div>
                </div>

                {/* Indizi Raccolti */}
                <div className="bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700">
                    <h3 className="text-xl font-semibold mb-3">Indizi Raccolti ({Object.keys(indizi).length})</h3>
                    <ul className="space-y-2 text-sm max-h-60 overflow-y-auto">
                        {Object.keys(indizi).length === 0 ? (
                            <p className="text-gray-400">Inizia a scansionare i QR Code dei Testimoni!</p>
                        ) : (
                            Object.values(indizi).map((indizioText, index) => (
                                <li key={index} className="p-2 bg-gray-700 rounded-lg border-l-4 border-yellow-500">
                                    {/* Mostra solo il contenuto dell'indizio, non l'intestazione tipo "Indizio 1A: " */}
                                    {indizioText.split(': ')[1] || indizioText}
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            </div>

            {/* Colonna 2: Soluzione Finale */}
            <div className="md:col-span-2 bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700">
                <h2 className="text-2xl font-bold mb-6 text-yellow-400">Risoluzione del Mistero (Le 5 W)</h2>

                <div className="space-y-4">
                    {Object.keys(teamResponses).map((key) => (
                        <div key={key} className="relative">
                            <label className="block text-gray-300 mb-1 capitalize">
                                {key === 'tipo' && '1. Tipologia di Bug'}
                                {key === 'file' && '2. File Specifico Impattato'}
                                {key === 'team' && '3. Team Colpevole'}
                                {key === 'risolutore' && '4. Chi ha Scoperto e Rimosso il Bug'}
                                {key === 'metodo' && '5. Metodo/Fix Utilizzato'}
                            </label>
                            <input
                                type="text"
                                name={key}
                                value={teamResponses[key]}
                                onChange={handleResponseChange}
                                placeholder={`Inserisci la risposta per la W: ${key}`}
                                className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 pr-12"
                            />
                            {/* Mostra lo stato di correzione solo dopo l'invio finale */}
                            {teamData && teamData.submissionTime && (
                                <div className="absolute right-3 top-9 flex items-center h-full">
                                    {currentEvaluation.correctResponses[key] ? (
                                        <CheckCircle className="text-green-500" />
                                    ) : (
                                        <XCircle className="text-red-500" />
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <button
                    onClick={submitFinalSolution}
                    className="w-full mt-8 p-4 rounded-xl bg-yellow-600 hover:bg-yellow-700 font-bold text-gray-900 transition duration-200 shadow-lg"
                >
                    Invia Soluzione Finale
                </button>

                {teamData && teamData.submissionTime && (
                    <p className="mt-4 text-center text-sm text-gray-400">
                        Soluzione inviata il: {new Date(teamData.submissionTime).toLocaleTimeString('it-IT')}
                        <span className="block text-xl font-bold mt-1" style={{ color: currentEvaluation.correctCount === 5 ? '#34D399' : '#F87171' }}>
                            Risposte Corrette: {currentEvaluation.correctCount} / 5
                        </span>
                    </p>
                )}
            </div>

            {/* Colonna 3: Leaderboard (Mobile: si sposta in basso) */}
            <div className="md:col-span-3 lg:col-span-3 bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700 mt-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center text-yellow-400">
                    <Trophy className="mr-2" /> Classifica (Leaderboard)
                </h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead>
                            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                                <th className="p-3">#</th>
                                <th className="p-3">Team</th>
                                <th className="p-3 text-right">Punti Totali</th>
                                <th className="p-3 text-center">Invio Finale</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {leaderboard.map((team, index) => (
                                <tr key={team.id} className={team.id === teamData?.teamId ? 'bg-yellow-900/50' : 'hover:bg-gray-700 transition duration-150'}>
                                    <td className="p-3 font-extrabold text-xl text-yellow-400">{index + 1}</td>
                                    <td className="p-3 font-semibold">{team.teamName}</td>
                                    <td className="p-3 text-right text-lg font-bold">{team.score}</td>
                                    <td className="p-3 text-center text-sm">
                                        {team.submissionTime ? new Date(team.submissionTime).toLocaleTimeString('it-IT') : 'In corso...'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};

export default App;
