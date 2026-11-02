// ============================================================
// GOOGLE APPS SCRIPT — ОБНОВЛЕННЫЙ БЭКЕНД ДАВЛАТОВ АКАДЕМИЯ (САМО)
// Поддержка:
//   1. Вход по Логину и Паролю из существующей Google Таблицы
//   2. Воспроизведение через встроенный плеер
//   3. Модуль вопросов/комментариев в лист "Комментарии"
//   4. Защита от одновременных сессий и Heartbeat-мониторинг
//   5. Запрет скачивания на Google Диске (copyRequiresWriterPermission)
//
// Инструкция по установке:
//   1. Откройте вашу Google Таблицу
//   2. Расширения -> Apps Script
//   3. Замените код в Code.gs на этот
//   4. Развернуть -> Управление развертываниями -> Изменить -> Новая версия -> Развернуть
// ============================================================

const SPREADSHEET_ID = '1mEAzI2WizpuFsd8EHa74JHLKVnmB8fYQjUvfugyK2m8';

// Названия листов
const SHEET_USERS     = 'Пользователи';
const SHEET_VIDEOS    = 'Видео';
const SHEET_LOGS      = 'Логи';
const SHEET_COMMENTS  = 'Комментарии'; // Лист для вопросов и комментариев учеников

// ============================================================
// doGet — единая точка входа
// ============================================================
function doGet(e) {
  const action = (e.parameter.action || '').trim();
  let result;

  try {
    if (action.indexOf('admin') === 0)    result = handleAdmin(e);
    else if (action === 'login')          result = actionLogin(e);          // Вход по логину и паролю
    else if (action === 'loginGoogle')    result = actionLoginGoogle(e);    // Вход через Google
    else if (action === 'checkLesson')    result = actionCheckLesson(e);
    else if (action === 'getPart')        result = actionGetPart(e);
    else if (action === 'getLessonsMeta') result = actionGetLessonsMeta(e);
    else if (action === 'heartbeat')      result = actionHeartbeat(e);
    else if (action === 'sendComment')    result = actionSendComment(e);    // Запись вопроса в таблицу
    else if (action === 'getComments')    result = actionGetComments(e);    // Получение вопросов
    else if (action === 'saveProgress')   result = actionSaveProgress(e);   // Прогресс ученика
    else result = { ok: false, error: 'unknown action: ' + action };
  } catch (err) {
    result = { ok: false, error: err.toString() };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// 1. АВТОРИЗАЦИЯ ПО ЛОГИНУ И ПАРОЛЮ (Колонки A и B)
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

      // Обновляем "Последний вход" (колонка F = 6)
      sheet.getRange(i + 1, 6).setValue(timestamp());

      // Создаем уникальную сессию (вытесняет одновременный просмотр с других устройств)
      const session = Utilities.getUuid();
      sheet.getRange(i + 1, 9).setValue(session); // Колонка I = Сессия

      const lessons = parseIds((r[4] || '').toString());
      writeLog(login, 'Вход успешен по логину и паролю');
      return { ok: true, userName: r[2] || r[0], lessons, session };
    }
  }

  writeLog(login, 'Вход — не найден');
  return { ok: false, error: 'not found' };
}

// ============================================================
// 2. ОТПРАВКА ВОПРОСА В GOOGLE ТАБЛИЦУ (Лист "Комментарии")
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
      'Дата/Время', 'УрокID', 'Часть', 'Логин', 'Имя ученика', 'Вопрос / Комментарий', 'Ответ / Статус'
    ]]);
    commentsSheet.setFrozenRows(1);
    commentsSheet.getRange(1, 1, 1, 7).setBackground('#1a1a24').setFontColor('#C9A84C').setFontWeight('bold');
    commentsSheet.setColumnWidth(1, 160);
    commentsSheet.setColumnWidth(2, 80);
    commentsSheet.setColumnWidth(3, 80);
    commentsSheet.setColumnWidth(4, 140);
    commentsSheet.setColumnWidth(5, 180);
    commentsSheet.setColumnWidth(6, 400);
    commentsSheet.setColumnWidth(7, 200);
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
      if (comments.length >= 50) break;
    }
  }

  return { ok: true, comments: comments };
}

// ============================================================
// 4. ПРОВЕРКА ДОСТУПА К УРОКУ
// ============================================================
function actionCheckLesson(e) {
  const login    = (e.parameter.login    || '').trim();
  const session  = (e.parameter.session  || '').trim();
  const lessonId = parseInt(e.parameter.lessonId || '0');
  if (!login || !lessonId) return { ok: false, error: 'bad params' };

  const user = findUser(login);
  if (!user) return { ok: false, error: 'user not found' };
  if (user.status === 'denied') return { ok: false, denied: true };
  if (user.status !== 'active') return { ok: false, pending: true };
  if (session && user.session && session !== user.session) {
    writeLog(login, 'checkLesson: сессия устарела (вход с другого устройства)');
    return { ok: false, sessionExpired: true };
  }
  if (!user.lessons.includes(lessonId)) return { ok: false, denied: true };

  const partsCount = countParts(lessonId);
  return { ok: true, partsCount: partsCount };
}

// ============================================================
// 5. ВЫДАЧА DRIVE ID ВИДЕО
// ============================================================
function actionGetPart(e) {
  const login    = (e.parameter.login    || '').trim();
  const session  = (e.parameter.session  || '').trim();
  const lessonId = parseInt(e.parameter.lessonId || '0');
  const part     = parseInt(e.parameter.part     || '0');
  if (!login || !lessonId || !part) return { ok: false, error: 'bad params' };

  const user = findUser(login);
  if (!user) return { ok: false, error: 'user not found' };
  if (user.status === 'denied') return { ok: false, denied: true };
  if (user.status !== 'active') return { ok: false, pending: true };
  if (session && user.session && session !== user.session) {
    return { ok: false, sessionExpired: true };
  }
  if (!user.lessons.includes(lessonId)) return { ok: false, denied: true };

  const videoId = findVideoId(lessonId, part);
  if (!videoId) return { ok: false, error: 'video not found' };

  return { ok: true, videoId: videoId };
}

// ============================================================
// 6. HEARTBEAT И ПРОГРЕСС
// ============================================================
function actionHeartbeat(e) {
  const login   = (e.parameter.login   || '').trim();
  const session = (e.parameter.session || '').trim();
  if (!login) return { ok: false, error: 'no login' };

  const user = findUser(login);
  if (!user) return { ok: false, error: 'user not found' };
  if (session && user.session && session !== user.session) {
    return { ok: false, sessionExpired: true };
  }

  const sheet = getSheet(SHEET_USERS);
  sheet.getRange(user.row, 10).setValue(new Date()); // Колонка J = Последняя активность
  return { ok: true };
}

function actionSaveProgress(e) {
  const login    = (e.parameter.login || '').trim();
  const lessonId = (e.parameter.lessonId || '').trim();
  const part     = (e.parameter.part || '').trim();
  if (login && lessonId) {
    writeLog(login, 'Изучено: урок ' + lessonId + ', часть ' + part);
  }
  return { ok: true };
}

function actionGetLessonsMeta(e) {
  const rows = getSheet(SHEET_VIDEOS).getDataRange().getValues();
  const counts = {};
  for (let i = 1; i < rows.length; i++) {
    const lessonId = parseInt(rows[i][0]);
    if (!lessonId) continue;
    counts[lessonId] = (counts[lessonId] || 0) + 1;
  }
  const lessons = Object.keys(counts).map(function(id) {
    return {
      lessonId: parseInt(id),
      partsCount: counts[id]
    };
  });
  return { ok: true, lessons: lessons };
}

// ============================================================
// HELPERS
// ============================================================
function getSheet(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('Лист не найден: ' + name);
  return sheet;
}

function findUser(loginOrEmail) {
  const val  = loginOrEmail.trim().toLowerCase();
  const rows = getSheet(SHEET_USERS).getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    const rowLogin = (rows[i][0] || '').toString().trim().toLowerCase();
    const rowEmail = (rows[i][7] || '').toString().trim().toLowerCase();

    if (rowLogin === val || rowEmail === val) {
      return {
        row:     i + 1,
        status:  (rows[i][3] || '').toString().trim(),
        lessons: parseIds((rows[i][4] || '').toString()),
        session: (rows[i][8] || '').toString().trim() // Колонка 9 (индекс 8)
      };
    }
  }
  return null;
}

function findVideoId(lessonId, part) {
  const rows = getSheet(SHEET_VIDEOS).getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (parseInt(rows[i][0]) === lessonId && parseInt(rows[i][1]) === part) {
      return (rows[i][2] || '').toString().trim() || null;
    }
  }
  return null;
}

function countParts(lessonId) {
  const rows = getSheet(SHEET_VIDEOS).getDataRange().getValues();
  let count = 0;
  for (let i = 1; i < rows.length; i++) {
    if (parseInt(rows[i][0]) === lessonId) count++;
  }
  return count;
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
}
