import React, { useState } from 'react';
import { Code2, Copy, Check, X, FileSpreadsheet, Sparkles, Terminal } from 'lucide-react';

interface CodeViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CodeViewerModal: React.FC<CodeViewerModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const scriptCode = `// ============================================================
// GOOGLE APPS SCRIPT — ОБНОВЛЕННЫЙ БЭКЕНД ОНЛАЙН-ШКОЛЫ
// САИДМУРОДА ДАВЛАТОВА С ПОДДЕРЖКОЙ КОММЕНТАРИЕВ И ПРОГРЕССА
// ============================================================

const SPREADSHEET_ID = '1csr7PlzR1cOPVZSH45oGt10o4h2xviVN9uaDGZLEcdc';

// Названия листов таблицы
const SHEET_USERS     = 'Пользователи';
const SHEET_VIDEOS    = 'Видео';
const SHEET_LOGS      = 'Логи';
const SHEET_COMMENTS  = 'Комментарии'; // Новый лист вопросов учеников

// ============================================================
// doGet — единая точка входа API
// ============================================================
function doGet(e) {
  const action = (e.parameter.action || '').trim();
  let result;

  try {
    if (action.indexOf('admin') === 0)    result = handleAdmin(e);
    else if (action === 'login')          result = actionLogin(e);         // Вход логин/пароль
    else if (action === 'checkLesson')    result = actionCheckLesson(e);
    else if (action === 'getPart')        result = actionGetPart(e);
    else if (action === 'getLessonsMeta') result = actionGetLessonsMeta(e);
    else if (action === 'heartbeat')      result = actionHeartbeat(e);
    else if (action === 'sendComment')    result = actionSendComment(e);   // Отправка вопроса
    else if (action === 'getComments')    result = actionGetComments(e);   // Получение вопросов
    else if (action === 'saveProgress')   result = actionSaveProgress(e);  // Прогресс
    else result = { ok: false, error: 'unknown action: ' + action };
  } catch (err) {
    result = { ok: false, error: err.toString() };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// 1. АВТОРИЗАЦИЯ ПО ЛОГИНУ И ПАРОЛЮ АДМИНИСТРАТОРА
// ============================================================
function actionLogin(e) {
  const login = (e.parameter.login || '').trim().toLowerCase();
  const pass  = (e.parameter.pass  || '').trim();
  if (!login || !pass) return { ok: false, error: 'no credentials' };

  const sheet = getSheet(SHEET_USERS);
  const rows  = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const rowLogin = (r[0] || '').toString().trim().toLowerCase();
    const rowPass  = (r[1] || '').toString().trim();

    if (rowLogin === login && rowPass === pass) {
      const status = (r[3] || '').toString().trim();

      if (status === 'denied') {
        writeLog(login, 'Вход отклонён (denied)');
        return { ok: false, denied: true };
      }
      if (status !== 'active') {
        writeLog(login, 'Вход — статус: ' + status);
        return { ok: false, pending: true };
      }

      // Обновляем дату последнего входа (Колонка F = 6)
      sheet.getRange(i + 1, 6).setValue(timestamp());

      // Создаем уникальную сессию (вытесняет одновременные сессии)
      const session = Utilities.getUuid();
      sheet.getRange(i + 1, 9).setValue(session); // Колонка I = Сессия

      const lessons = parseIds((r[4] || '').toString());
      writeLog(login, 'Вход успешен по логину и паролю');
      return { ok: true, userName: r[2] || r[0], lessons, session };
    }
  }

  writeLog(login, 'Вход — логин/пароль не найден');
  return { ok: false, error: 'not found' };
}

// ============================================================
// 2. ОТПРАВКА ВОПРОСА / КОММЕНТАРИЯ В GOOGLE ТАБЛИЦУ
// ============================================================
function actionSendComment(e) {
  const login    = (e.parameter.login    || '').trim();
  const userName = (e.parameter.userName || login).trim();
  const lessonId = parseInt(e.parameter.lessonId || '0');
  const partNum  = parseInt(e.parameter.part     || '1');
  const text     = (e.parameter.text     || '').trim();

  if (!login || !lessonId || !text) {
    return { ok: false, error: 'Заполните текст вопроса' };
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let commentsSheet = ss.getSheetByName(SHEET_COMMENTS);
  if (!commentsSheet) {
    commentsSheet = ss.insertSheet(SHEET_COMMENTS);
    commentsSheet.getRange(1, 1, 1, 7).setValues([[
      'Дата/Время', 'УрокID', 'Часть', 'Логин', 'Имя ученика', 'Вопрос', 'Ответ / Статус'
    ]]);
    commentsSheet.setFrozenRows(1);
    commentsSheet.getRange(1, 1, 1, 7).setBackground('#1a1a24').setFontColor('#C9A84C').setFontWeight('bold');
  }

  const newRow = [
    timestamp(),
    lessonId,
    partNum,
    login,
    userName,
    text,
    'Новый'
  ];

  commentsSheet.appendRow(newRow);
  writeLog(login, 'Вопрос к уроку ' + lessonId + ' часть ' + partNum);
  return { ok: true };
}

// ============================================================
// 3. ПОЛУЧЕНИЕ КОММЕНТАРИЕВ К УРОКУ
// ============================================================
function actionGetComments(e) {
  const lessonId = parseInt(e.parameter.lessonId || '0');
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_COMMENTS);
  if (!sheet) return { ok: true, comments: [] };

  const rows = sheet.getDataRange().getValues();
  const comments = [];

  for (let i = rows.length - 1; i >= 1; i--) {
    const r = rows[i];
    if (parseInt(r[1]) === lessonId) {
      comments.push({
        id: 'row_' + (i + 1),
        timestamp: (r[0] || '').toString(),
        lessonId: parseInt(r[1]),
        partNum: parseInt(r[2]),
        authorLogin: (r[3] || '').toString(),
        authorName: (r[4] || '').toString(),
        text: (r[5] || '').toString(),
        reply: (r[6] || '').toString() !== 'Новый' ? (r[6] || '').toString() : '',
        status: (r[6] || '').toString() === 'Новый' ? 'sent' : 'answered'
      });
      if (comments.length >= 50) break; // последние 50
    }
  }

  return { ok: true, comments: comments };
}

// ============================================================
// 4. СОХРАНЕНИЕ ПРОГРЕССА ОБУЧЕНИЯ
// ============================================================
function actionSaveProgress(e) {
  const login    = (e.parameter.login || '').trim();
  const lessonId = (e.parameter.lessonId || '').trim();
  const part     = (e.parameter.part || '').trim();
  if (login && lessonId) {
    writeLog(login, 'Просмотр: урок ' + lessonId + ', часть ' + part);
  }
  return { ok: true };
}

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================
function getSheet(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('Лист не найден: ' + name);
  return sheet;
}

function parseIds(str) {
  return str.split(',')
    .map(function(s) { return parseInt(s.trim()); })
    .filter(function(n) { return !isNaN(n) && n > 0; });
}

function timestamp() {
  return new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Dushanbe' });
}

function writeLog(login, action) {
  try {
    getSheet(SHEET_LOGS).appendRow([timestamp(), login, action]);
  } catch(e) {}
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden relative max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-slate-900 text-white p-6 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold">Обновленный код Google Apps Script</h2>
              <p className="text-xs text-slate-400">Для вставки в редактор скриптов таблицы Google Sheets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
            <h4 className="font-bold flex items-center gap-2 mb-1 text-sm">
              <Sparkles className="w-4 h-4 text-amber-700" />
              Инструкция по обновлению скрипта:
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-700 mt-2">
              <li>Откройте вашу Google Таблицу <code>Онлайн Школа</code>.</li>
              <li>Перейдите в меню <strong>Расширения → Apps Script</strong>.</li>
              <li>Скопируйте код ниже и добавьте/замените его в файле <strong>Code.gs</strong>.</li>
              <li>Нажмите синюю кнопку <strong>Развернуть → Управление развертываниями → Изменить → Новая версия → Развернуть</strong>.</li>
              <li>Скрипт автоматически создаст лист <strong>«Комментарии»</strong> для сбора всех вопросов учеников.</li>
            </ol>
          </div>

          <div className="relative">
            <div className="flex items-center justify-between bg-slate-800 text-slate-300 px-4 py-2 rounded-t-xl text-[11px] font-mono">
              <span>Code.gs (Google Apps Script)</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-sans font-semibold cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Скопировано!' : 'Копировать весь код'}</span>
              </button>
            </div>
            <pre className="p-4 bg-slate-950 text-emerald-300 font-mono text-[11px] rounded-b-xl overflow-x-auto max-h-[340px] leading-relaxed selection:bg-amber-600 selection:text-white">
              {scriptCode}
            </pre>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            Все функции согласованы с вашей таблицей
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Скопировано!' : 'Копировать код'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
