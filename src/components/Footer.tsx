import React from 'react';
import { Mail, Phone, MapPin, Code, Info, Laptop } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-8 py-8 px-4 sm:px-6 lg:px-8 rounded-t-xl shadow-sm transition-colors duration-200 print:hidden">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        
        {/* Section 1: About Ludo_Consulting */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Laptop className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Ludo_Consulting
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed text-justify">
            Ludo_Consulting est une entreprise spécialisée dans le développement de logiciels informatiques sur mesure. 
            Notre mission est d'accompagner les établissements et les entreprises dans leur transformation digitale 
            en proposant des solutions innovantes, fiables et adaptées à leurs besoins spécifiques.
          </p>
        </div>

        {/* Section 2: About the Application */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Fonctionnement de l'Application
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed text-justify">
            Cette application est conçue pour simplifier et moderniser la gestion scolaire. 
            Elle intègre des fonctionnalités avancées telles que la reconnaissance biométrique, 
            le suivi des présences en temps réel, la gestion des emplois du temps, un système de messagerie, 
            et la communication fluide entre l'administration, les enseignants et les élèves.
          </p>
        </div>

        {/* Section 3: Contact Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Contact & Informations</h3>
          <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
            <li className="flex items-start gap-3">
              <Code className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-gray-900 dark:text-gray-100">Développé par :</span> Ludo_Consulting<br/>
                <span className="text-xs text-gray-500 dark:text-gray-400">Développeur des Logiciels Informatiques</span>
              </div>
            </li>
            <li className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <a href="mailto:ludo.consulting3@gmail.com" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                ludo.consulting3@gmail.com
              </a>
            </li>
            <li className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <a href="tel:+241062641120" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">+241 062-641-120</a>
                <span className="hidden sm:inline">/</span>
                <a href="tel:+241077022306" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">077-022-306</a>
              </div>
            </li>
            <li className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Libreville / Gabon</span>
            </li>
          </ul>
        </div>
      </div>
      
      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          &copy; {new Date().getFullYear()} Ludo_Consulting. Tous droits réservés.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Version 1.0.0
        </p>
      </div>
    </footer>
  );
}
