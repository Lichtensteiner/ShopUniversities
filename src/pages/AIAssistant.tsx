import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, Upload, Send, CheckCircle, AlertCircle, Loader2, Image as ImageIcon, FileText, X } from 'lucide-react';
import { createNotification } from '../services/NotificationService';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function AIAssistant() {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [suggestedScore, setSuggestedScore] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [students, setStudents] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);

  // Fetch students for the dropdown
  React.useEffect(() => {
    const fetchStudents = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'élève'));
        const snap = await getDocs(q);
        setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching students:", error);
      }
    };
    fetchStudents();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const analyzeWork = async () => {
    if (!selectedFile || !previewUrl) return;
    setIsAnalyzing(true);
    setAiFeedback(null);
    setSuggestedScore(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const base64Data = previewUrl.split(',')[1];

      const prompt = `
        Tu es un assistant pédagogique expert. Analyse ce travail d'élève (image).
        1. Identifie le sujet du travail.
        2. Liste les points forts.
        3. Liste les points à améliorer.
        4. Suggère une note sur 20.
        5. Rédige un court message d'encouragement personnalisé pour l'élève.
        Réponds en français de manière structurée avec des titres clairs.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { data: base64Data, mimeType: selectedFile.type } }
            ]
          }
        ]
      });

      const result = response.text;
      setAiFeedback(result);
      
      // Extract score if possible (simple regex)
      const scoreMatch = result.match(/(\d{1,2})\/20/);
      if (scoreMatch) setSuggestedScore(scoreMatch[0]);

    } catch (error) {
      console.error("AI Analysis error:", error);
      alert("Erreur lors de l'analyse par l'IA. Vérifiez votre connexion ou la clé API.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sendFeedback = async () => {
    if (!selectedStudentId || !aiFeedback) return;
    setIsSending(true);
    try {
      await createNotification({
        user_id: selectedStudentId,
        title: "Nouveau Feedback IA",
        message: `Votre enseignant a partagé un feedback IA sur votre travail. Note suggérée : ${suggestedScore || 'N/A'}`,
        content: aiFeedback,
        type: 'success',
        targetTab: 'student_dashboard'
      });
      alert("Feedback envoyé avec succès !");
      setAiFeedback(null);
      setSuggestedScore(null);
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error("Error sending feedback:", error);
      alert("Erreur lors de l'envoi du feedback.");
    } finally {
      setIsSending(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setAiFeedback(null);
    setSuggestedScore(null);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl">
          <Sparkles className="text-indigo-600 dark:text-indigo-400" size={32} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('ai_grading_title')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{t('ai_grading_desc')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Upload size={20} className="text-indigo-600" />
                {t('upload_work')}
              </h2>
              {previewUrl && (
                <button onClick={clearSelection} className="text-gray-400 hover:text-red-500">
                  <X size={20} />
                </button>
              )}
            </div>
            
            <label className="block w-full aspect-video border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors cursor-pointer overflow-hidden relative group">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                  <ImageIcon size={48} className="mb-2" />
                  <span className="text-sm">Cliquez pour sélectionner une photo</span>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
            </label>

            <button
              onClick={analyzeWork}
              disabled={!selectedFile || isAnalyzing}
              className="w-full mt-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  {t('analyzing')}
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  {t('analyze_with_gemini')}
                </>
              )}
            </button>
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
            <h3 className="text-sm font-bold text-indigo-800 dark:text-indigo-300 mb-2 flex items-center gap-2">
              <AlertCircle size={16} />
              Conseil d'utilisation
            </h3>
            <p className="text-xs text-indigo-700 dark:text-indigo-400 leading-relaxed">
              Prenez une photo claire du travail de l'élève. L'IA peut analyser l'écriture manuscrite, les dessins et les schémas pour fournir une évaluation détaillée.
            </p>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {aiFeedback ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <CheckCircle size={20} className="text-green-500" />
                  {t('ai_feedback')}
                </h2>
                {suggestedScore && (
                  <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-bold">
                    {t('ai_score')}: {suggestedScore}
                  </div>
                )}
              </div>
              
              <div className="prose dark:prose-invert max-w-none text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap mb-6 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 max-h-[400px] overflow-y-auto custom-scrollbar">
                {aiFeedback}
              </div>

              <div className="pt-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sélectionner l'élève destinataire
                  </label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Choisir un élève...</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.prenom} {s.nom} ({s.classe || 'N/A'})</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={sendFeedback}
                  disabled={!selectedStudentId || isSending}
                  className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
                >
                  {isSending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                  {t('send_to_student')}
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-8">
              <div className="p-6 bg-white dark:bg-gray-800 rounded-full shadow-sm mb-4">
                <FileText size={48} className="opacity-20" />
              </div>
              <p className="text-center max-w-xs">Les résultats de l'analyse apparaîtront ici après avoir utilisé Gemini.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
