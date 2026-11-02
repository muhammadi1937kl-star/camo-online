/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UserSession, Lesson, CourseProgress } from './types';
import { INITIAL_LESSONS } from './data/courses';
import { ApiService } from './services/api';
import { Navbar } from './components/Navbar';
import { CourseCatalog } from './components/CourseCatalog';
import { LessonDetail } from './components/LessonDetail';
import { StudentCabinet } from './components/StudentCabinet';
import { LoginModal } from './components/LoginModal';
import { SecurityGuideModal } from './components/SecurityGuideModal';
import { CodeViewerModal } from './components/CodeViewerModal';
import { 
  ShieldCheck, 
  KeyRound, 
  Lock, 
  HelpCircle, 
  ExternalLink, 
  CheckCircle2,
  GraduationCap
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>(INITIAL_LESSONS);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [activeTab, setActiveTab] = useState<'catalog' | 'cabinet' | 'security' | 'scriptCode'>('catalog');
  
  // Modals
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [accessDeniedToast, setAccessDeniedToast] = useState<string | null>(null);

  // Load user session on mount
  useEffect(() => {
    const saved = ApiService.getCurrentUser();
    if (saved) {
      setUser(saved);
    }

    // Sync real parts count from Google Sheets
    ApiService.getLessonsMeta().then((res) => {
      if (res && res.ok && Array.isArray(res.lessons)) {
        setLessons((prev) =>
          prev.map((les) => {
            const found = res.lessons?.find((m) => m.lessonId === les.id);
            if (found && found.partsCount > 0) {
              return { ...les, parts: found.partsCount };
            }
            return les;
          })
        );
      }
    });
  }, []);

  // Heartbeat ping every 60s to maintain session & report active status
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      ApiService.heartbeat(user.login, user.session);
    }, 60000);
    return () => clearInterval(interval);
  }, [user]);

  // Tab navigation
  const handleSelectTab = (tab: 'catalog' | 'cabinet' | 'security' | 'scriptCode') => {
    if (tab === 'security') {
      setIsSecurityModalOpen(true);
      return;
    }
    if (tab === 'scriptCode') {
      setIsScriptModalOpen(true);
      return;
    }
    if (tab === 'cabinet' && !user) {
      setIsLoginModalOpen(true);
      return;
    }
    setSelectedLesson(null);
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (newUser: UserSession) => {
    setUser(newUser);
    setIsLoginModalOpen(false);
    if (selectedLesson && !newUser.lessons.includes(selectedLesson.id)) {
      setAccessDeniedToast(`Внимание: Урок ${selectedLesson.id} не открыт в вашей учетной записи.`);
    }
  };

  const handleLogout = () => {
    ApiService.saveCurrentUser(null);
    setUser(null);
    setSelectedLesson(null);
    setActiveTab('catalog');
  };

  const handleOpenLesson = (lesson: Lesson) => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }

    if (!user.lessons.includes(lesson.id)) {
      setAccessDeniedToast(`Урок ${lesson.id} «${lesson.title}» не входит в ваш купленный пакет. Обратитесь к администратору для открытия доступа.`);
      setTimeout(() => setAccessDeniedToast(null), 6000);
      return;
    }

    setSelectedLesson(lesson);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 selection:bg-amber-100 selection:text-amber-900 font-sans">
      {/* Top Navigation */}
      <Navbar
        user={user}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Access Denied Toast */}
      {accessDeniedToast && (
        <div className="fixed top-20 right-4 z-50 max-w-md p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 shadow-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs font-medium leading-relaxed flex-1">
            {accessDeniedToast}
          </div>
          <button
            onClick={() => setAccessDeniedToast(null)}
            className="text-amber-600 hover:text-amber-800 p-0.5 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        {selectedLesson ? (
          <LessonDetail
            lesson={selectedLesson}
            user={user!}
            onBack={() => setSelectedLesson(null)}
            onUpdateProgress={() => {}}
          />
        ) : activeTab === 'cabinet' && user ? (
          <StudentCabinet
            user={user}
            lessons={lessons}
            onOpenLesson={handleOpenLesson}
            onBrowseCatalog={() => {
              setActiveTab('catalog');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : (
          <CourseCatalog
            lessons={lessons}
            user={user}
            onOpenLesson={handleOpenLesson}
            onOpenLogin={() => setIsLoginModalOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-10 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-serif text-slate-800 font-bold text-sm">
            <GraduationCap className="w-4 h-4 text-amber-600" />
            <span>Онлайн Школа Саидмурода Давлатова — САМО</span>
          </div>

          <div className="flex items-center gap-5 text-slate-500">
            <button
              onClick={() => setIsSecurityModalOpen(true)}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Защита контента
            </button>
            <button
              onClick={() => setIsScriptModalOpen(true)}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Google Apps Script Code
            </button>
            <span>База данных: Google Sheets</span>
          </div>

          <div className="text-slate-400">
            © {new Date().getFullYear()} Все права защищены. Защита от копирования включена.
          </div>
        </div>
      </footer>

      {/* Modals */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />

      <SecurityGuideModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
      />

      <CodeViewerModal
        isOpen={isScriptModalOpen}
        onClose={() => setIsScriptModalOpen(false)}
      />
    </div>
  );
}
