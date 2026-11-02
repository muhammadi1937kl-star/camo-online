import React, { useState } from 'react';
import { Lesson, UserSession, CourseProgress } from '../types';
import { ApiService } from '../services/api';
import { 
  Play, 
  Lock, 
  CheckCircle2, 
  Clock, 
  BookOpen, 
  Sparkles, 
  ShieldCheck, 
  KeyRound,
  Search,
  SlidersHorizontal,
  GraduationCap
} from 'lucide-react';

interface CourseCatalogProps {
  lessons: Lesson[];
  user: UserSession | null;
  onOpenLesson: (lesson: Lesson) => void;
  onOpenLogin: () => void;
}

export const CourseCatalog: React.FC<CourseCatalogProps> = ({
  lessons,
  user,
  onOpenLesson,
  onOpenLogin
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const userProgress = user ? ApiService.getUserProgress(user.login) : {};

  // Extract unique categories
  const categories = ['all', ...Array.from(new Set(lessons.map((l) => l.category || 'Общее')))];

  // Filter lessons
  const filteredLessons = lessons.filter((lesson) => {
    const matchesCategory =
      selectedCategory === 'all' ||
      (selectedCategory === 'purchased' && user?.lessons.includes(lesson.id)) ||
      lesson.category === selectedCategory;

    const matchesSearch =
      searchQuery.trim() === '' ||
      lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lesson.desc.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="pb-20">
      {/* Light Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-amber-50/70 via-white to-slate-50 border-b border-slate-200/80 pt-12 pb-16 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100/80 border border-amber-300/60 text-amber-900 text-xs font-semibold tracking-wide uppercase mb-6 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            <span>Официальная платформа обучения</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl lg:text-5xl font-bold text-slate-900 tracking-tight leading-tight">
            Саидмурод Давлатов <br className="hidden sm:inline" />
            <span className="text-amber-700 font-serif italic">Онлайн-Школа Успеха</span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Практические видео-тренинги по управлению финансами, созданию системного бизнеса, лидерству и приумножению капитала. Доступ выдается через базу Google Таблиц.
          </p>

          {!user && (
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs uppercase tracking-wider shadow-md shadow-amber-600/20 transition-all cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>Войти по выданному паролю</span>
              </button>
            </div>
          )}

          {user && (
            <div className="mt-6 inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                Вы вошли как <strong>{user.userName}</strong> · Доступно тренингов: {user.lessons.length} из {lessons.length}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Filter and Search Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              Все тренинги ({lessons.length})
            </button>

            {user && (
              <button
                onClick={() => setSelectedCategory('purchased')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === 'purchased'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 border border-amber-200/80 hover:bg-amber-100'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Мои купленные ({user.lessons.length})</span>
              </button>
            )}

            {categories
              .filter((c) => c !== 'all' && c !== 'purchased')
              .map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию или теме..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500/20"
            />
          </div>
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 mt-8">
          {filteredLessons.map((lesson) => {
            const hasAccess = user ? user.lessons.includes(lesson.id) : false;
            const prog = user ? userProgress[lesson.id] : undefined;
            const watchedCount = prog?.watchedParts.length || 0;
            const percent = Math.min(100, Math.round((watchedCount / lesson.parts) * 100));

            return (
              <div
                key={lesson.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-lg hover:border-amber-400/80 transition-all duration-200 flex flex-col group"
              >
                {/* Thumbnail Image Container */}
                <div className="relative aspect-video bg-slate-100 overflow-hidden">
                  <img
                    src={lesson.img}
                    alt={lesson.title}
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

                  {/* Badges */}
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-xs text-white text-[11px] font-bold tracking-wide">
                    Урок {lesson.id}
                  </div>

                  {hasAccess ? (
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Доступ открыт</span>
                    </div>
                  ) : (
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-slate-900/80 backdrop-blur-xs text-amber-200 text-[11px] font-bold flex items-center gap-1 border border-white/10">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Доступ по паролю</span>
                    </div>
                  )}

                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                    <span className="text-[11px] font-medium opacity-90">{lesson.parts} частей</span>
                    <span className="text-[11px] text-slate-300">{lesson.durationApprox || 'Видео-курс'}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider mb-1.5">
                      {lesson.category || 'Программа'}
                    </div>

                    <h3 className="font-serif text-base font-bold text-slate-900 group-hover:text-amber-800 transition-colors line-clamp-2 leading-snug">
                      {lesson.title}
                    </h3>

                    <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                      {lesson.desc}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100">
                    {/* Progress bar if user has started */}
                    {hasAccess && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                          <span>Прогресс: {watchedCount} из {lesson.parts} частей</span>
                          <span className="font-bold text-amber-700">{percent}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-amber-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Action Button */}
                    {hasAccess ? (
                      <button
                        onClick={() => onOpenLesson(lesson)}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-semibold text-xs tracking-wide shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Смотреть тренинг</span>
                      </button>
                    ) : user ? (
                      <button
                        onClick={() => onOpenLesson(lesson)}
                        className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Подробнее о тренинге</span>
                      </button>
                    ) : (
                      <button
                        onClick={onOpenLogin}
                        className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                        <span>Войти для просмотра</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredLessons.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 mt-8">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="font-serif text-base font-bold text-slate-800">
              По вашему запросу ничего не найдено
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Попробуйте сбросить фильтры или изменить поисковый запрос
            </p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Сбросить фильтры
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
