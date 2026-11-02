import React, { useState, useEffect } from 'react';
import { UserSession, QuestionComment } from '../types';
import { ApiService } from '../services/api';
import { MessageSquare, Send, CheckCircle2, Clock, UserCheck, HelpCircle, AlertCircle } from 'lucide-react';

interface CommentsSectionProps {
  lessonId: number;
  partNum: number;
  user: UserSession;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({
  lessonId,
  partNum,
  user
}) => {
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);
  const [comments, setComments] = useState<QuestionComment[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);

  // Загрузка комментариев урока
  useEffect(() => {
    let isMounted = true;
    setIsLoadingList(true);
    ApiService.getComments(lessonId, user.login).then((list) => {
      if (isMounted) {
        setComments(list);
        setIsLoadingList(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [lessonId, user.login]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const res = await ApiService.sendComment(
      user.login,
      user.userName,
      lessonId,
      partNum,
      commentText
    );
    setIsSubmitting(false);

    if (res.ok && res.comment) {
      setComments([res.comment, ...comments]);
      setCommentText('');
      setSuccessMessage(true);
      setTimeout(() => setSuccessMessage(false), 5000);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs mt-8">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-slate-900">
              Вопросы и комментарии к тренингу
            </h3>
            <p className="text-xs text-slate-500">
              Ваш вопрос отправляется напрямую в Google Таблицу кураторам и администраторам
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          <span>К части {partNum}</span>
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="mt-5">
        <div className="relative">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={`Задайте вопрос Саидмуроду Давлатову или куратору по уроку (Часть ${partNum})...`}
            rows={3}
            maxLength={1000}
            className="w-full p-4 text-sm bg-slate-50/70 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-600 focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all resize-none font-sans"
          />
          <div className="text-[11px] text-slate-400 text-right pr-2 mt-1">
            {commentText.length}/1000 символов
          </div>
        </div>

        <div className="flex items-center justify-between mt-2.5">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>
              От имени: <strong className="text-slate-800">{user.userName}</strong> ({user.login})
            </span>
          </div>

          <button
            type="submit"
            disabled={!commentText.trim() || isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Запись в таблицу...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Отправить вопрос</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Success Notification */}
      {successMessage && (
        <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">
            Вопрос успешно сохранен в Google Таблицу! Администратор и куратор увидят его в реальном времени.
          </span>
        </div>
      )}

      {/* List of Sent Comments */}
      <div className="mt-8 pt-6 border-t border-slate-100">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span>Ваши отправленные вопросы по этому курсу</span>
          <span className="text-[11px] font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {comments.length}
          </span>
        </h4>

        {isLoadingList ? (
          <div className="text-center py-6 text-xs text-slate-400">
            Загрузка списка вопросов...
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 rounded-xl bg-slate-50/50 border border-dashed border-slate-200 text-slate-400 text-xs">
            <HelpCircle className="w-7 h-7 mx-auto mb-2 text-slate-300" />
            Вы ещё не задавали вопросов по этому курсу. Напишите первый вопрос выше!
          </div>
        ) : (
          <div className="space-y-3.5">
            {comments.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 transition-colors"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
                  <div className="flex items-center gap-2 font-medium">
                    <span className="text-slate-900 font-semibold">{c.authorName}</span>
                    <span>·</span>
                    <span className="text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded-xs border border-amber-200/60">
                      Часть {c.partNum}
                    </span>
                    <span>·</span>
                    <span>{c.timestamp}</span>
                  </div>

                  <span className="text-[10px] font-semibold tracking-wide text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-sm border border-emerald-200/60">
                    ✓ В Google Таблице
                  </span>
                </div>

                <div className="text-sm text-slate-800 leading-relaxed font-sans">
                  {c.text}
                </div>

                {c.reply && (
                  <div className="mt-3 pl-3.5 border-l-2 border-amber-500 pt-1 text-xs text-slate-700 bg-amber-50/50 p-2 rounded-r-lg">
                    <div className="font-semibold text-amber-900 text-[11px] mb-0.5">
                      Ответ администратора / куратора:
                    </div>
                    {c.reply}
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
