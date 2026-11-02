import React from 'react';
import { ShieldCheck, Lock, Eye, AlertOctagon, Smartphone, Database, X } from 'lucide-react';

interface SecurityGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityGuideModal: React.FC<SecurityGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-slate-900 text-white p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold">Безопасность и защита контента</h2>
              <p className="text-xs text-slate-400">Система защиты видео-тренингов Саидмурода Давлатова</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 text-slate-700 text-xs leading-relaxed">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
              <div className="flex items-center gap-2 font-bold text-slate-900 mb-1.5">
                <Eye className="w-4 h-4 text-amber-700" />
                <span>Динамический водяной знак</span>
              </div>
              <p className="text-slate-600">
                Поверх каждого видео плавно перемещается полупрозрачный водяной знак с ФИО, логином и уникальным ID сессии ученика, что делает невозможной анонимную запись экрана.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200">
              <div className="flex items-center gap-2 font-bold text-slate-900 mb-1.5">
                <Smartphone className="w-4 h-4 text-blue-700" />
                <span>Контроль одной сессии</span>
              </div>
              <p className="text-slate-600">
                Вход с нового устройства моментально аннулирует доступ на предыдущем. Один аккаунт невозможно использовать одновременно с нескольких телефонов или компьютеров.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
              <div className="flex items-center gap-2 font-bold text-slate-900 mb-1.5">
                <Lock className="w-4 h-4 text-emerald-700" />
                <span>Запрет копирования</span>
              </div>
              <p className="text-slate-600">
                На всех видеофайлах Google Диска активирован параметр <code>copyRequiresWriterPermission: true</code>. Отключены кнопки контекстного меню и горячие клавиши браузера.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200">
              <div className="flex items-center gap-2 font-bold text-slate-900 mb-1.5">
                <Database className="w-4 h-4 text-purple-700" />
                <span>Контроль через Google Таблицу</span>
              </div>
              <p className="text-slate-600">
                Администратор управляет доступом в реальном времени. Изменение статуса на <code>denied</code> мгновенно прекращает воспроизведение на всех устройствах.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <h4 className="font-bold text-slate-900 mb-1">
              Правила использования образовательной платформы:
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-600 mt-2">
              <li>Передача логина и пароля третьим лицам категорически запрещена.</li>
              <li>При обнаружении записи экрана аккаунт автоматически блокируется администратором.</li>
              <li>Все вопросы по урокам отправляются автору через специальную форму и сохраняются в базу данных.</li>
            </ul>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            Понятно, закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
