import React from 'react';
import { UserSession } from '../types';
import { GraduationCap, ShieldCheck, User, LogOut, BookOpen, MessageSquareText, KeyRound } from 'lucide-react';

interface NavbarProps {
  user: UserSession | null;
  activeTab: 'catalog' | 'cabinet' | 'security' | 'scriptCode';
  onSelectTab: (tab: 'catalog' | 'cabinet' | 'security' | 'scriptCode') => void;
  onOpenLogin: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  onSelectTab,
  onOpenLogin,
  onLogout
}) => {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div 
          onClick={() => onSelectTab('catalog')} 
          className="flex items-center gap-3 cursor-pointer select-none shrink-0 group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform duration-200">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="font-serif text-lg font-bold tracking-tight text-slate-900 group-hover:text-amber-700 transition-colors">
              Онлайн Школа <span className="text-amber-600 font-normal">САМО</span>
            </div>
            <div className="text-[11px] font-medium text-slate-500 tracking-wide uppercase">
              Саидмурод Давлатов
            </div>
          </div>
        </div>

        {/* Zone 2: Single-line Navigation links (Top Bar Contract) */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <button
            onClick={() => onSelectTab('catalog')}
            className={`whitespace-nowrap transition-colors pb-0.5 border-b-2 cursor-pointer ${
              activeTab === 'catalog'
                ? 'border-amber-600 text-slate-950 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Каталог тренингов
          </button>

          {user && (
            <button
              onClick={() => onSelectTab('cabinet')}
              className={`whitespace-nowrap transition-colors pb-0.5 border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'cabinet'
                  ? 'border-amber-600 text-slate-950 font-semibold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              <span>Личный кабинет</span>
              <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-sm">
                {user.lessons.length}
              </span>
            </button>
          )}

          <button
            onClick={() => onSelectTab('security')}
            className={`whitespace-nowrap transition-colors pb-0.5 border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'security'
                ? 'border-amber-600 text-slate-950 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Защита и доступ</span>
          </button>

          <button
            onClick={() => onSelectTab('scriptCode')}
            className={`whitespace-nowrap transition-colors pb-0.5 border-b-2 cursor-pointer text-slate-500 hover:text-slate-900 text-xs`}
            title="Инструкция и код Google Apps Script"
          >
            Код Code.gs
          </button>
        </nav>

        {/* Zone 3: Primary Action / User Profile */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => onSelectTab('cabinet')}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-100/80 hover:bg-slate-200/80 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {user.userName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-semibold text-slate-900 leading-tight max-w-[120px] truncate">
                    {user.userName}
                  </div>
                  <div className="text-[10px] text-emerald-600 font-medium leading-none mt-0.5">
                    ● Ученик (Активен)
                  </div>
                </div>
              </button>

              <button
                onClick={onLogout}
                className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title="Выйти из аккаунта"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-semibold tracking-wide uppercase transition-all shadow-sm shadow-amber-600/25 cursor-pointer whitespace-nowrap"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Войти по паролю</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
