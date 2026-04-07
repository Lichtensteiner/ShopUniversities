import React, { useState } from 'react';
import { Code, Database, Smartphone, Server, Copy, CheckCircle2 } from 'lucide-react';

export default function IntegrationCode() {
  const [activeSection, setActiveSection] = useState('architecture');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const sections = [
    { id: 'architecture', label: 'Architecture Flutter', icon: Smartphone },
    { id: 'firebase', label: 'Structure Firebase', icon: Database },
    { id: 'flutterCode', label: 'Code Flutter (Présence)', icon: Code },
    { id: 'cloudFunctions', label: 'Cloud Functions (Rapports)', icon: Server },
  ];

  const content = {
    architecture: `lib/
├── main.dart
├── core/
│   ├── constants/
│   │   ├── app_colors.dart
│   │   └── app_strings.dart
│   ├── services/
│   │   ├── auth_service.dart
│   │   ├── biometric_service.dart
│   │   └── firestore_service.dart
│   └── utils/
│       └── date_utils.dart
├── models/
│   ├── user_model.dart
│   ├── attendance_model.dart
│   └── report_model.dart
├── views/
│   ├── auth/
│   │   └── login_screen.dart
│   ├── admin/
│   │   ├── admin_dashboard_screen.dart
│   │   ├── users_list_screen.dart
│   │   └── reports_screen.dart
│   └── user/
│       ├── scan_fingerprint_screen.dart
│       └── user_profile_screen.dart
└── widgets/
    ├── custom_button.dart
    ├── stat_card.dart
    └── attendance_list_tile.dart`,

    firebase: `// Collection: users
{
  "id": "string (uid)",
  "nom": "string",
  "prenom": "string",
  "role": "string (élève | enseignant | personnel administratif)",
  "classe": "string (nullable)",
  "biometric_id": "string",
  "created_at": "timestamp"
}

// Collection: attendance
{
  "id": "string (auto-generated)",
  "user_id": "string (ref to users)",
  "date": "string (YYYY-MM-DD)",
  "heure_arrivee": "timestamp",
  "heure_depart": "timestamp (nullable)",
  "statut": "string (Présent | Retard | Absent)"
}

// Collection: reports
{
  "id": "string (auto-generated)",
  "user_id": "string (ref to users)",
  "semaine": "string (ex: Semaine 42)",
  "date_debut": "timestamp",
  "date_fin": "timestamp",
  "resume": {
    "jours_presence": "number",
    "retards": "number",
    "absences": "number"
  },
  "tableau_presence": [
    {
      "jour": "string",
      "date": "string",
      "heure_arrivee": "string",
      "heure_depart": "string",
      "statut": "string"
    }
  ],
  "analyse": "string",
  "created_at": "timestamp"
}`,

    flutterCode: `import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:local_auth/local_auth.dart';

class BiometricService {
  final LocalAuthentication auth = LocalAuthentication();
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  // 1. Authentification biométrique
  Future<bool> authenticateUser() async {
    try {
      bool canCheckBiometrics = await auth.canCheckBiometrics;
      if (!canCheckBiometrics) return false;

      return await auth.authenticate(
        localizedReason: 'Veuillez scanner votre empreinte pour enregistrer votre présence',
        options: const AuthenticationOptions(
          biometricOnly: true,
          stickyAuth: true,
        ),
      );
    } catch (e) {
      print("Erreur biométrique: $e");
      return false;
    }
  }

  // 2. Enregistrement de la présence dans Firestore
  Future<void> logAttendance(String userId) async {
    bool isAuthenticated = await authenticateUser();
    
    if (isAuthenticated) {
      DateTime now = DateTime.now();
      String todayDate = "\${now.year}-\${now.month.toString().padLeft(2, '0')}-\${now.day.toString().padLeft(2, '0')}";
      
      // Définir l'heure limite pour être considéré "À l'heure" (ex: 07:30)
      DateTime onTimeLimit = DateTime(now.year, now.month, now.day, 7, 30);
      String status = now.isAfter(onTimeLimit) ? 'Retard' : 'Présent';

      // Vérifier si une entrée existe déjà pour aujourd'hui
      QuerySnapshot existingRecord = await _db
          .collection('attendance')
          .where('user_id', isEqualTo: userId)
          .where('date', isEqualTo: todayDate)
          .get();

      if (existingRecord.docs.isEmpty) {
        // Enregistrer l'arrivée
        await _db.collection('attendance').add({
          'user_id': userId,
          'date': todayDate,
          'heure_arrivee': FieldValue.serverTimestamp(),
          'heure_depart': null,
          'statut': status,
        });
        print("Arrivée enregistrée avec succès ($status)");
      } else {
        // Enregistrer le départ (mise à jour du document existant)
        String docId = existingRecord.docs.first.id;
        await _db.collection('attendance').doc(docId).update({
          'heure_depart': FieldValue.serverTimestamp(),
        });
        print("Départ enregistré avec succès");
      }
    }
  }
}`,

    cloudFunctions: `const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

// S'exécute tous les dimanches à 23h59
exports.generateWeeklyReports = functions.pubsub.schedule('59 23 * * 0')
  .timeZone('Europe/Paris')
  .onRun(async (context) => {
    const today = new Date();
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - 6); // Lundi de la semaine courante
    
    const startDateStr = lastMonday.toISOString().split('T')[0];
    const endDateStr = today.toISOString().split('T')[0];
    
    // Récupérer tous les utilisateurs
    const usersSnapshot = await db.collection('users').get();
    
    const batch = db.batch();
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      // Récupérer les présences de la semaine pour cet utilisateur
      const attendanceSnapshot = await db.collection('attendance')
        .where('user_id', '==', userId)
        .where('date', '>=', startDateStr)
        .where('date', '<=', endDateStr)
        .get();
        
      let joursPresence = 0;
      let retards = 0;
      let absences = 5 - attendanceSnapshot.size; // Supposant 5 jours ouvrés
      let tableauPresence = [];
      
      attendanceSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.statut === 'Présent') joursPresence++;
        if (data.statut === 'Retard') retards++;
        
        tableauPresence.push({
          jour: getDayName(data.date),
          date: data.date,
          heure_arrivee: formatTime(data.heure_arrivee),
          heure_depart: formatTime(data.heure_depart),
          statut: data.statut
        });
      });
      
      // Génération de l'analyse
      let analyse = \`Durant cette semaine, l'utilisateur a été présent \${joursPresence + retards} jours sur 5.\`;
      if (retards > 0) analyse += \` \${retards} retard(s) enregistré(s).\`;
      if (absences > 0) analyse += \` Attention, \${absences} absence(s) constatée(s).\`;
      else analyse += \` La ponctualité générale est jugée satisfaisante.\`;
      
      // Créer le rapport
      const reportRef = db.collection('reports').doc();
      batch.set(reportRef, {
        user_id: userId,
        semaine: \`Semaine du \${startDateStr} au \${endDateStr}\`,
        date_debut: admin.firestore.Timestamp.fromDate(lastMonday),
        date_fin: admin.firestore.Timestamp.fromDate(today),
        resume: { jours_presence: joursPresence + retards, retards, absences },
        tableau_presence: tableauPresence,
        analyse: analyse,
        created_at: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    await batch.commit();
    console.log('Rapports hebdomadaires générés avec succès.');
    return null;
});

// Fonctions utilitaires
function getDayName(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', { weekday: 'long' });
}

function formatTime(timestamp) {
  if (!timestamp) return '-';
  const date = timestamp.toDate();
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute:'2-digit' });
}`
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Intégration & Code</h1>
          <p className="text-sm text-gray-500 mt-1">Architecture Flutter, modèles de données et Cloud Functions</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Navigation */}
        <div className="w-full lg:w-64 space-y-2">
          {sections.map(section => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-indigo-200' : 'text-gray-400'} />
                {section.label}
              </button>
            );
          })}
        </div>

        {/* Code Display */}
        <div className="flex-1 bg-[#1e1e1e] rounded-2xl shadow-xl overflow-hidden border border-gray-800 flex flex-col h-[calc(100vh-12rem)]">
          <div className="flex items-center justify-between px-4 py-3 bg-[#2d2d2d] border-b border-gray-700">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            </div>
            <span className="text-xs text-gray-400 font-mono">
              {sections.find(s => s.id === activeSection)?.label}
            </span>
            <button 
              onClick={() => handleCopy(content[activeSection as keyof typeof content], activeSection)}
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-medium bg-white/5 px-2.5 py-1.5 rounded-lg"
            >
              {copiedSection === activeSection ? (
                <><CheckCircle2 size={14} className="text-emerald-400" /> Copié</>
              ) : (
                <><Copy size={14} /> Copier</>
              )}
            </button>
          </div>
          <div className="p-4 overflow-y-auto flex-1">
            <pre className="text-sm font-mono text-gray-300 leading-relaxed">
              <code>{content[activeSection as keyof typeof content]}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
