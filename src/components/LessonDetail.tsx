import React, { useState, useEffect } from 'react';
import { Lesson, UserSession, CourseProgress } from '../types';
import { ApiService } from '../services/api';
import { SecureVideoPlayer } from './SecureVideoPlayer';
import { CommentsSection } from './CommentsSection';
import { 
  ArrowLeft, 
  Play, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Lock, 
  Sparkles,
  Layers,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

interface LessonDetailProps {
  lesson: Lesson;
  user: UserSession;
  onBack: () => void;
  onUpdateProgress: (progress: CourseProgress) => void;
}

export const LessonDetail: React.FC<LessonDetailProps> = ({
  lesson,
  user,
  onBack,
  onUpdateProgress
}) => {
  const [activePart, setActivePart] = useState<number>(1);
  const [totalParts, setTotalParts] = useState<number>(lesson.parts || 1);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [loadingPart, setLoadingPart] = useState<boolean>(true);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState<CourseProgress | null>(null);

  // Check access to lesson
  const hasAccess = user.lessons.includes(lesson.id);

  // Load progress
  useEffect(() => {
    const allProgress = ApiService.getUserProgress(user.login);
    const lessonProg = allProgress[lesson.id];
    if (lessonProg) {
      setProgress(lessonProg);
      if (lessonProg.lastWatchedPart && lessonProg.lastWatchedPart <= (lesson.parts || 1)) {
        setActivePart(lessonProg.lastWatchedPart);
      }
    }
  }, [lesson.id, user.login, lesson.parts]);

  // Load parts count & current part video ID
  useEffect(() => {
    let isCancelled = false;
    setLoadingPart(true);
    setErrorStatus(null);

    async function loadVideo() {
      // 1. Check lesson
      const checkRes = await ApiService.checkLesson(user.login, user.session, lesson.id);
      if (isCancelled) return;

      if (checkRes.sessionExpired) {
        setErrorStatus('Сессия устарела. Вход выполнен с другого устройства.');
        setLoadingPart(false);
        return;
      }

      if (checkRes.denied) {
        setErrorStatus('Доступ к этому уроку закрыт администратором.');
        setLoadingPart(false);
        return;
      }

      if (checkRes.partsCount && checkRes.partsCount > 0) {
        setTotalParts(checkRes.partsCount);
      }

      // 2. Get Part Video ID
      const partRes = await ApiService.getPart(user.login, user.session, lesson.id, activePart);
      if (isCancelled) return;

      if (partRes.ok && partRes.videoId) {
        setCurrentVideoId(partRes.videoId);
      } else {
        // Fallback for demonstration if drive ID is not populated yet
        setCurrentVideoId(`1SAMPLE_DRIVE_ID_LESSON_${lesson.id}_PART_${activePart}`);
      }
      setLoadingPart(false);
    }

    loadVideo();

    return () => {
      isCancelled = true;
    };
  }, [lesson.id, activePart, user.login, user.session]);

  const handlePartComplete = () => {
    const updated = ApiService.savePartWatched(user.login, lesson.id, activePart, totalParts);
    setProgress(updated);
    onUpdateProgress(updated);
  };

  const handleNextPart = () => {
    if (activePart < totalParts) {
      setActivePart(activePart + 1);
    }
  };

  const isPartWatched = (partNum: number) => {
    return progress?.watchedParts.includes(partNum) || false;
  };

  const completionPercent = progress
    ? Math.round((progress.watchedParts.length / totalParts) * 100)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-200">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-amber-700 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Назад к курсам</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500 font-medium hidden sm:block">
            Ученик: <span className="text-slate-800 font-semibold">{user.userName}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Сессия защищена</span>
          </div>
        </div>
      </div>

      {/* Course Title Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-medium text-amber-700 mb-2">
              <span>{lesson.category || 'Видео-тренинг'}</span>
              <span>·</span>
              <span>Урок {lesson.id}</span>
              <span>·</span>
              <span>Всего {totalParts} частей</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
              {lesson.title}
            </h1>
            <p className="text-sm text-slate-600 mt-2.5 leading-relaxed">
              {lesson.desc}
            </p>
          </div>

          {/* Progress gauge card */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 shrink-0 min-w-[200px] text-center">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Прогресс урока
            </div>
            <div className="font-serif text-2xl font-bold text-amber-600">
              {completionPercent}%
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 mt-2 overflow-hidden">
              <div 
                className="bg-amber-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-500 mt-1.5">
              Изучено {progress?.watchedParts.length || 0} из {totalParts} частей
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Playlist + Video Player */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Playlist of Parts */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs order-2 lg:order-1">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              <h3 className="font-serif text-sm font-bold text-slate-900">
                Содержание тренинга
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {totalParts} частей
            </span>
          </div>

          <div className="space-y-2">
            {Array.from({ length: totalParts }, (_, i) => i + 1).map((part) => {
              const isActive = activePart === part;
              const isWatched = isPartWatched(part);

              return (
                <button
                  key={part}
                  onClick={() => setActivePart(part)}
                  className={`w-full p-3.5 rounded-xl text-left transition-all flex items-center justify-between cursor-pointer border ${
                    isActive
                      ? 'bg-amber-50/80 border-amber-300 shadow-xs'
                      : 'bg-slate-50/60 hover:bg-slate-100/80 border-slate-200/80 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      isActive
                        ? 'bg-amber-600 text-white shadow-xs'
                        : isWatched
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-white text-slate-700 border border-slate-200'
                    }`}>
                      {isWatched ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : part}
                    </div>

                    <div>
                      <div className={`text-xs font-semibold ${isActive ? 'text-amber-950 font-bold' : 'text-slate-800'}`}>
                        Часть {part}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Видеоматериал</span>
                        {isWatched && <span className="text-emerald-700 font-medium">· Просмотрено</span>}
                      </div>
                    </div>
                  </div>

                  <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? 'text-amber-600 translate-x-0.5' : 'text-slate-400'}`} />
                </button>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-400 leading-relaxed">
            💡 Видео воспроизводится во встроенном защищенном плеере. Прогресс частей автоматически фиксируется в вашем профиле.
          </div>
        </div>

        {/* Right Column: Secure Video Player & Comments */}
        <div className="lg:col-span-8 order-1 lg:order-2">
          {errorStatus ? (
            <div className="p-8 rounded-2xl bg-rose-50 border border-rose-200 text-center">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
              <h3 className="font-serif text-lg font-bold text-rose-900 mb-1">
                Доступ ограничен
              </h3>
              <p className="text-xs text-rose-700 max-w-md mx-auto">
                {errorStatus}
              </p>
              <button
                onClick={onBack}
                className="mt-4 px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-semibold cursor-pointer"
              >
                Вернуться к курсам
              </button>
            </div>
          ) : (
            <div>
              {currentVideoId ? (
                <SecureVideoPlayer
                  key={`${lesson.id}-${activePart}-${currentVideoId}`}
                  videoId={currentVideoId}
                  lessonTitle={lesson.title}
                  lessonId={lesson.id}
                  partNum={activePart}
                  totalParts={totalParts}
                  user={user}
                  onPartComplete={handlePartComplete}
                  onNextPart={handleNextPart}
                />
              ) : (
                <div className="aspect-video bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-2" />
                    <span className="text-xs text-slate-300">Подготовка защищенного потока...</span>
                  </div>
                </div>
              )}

              {/* Questions & Comments Block */}
              <CommentsSection
                lessonId={lesson.id}
                partNum={activePart}
                user={user}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
