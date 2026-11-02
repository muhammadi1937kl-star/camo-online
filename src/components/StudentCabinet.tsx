import React from 'react';
import { UserSession, Lesson, CourseProgress, QuestionComment } from '../types';
import { ApiService } from '../services/api';
import { 
  User, 
  GraduationCap, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Play, 
  MessageSquare, 
  Sparkles, 
  Trophy,
  Award,
  Layers,
  ArrowRight,
  HelpCircle
} from 'lucide-react';

interface StudentCabinetProps {
  user: UserSession;
  lessons: Lesson[];
  onOpenLesson: (lesson: Lesson) => void;
  onBrowseCatalog: () => void;
}

export const StudentCabinet: React.FC<StudentCabinetProps> = ({
  user,
  lessons,
  onOpenLesson,
  onBrowseCatalog
}) => {
  const userProgress = ApiService.getUserProgress(user.login);
  const userComments = ApiService.getUserComments(user.login);

  // Filter lessons purchased by the user
  const purchasedLessons = lessons.filter((l) => user.lessons.includes(l.id));

  // Compute stats
  const totalPurchased = purchasedLessons.length;
  let totalWatchedParts = 0;
  let fullyCompletedCount = 0;

  purchasedLessons.forEach((l) => {
    const prog = userProgress[l.id];
    if (prog) {
      totalWatchedParts += prog.watchedParts.length;
      if (prog.watchedParts.length >= l.parts) {
        fullyCompletedCount++;
      }
    }
  });

  const overallProgressPercent = totalPurchased > 0
    ? Math.round((fullyCompletedCount / totalPurchased) * 100)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden mb-10">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-amber-500/10 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-5">
            <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-bold font-serif text-3xl flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0 border border-white/20">
              {user.userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold tracking-wider uppercase mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Личный кабинет ученика</span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
                {user.userName}
              </h1>
              <div className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-3">
                <span>Логин: <strong className="text-white font-mono">{user.login}</strong></span>
                <span>·</span>
                <span className="text-emerald-400 flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" /> Доступ активен
                </span>
                <span>·</span>
                <span className="text-slate-400">Сессия: {user.session.slice(0, 8)}...</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onBrowseCatalog}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors shadow-md shadow-amber-600/30 cursor-pointer whitespace-nowrap"
            >
              Каталог всех курсов
            </button>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-8 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3.5 border border-white/10">
            <div className="text-[11px] text-slate-400 font-medium">Куплено тренингов</div>
            <div className="font-serif text-2xl font-bold text-white mt-1">
              {totalPurchased}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3.5 border border-white/10">
            <div className="text-[11px] text-slate-400 font-medium">Изучено частей</div>
            <div className="font-serif text-2xl font-bold text-amber-400 mt-1">
              {totalWatchedParts}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3.5 border border-white/10">
            <div className="text-[11px] text-slate-400 font-medium">Завершено курсов</div>
            <div className="font-serif text-2xl font-bold text-emerald-400 mt-1">
              {fullyCompletedCount} / {totalPurchased}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3.5 border border-white/10">
            <div className="text-[11px] text-slate-400 font-medium">Общий прогресс</div>
            <div className="font-serif text-2xl font-bold text-amber-300 mt-1">
              {overallProgressPercent}%
            </div>
          </div>
        </div>
      </div>

      {/* Purchased Courses Grid */}
      <div className="mb-14">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900">
              Ваши доступные видео-тренинги
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Нажмите на курс, чтобы продолжить просмотр с того места, где остановились
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs">
            {purchasedLessons.length} доступно
          </span>
        </div>

        {purchasedLessons.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-serif text-lg font-bold text-slate-800">
              Пока нет назначенных курсов
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
              Администратор еще не открыл доступ к урокам в Google Таблице для вашего логина. Свяжитесь с поддержкой.
            </p>
            <button
              onClick={onBrowseCatalog}
              className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-amber-700 cursor-pointer"
            >
              Смотреть каталог
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {purchasedLessons.map((course) => {
              const prog = userProgress[course.id];
              const watchedCount = prog?.watchedParts.length || 0;
              const percent = Math.min(100, Math.round((watchedCount / course.parts) * 100));
              const isCompleted = percent >= 100;

              return (
                <div
                  key={course.id}
                  onClick={() => onOpenLesson(course)}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md hover:border-amber-400 transition-all cursor-pointer flex flex-col group"
                >
                  <div className="relative aspect-video bg-slate-100 overflow-hidden">
                    <img
                      src={course.img}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                      onError={(e) => {
                        // Fallback gradient if cover image fails
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                    <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[11px] font-bold">
                      Урок {course.id}
                    </div>

                    <div className="absolute top-3 right-3 px-2.5 py-0.5 rounded-md bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Куплен</span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                      <span className="font-medium text-[11px] opacity-90">{course.parts} частей</span>
                      <span className="font-bold text-amber-300">{percent}% пройдено</span>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-serif text-base font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-amber-800 transition-colors">
                        {course.title}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-2 leading-relaxed">
                        {course.desc}
                      </p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100">
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-3">
                        <div
                          className="bg-amber-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 font-medium">
                          {watchedCount} из {course.parts} частей
                        </span>
                        <span className="text-xs font-bold text-amber-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          <span>{isCompleted ? 'Повторить' : 'Продолжить'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Questions History */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/60">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-slate-900">
                История ваших вопросов автору и кураторам
              </h3>
              <p className="text-xs text-slate-500">
                Все вопросы фиксируются в Google Таблице с отметкой даты и времени
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg">
            {userComments.length} вопросов
          </span>
        </div>

        {userComments.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            <HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            Вы пока не задавали вопросов в тренингах. Вопрос можно отправить прямо под видео любого урока.
          </div>
        ) : (
          <div className="space-y-3">
            {userComments.map((comm) => (
              <div
                key={comm.id}
                className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 text-xs"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">Урок {comm.lessonId}</span>
                    <span>·</span>
                    <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-xs border border-amber-200/60">
                      Часть {comm.partNum}
                    </span>
                    <span>·</span>
                    <span>{comm.timestamp}</span>
                  </div>

                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-sm font-semibold border border-emerald-200/60">
                    ✓ В Google Таблице
                  </span>
                </div>

                <p className="text-slate-800 text-xs font-medium leading-relaxed">
                  {comm.text}
                </p>

                {comm.reply && (
                  <div className="mt-2.5 p-2.5 rounded-lg bg-amber-50 border border-amber-200/60 text-slate-700">
                    <span className="font-bold text-amber-900 block mb-0.5">
                      Ответ администратора:
                    </span>
                    {comm.reply}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
