  // ============================================================
  // GOOGLE APPS SCRIPT — бэкенд Давлатов Академия
  // Задеплойте как Web App:
  //   Execute as: Me
  //   Who has access: Anyone
  // ============================================================

  const SPREADSHEET_ID = '1csr7PlzR1cOPVZSH45oGt10o4h2xviVN9uaDGZLEcdc';

  // Названия листов
  const SHEET_USERS  = 'Пользователи';
  const SHEET_VIDEOS = 'Видео';
  const SHEET_LOGS   = 'Логи';

  // ============================================================
  // doGet — единая точка входа
  // ============================================================
  function doGet(e) {
    const action = (e.parameter.action || '').trim();
    let result;

    try {
      if (action.indexOf('admin') === 0)    result = handleAdmin(e);        // ← АДМИНКА
      else if (action === 'loginGoogle')    result = actionLoginGoogle(e);  // ← Google OAuth
      else if (action === 'login')          result = actionLogin(e);        // ← логин/пароль
      else if (action === 'checkLesson')    result = actionCheckLesson(e);
      else if (action === 'getPart')        result = actionGetPart(e);
      else if (action === 'getLessonsMeta') result = actionGetLessonsMeta(e);
      else if (action === 'heartbeat')      result = actionHeartbeat(e);
      else result = { ok: false, error: 'unknown action' };
    } catch (err) {
      result = { ok: false, error: err.toString() };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ============================================================
  // ACTION: loginGoogle  ← НОВЫЙ
  // Параметры: email (Google-почта пользователя)
  // Возврат:   { ok, userName, lessons:[1,2,3] } | { ok:false, denied } | { ok:false }
  // ============================================================
  function actionLoginGoogle(e) {
    const email = (e.parameter.email || '').trim().toLowerCase();
    if (!email) return { ok: false, error: 'no email' };

    const sheet = getSheet(SHEET_USERS);
    const rows  = sheet.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      // Колонки: [Логин, Пароль, Имя, Статус, Уроки, Последний вход, Комментарий, Email]
      //   0       1      2     3        4       5         6             7
      const rowEmail = (r[7] || '').toString().trim().toLowerCase();

      if (rowEmail === email) {
        const status = effectiveStatus(r)

        if (status === 'denied') {
          writeLog(email, 'Google вход отклонён (denied)');
          return { ok: false, denied: true };
        }
        if (status !== 'active') {
          writeLog(email, 'Google вход — статус: ' + status);
          return { ok: false, pending: true };
        }

        // Обновляем "Последний вход" (колонка F = 6)
        sheet.getRange(i + 1, 6).setValue(timestamp());

        // Новая сессия вытесняет предыдущую — так на одном аккаунте
        // не смогут одновременно смотреть с 5 разных телефонов.
        const session = createSession(sheet, i + 1);

        const lessons = parseIds((r[4] || '').toString());

        writeLog(email, 'Google вход успешен');
        return { ok: true, userName: r[2] || email, lessons, session };
      }
    }

    writeLog(email, 'Google вход — email не найден');
    return { ok: false, error: 'not found' };
  }

  // ============================================================
  // ACTION: login (старый — логин/пароль, оставлен для совместимости)
  // ============================================================
  function actionLogin(e) {
    const login = (e.parameter.login || '').trim();
    const pass  = (e.parameter.pass  || '').trim();
    if (!login || !pass) return { ok: false, error: 'no credentials' };

    const sheet = getSheet(SHEET_USERS);
    const rows  = sheet.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (r[0] === login && r[1] === pass) {
        const status = effectiveStatus(r)

        if (status === 'denied') {
          writeLog(login, 'Вход отклонён');
          return { ok: false, denied: true };
        }
        if (status !== 'active') {
          writeLog(login, 'Вход — статус: ' + status);
          return { ok: false, pending: true };
        }

        sheet.getRange(i + 1, 6).setValue(timestamp());

        const session = createSession(sheet, i + 1);
        const lessons = parseIds((r[4] || '').toString());
        writeLog(login, 'Вход успешен');
        return { ok: true, userName: r[2] || login, lessons, session };
      }
    }

    writeLog(login, 'Вход — не найден');
    return { ok: false, error: 'not found' };
  }

  // ============================================================
  // ACTION: checkLesson
  // Параметры: login (или email), lessonId
  // ============================================================
  function actionCheckLesson(e) {
    const login    = (e.parameter.login    || '').trim();
    const session  = (e.parameter.session  || '').trim();
    const lessonId = parseInt(e.parameter.lessonId || '0');
    if (!login || !lessonId) return { ok: false, error: 'bad params' };

    const user = findUser(login);
    if (!user) return { ok: false, error: 'user not found' };
    if (user.status === 'denied')  return { ok: false, denied: true };
    if (user.status !== 'active')  return { ok: false, pending: true };
    if (session && user.session && session !== user.session) {
      writeLog(login, 'checkLesson: сессия устарела (вход с другого устройства)');
      return { ok: false, sessionExpired: true };
    }
    if (!user.lessons.includes(lessonId)) return { ok: false, denied: true };

    const partsCount = countParts(lessonId);
    if (partsCount === 0) return { ok: false, error: 'no parts found' };

    writeLog(login, 'checkLesson: ' + lessonId + ' → ' + partsCount + ' частей');
    return { ok: true, partsCount };
  }

  // ============================================================
  // ACTION: getPart
  // Параметры: login (или email), lessonId, part
  // ============================================================
  function actionGetPart(e) {
    const login    = (e.parameter.login    || '').trim();
    const session  = (e.parameter.session  || '').trim();
    const lessonId = parseInt(e.parameter.lessonId || '0');
    const part     = parseInt(e.parameter.part     || '0');
    if (!login || !lessonId || !part) return { ok: false, error: 'bad params' };

    const user = findUser(login);
    if (!user) return { ok: false, error: 'user not found' };
    if (user.status === 'denied')  return { ok: false, denied: true };
    if (user.status !== 'active')  return { ok: false, pending: true };
    if (session && user.session && session !== user.session) {
      writeLog(login, 'getPart: сессия устарела (вход с другого устройства)');
      return { ok: false, sessionExpired: true };
    }
    if (!user.lessons.includes(lessonId)) return { ok: false, denied: true };

    const videoId = findVideoId(lessonId, part);
    if (!videoId) return { ok: false, error: 'video not found' };

    writeLog(login, `getPart: урок ${lessonId} часть ${part}`);
    return { ok: true, videoId };
  }

  // ============================================================
  // ACTION: getLessonsMeta  ← НОВЫЙ
  // Публичный метод (без логина) — отдаёт актуальное количество
  // частей по каждому уроку на основе листа "Видео". Нужен, чтобы
  // главная страница не хранила эти числа захардкоженными и не
  // расходилась с таблицей, когда добавляются новые части.
  // ============================================================
  function actionGetLessonsMeta(e) {
    const rows = getSheet(SHEET_VIDEOS).getDataRange().getValues();
    const counts = {};
    for (let i = 1; i < rows.length; i++) {
      const lessonId = parseInt(rows[i][0]);
      if (!lessonId) continue;
      counts[lessonId] = (counts[lessonId] || 0) + 1;
    }
    const lessons = Object.keys(counts).map(id => ({
      lessonId: parseInt(id),
      partsCount: counts[id],
    }));
    return { ok: true, lessons };
  }

  // ============================================================
  // HELPERS
  // ============================================================

  function getSheet(name) {
    const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(name);
    if (!sheet) throw new Error('Лист не найден: ' + name);
    return sheet;
  }

  // Найти пользователя по логину ИЛИ по email (колонка H)
  function findUser(loginOrEmail) {
    const val  = loginOrEmail.trim().toLowerCase();
    const rows = getSheet(SHEET_USERS).getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {
      const rowLogin = (rows[i][0] || '').toString().trim().toLowerCase();
      const rowEmail = (rows[i][7] || '').toString().trim().toLowerCase();  // колонка H

      if (rowLogin === val || rowEmail === val) {
        return {
          row:     i + 1,
          status:  effectiveStatus(rows[i]),
          lessons: parseIds((rows[i][4] || '').toString()),
          session: (rows[i][COL_SESSION - 1] || '').toString().trim(),
        };
      }
    }
    return null;
  }

  // Создаёт новую сессию для строки пользователя (вытесняет предыдущую)
  // и сохраняет её в колонку "Сессия" (I). Возвращает id новой сессии.
  function createSession(sheet, row) {
    const session = Utilities.getUuid();
    sheet.getRange(row, COL_SESSION).setValue(session);
    return session;
  }

  // ============================================================
  // ACTION: heartbeat — фронтенд отправляет пинг раз в 60 секунд,
  // пока открыт плеер. Позволяет увидеть в таблице (колонка J),
  // сколько человек реально смотрят видео ПРЯМО СЕЙЧАС, а не просто
  // когда-то заходили. Также подтверждает, что сессия ещё активна.
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
    sheet.getRange(user.row, COL_LAST_SEEN).setValue(new Date());
    return { ok: true };
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
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n) && n > 0);
  }

  function timestamp() {
    return new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Dushanbe' });
  }

  function writeLog(login, action) {
    try {
      getSheet(SHEET_LOGS).appendRow([timestamp(), login, action]);
    } catch(e) {}
  }

  // ============================================================
  // SETUP — запустить один раз вручную для обновления структуры
  // ============================================================
  function setupSheets() {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // ── Лист ПОЛЬЗОВАТЕЛИ ──────────────────────────────────
    let users = ss.getSheetByName(SHEET_USERS) || ss.insertSheet(SHEET_USERS);
    // Теперь 10 колонок — добавлены Сессия (I) и Последняя активность (J)
    users.getRange(1,1,1,10).setValues([[
      'Логин','Пароль','Имя','Статус','Уроки (1,2,3...)','Последний вход','Комментарий','Email (Google)','Сессия (не трогать)','Последняя активность'
    ]]);
    styleHeader(users, 10);
    users.setColumnWidths(1, 10, 160);
    users.setColumnWidth(8, 240); // Email шире
    users.setColumnWidth(9, 260); // Сессия — длинный uuid
    users.setFrozenRows(1);

    // Условное форматирование статусов
    const sr = users.getRange('D2:D1000');
    users.setConditionalFormatRules([
      makeRule(sr, 'active',  '#0f3d2a', '#2ECC71'),
      makeRule(sr, 'pending', '#3d3200', '#F1C40F'),
      makeRule(sr, 'denied',  '#3d0f0f', '#E74C3C'),
    ]);

    // ── Лист ВИДЕО ─────────────────────────────────────────
    let vids = ss.getSheetByName(SHEET_VIDEOS) || ss.insertSheet(SHEET_VIDEOS);
    vids.getRange(1,1,1,4).setValues([[
      'УрокID','Часть','Drive File ID','Название (необязат.)'
    ]]);
    styleHeader(vids, 4);
    vids.setColumnWidth(1, 80);
    vids.setColumnWidth(2, 70);
    vids.setColumnWidth(3, 340);
    vids.setColumnWidth(4, 220);
    vids.setFrozenRows(1);

    // ── Лист ЛОГИ ──────────────────────────────────────────
    let logs = ss.getSheetByName(SHEET_LOGS) || ss.insertSheet(SHEET_LOGS);
    logs.getRange(1,1,1,3).setValues([['Дата/Время','Логин / Email','Действие']]);
    styleHeader(logs, 3);
    logs.setColumnWidths(1, 3, 220);
    logs.setFrozenRows(1);

    Logger.log('✅ Таблица обновлена! Добавлена колонка Email (H) в листе Пользователи.');
  }

  function styleHeader(sheet, cols) {
    const r = sheet.getRange(1, 1, 1, cols);
    r.setBackground('#1a1a24');
    r.setFontColor('#C9A84C');
    r.setFontWeight('bold');
    r.setFontSize(11);
  }

  function makeRule(range, text, bg, fg) {
    return SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(text)
      .setBackground(bg).setFontColor(fg)
      .setRanges([range]).build();
  }

  // ============================================================
  // ↓↓↓ НОВОЕ: АВТОСИНХРОНИЗАЦИЯ ПРАВ НА GOOGLE ДИСКЕ ↓↓↓
  // Идея: как только в листе "Пользователи" меняется Статус,
  // Уроки или Email — скрипт сам идёт в Google Drive и
  // добавляет/убирает этого человека как читателя (Viewer)
  // нужных видеофайлов. Заходить в Диск руками больше не нужно.
  // ============================================================

  // Номера колонок листа "Пользователи" (1 = A, 4 = D, 5 = E, 8 = H)
  const COL_STATUS    = 4;  // Статус
  const COL_LESSONS   = 5;  // Уроки (1,2,3...)
  const COL_EMAIL     = 8;  // Email (Google)
  const COL_SESSION   = 9;  // Текущая активная сессия (id устройства) — НОВОЕ
  const COL_LAST_SEEN = 10; // Последняя активность (heartbeat) — НОВОЕ, для мониторинга онлайна
  const COL_EXPIRES  = 14; // Доступ до (yyyy-MM-dd)
  const COL_EXP_DONE = 15; // служебная отметка: просроченный уже закрыт на Диске

  // ── УСТАНОВКА ТРИГГЕРА ─────────────────────────────────────
  // Запустить ЭТУ функцию ОДИН РАЗ вручную из редактора Apps Script
  // (кнопка ▶ рядом с именем функции createEditTrigger).
  // При первом запуске Google попросит разрешения — это нормально,
  // нужно разрешить доступ к Google Drive.
  function createEditTrigger() {
    // Убираем старые копии триггера, чтобы не задваивались
    ScriptApp.getProjectTriggers().forEach(t => {
      if (t.getHandlerFunction() === 'onEditInstallable') {
        ScriptApp.deleteTrigger(t);
      }
    });
    ScriptApp.newTrigger('onEditInstallable')
      .forSpreadsheet(SPREADSHEET_ID)
      .onEdit()
      .create();
    Logger.log('✅ Триггер установлен. Теперь права на Диске будут выдаваться автоматически при редактировании таблицы.');
  }

  // Срабатывает автоматически при ЛЮБОМ редактировании таблицы
  function onEditInstallable(e) {
    try {
      const sheet = e.range.getSheet();
      const name  = sheet.getName();

      if (name === SHEET_USERS) {
        const firstCol = e.range.getColumn();
        const lastCol  = e.range.getLastColumn();
        const relevant = [COL_STATUS, COL_LESSONS, COL_EMAIL, COL_EXPIRES];
        const touched  = relevant.some(c => c >= firstCol && c <= lastCol);
        if (!touched) return;

        const firstRow = Math.max(e.range.getRow(), 2); // пропускаем заголовок
        const lastRow  = e.range.getLastRow();
        for (let row = firstRow; row <= lastRow; row++) {
          syncDriveAccessForRow(row);
        }

      } else if (name === SHEET_VIDEOS) {
        // Если добавили/поменяли видео (новый Drive File ID, новый урок) —
        // на всякий случай пересчитываем права у всех, у кого статус active.
        // Для маленькой школы (десятки видео/учеников) это быстро и безопасно.
        if (e.range.getRow() < 2) return; // правка заголовка — игнор
        syncAllUsers();
      }
    } catch (err) {
      Logger.log('onEditInstallable error: ' + err);
    }
  }

  // Синхронизирует права на Диске для ОДНОЙ строки-пользователя
  function syncDriveAccessForRow(row) {
    const sheet   = getSheet(SHEET_USERS);
    const rowData = sheet.getRange(row, 1, 1, COL_EXPIRES).getValues()[0];

    const email   = (rowData[COL_EMAIL   - 1] || '').toString().trim().toLowerCase();
    const status  = effectiveStatus(rowData);
    const lessons = parseIds((rowData[COL_LESSONS - 1] || '').toString());

    if (!email) return; // нет почты — расшаривать некому

    // Если статус не "active" — доступа нигде быть не должно
    const allowedLessons = (status === 'active') ? lessons : [];

    const videoRows = getSheet(SHEET_VIDEOS).getDataRange().getValues();
    let granted = 0, revoked = 0, errors = 0;

    for (let i = 1; i < videoRows.length; i++) {
      const lessonId = parseInt(videoRows[i][0]);
      const fileId    = (videoRows[i][2] || '').toString().trim();
      if (!fileId) continue;

      const shouldHaveAccess = allowedLessons.includes(lessonId);

      try {
        const existing = findDrivePermission(fileId, email);

        if (shouldHaveAccess && !existing) {
          // sendNotificationEmail:false — ключевая настройка,
          // именно она отключает письмо клиенту о новом доступе
          Drive.Permissions.create(
            { role: 'reader', type: 'user', emailAddress: email },
            fileId,
            { sendNotificationEmail: false }
          );
          // Запрещаем скачивание/печать/копирование для читателей —
          // это официальный переключатель Google Drive
          // "Запретить скачивание, печать и копирование файла для
          // читателей и комментаторов". Заодно исчезает лишняя кнопка
          // "Скачать" из встроенного плеера, которая на iPhone
          // перекрывала само видео.
          try {
            Drive.Files.update({ copyRequiresWriterPermission: true }, fileId);
          } catch (permErr) {
            Logger.log('Не удалось закрыть копирование для файла ' + fileId + ': ' + permErr);
          }
          granted++;
        } else if (!shouldHaveAccess && existing) {
          Drive.Permissions.remove(fileId, existing.id);
          revoked++;
        }
      } catch (err) {
        errors++;
        Logger.log(`Не удалось изменить доступ к файлу ${fileId} для ${email}: ${err}`);
      }
    }

    if (granted || revoked || errors) {
      writeLog(email, `Синхронизация Диска: выдано ${granted}, отозвано ${revoked}` + (errors ? `, ошибок ${errors}` : ''));
    }
  }

  // Ищет существующее право доступа (permission) на файле для этого email
  // через Advanced Drive Service (без email-уведомлений)
  function findDrivePermission(fileId, email) {
    const resp  = Drive.Permissions.list(fileId, { fields: 'permissions(id,emailAddress,role)' });
    const perms = resp.permissions || [];
    return perms.find(p => (p.emailAddress || '').toLowerCase() === email) || null;
  }

  // ── МЕНЮ В ТАБЛИЦЕ ──────────────────────────────────────────
  // Добавляет пункт меню "🔐 Доступ к Диску" наверху таблицы,
  // чтобы можно было запустить синхронизацию всех вручную одной кнопкой.
  function onOpen() {
    SpreadsheetApp.getUi()
      .createMenu('🔐 Доступ к Диску')
      .addItem('Синхронизировать всех сейчас', 'syncAllUsers')
      .addItem('Закрыть скачивание на всех видео', 'lockAllExistingVideos')
      .addItem('Кто смотрит прямо сейчас', 'showOnlineNow')
      .addToUi();
  }

  // Ручная массовая синхронизация — пройтись по всем пользователям сразу
  function syncAllUsers() {
    const rows = getSheet(SHEET_USERS).getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      syncDriveAccessForRow(i + 1);
    }
  }

  // ============================================================
  // ЗАПУСТИТЬ ОДИН РАЗ ВРУЧНУЮ: закрывает скачивание/печать/копирование
  // на ВСЕХ уже загруженных видео из листа "Видео" одним махом.
  // Нужно, потому что новая защита (copyRequiresWriterPermission)
  // применяется автоматически только к НОВЫМ выдачам доступа —
  // а старые файлы, расшаренные раньше, нужно закрыть отдельно.
  // ============================================================
  function lockAllExistingVideos() {
    const rows = getSheet(SHEET_VIDEOS).getDataRange().getValues();
    let done = 0, errors = 0;
    for (let i = 1; i < rows.length; i++) {
      const fileId = (rows[i][2] || '').toString().trim();
      if (!fileId) continue;
      try {
        Drive.Files.update({ copyRequiresWriterPermission: true }, fileId);
        done++;
      } catch (err) {
        errors++;
        Logger.log('Ошибка на файле ' + fileId + ': ' + err);
      }
    }
    Logger.log(`✅ Готово. Защищено файлов: ${done}` + (errors ? `, ошибок: ${errors}` : ''));
  }

  // ============================================================
  // Показывает в логе, сколько человек смотрят видео ПРЯМО СЕЙЧАС
  // (те, у кого heartbeat приходил за последние 3 минуты).
  // Запускайте вручную, когда нужно оценить текущую нагрузку.
  // ============================================================
  function showOnlineNow() {
    const rows = getSheet(SHEET_USERS).getDataRange().getValues();
    const now  = Date.now();
    let online = 0;
    const names = [];
    for (let i = 1; i < rows.length; i++) {
      const lastSeen = rows[i][COL_LAST_SEEN - 1];
      if (lastSeen instanceof Date && (now - lastSeen.getTime()) < 3 * 60 * 1000) {
        online++;
        names.push(rows[i][2] || rows[i][7] || rows[i][0]);
      }
    }
    Logger.log(`🟢 Сейчас онлайн: ${online} чел.`);
    if (names.length) Logger.log(names.join(', '));
  }


  // ============================================================
  // АДМИН-API — ДОБАВЬТЕ этот код в конец вашего Code.gs
  // (ничего из старого кода удалять не нужно)
  //
  // ШАГ 1. Замените ADMIN_KEY на свой длинный секретный пароль.
  // ШАГ 2. В doGet, в самом начале цепочки if/else, замените
  //          if (action === 'loginGoogle') ...
  //        на:
  //          if (action.indexOf('admin') === 0) result = handleAdmin(e);
  //          else if (action === 'loginGoogle') ...
  // ШАГ 3. Deploy → Manage deployments → Edit → New version → Deploy.
  // ============================================================

  const ADMIN_KEY = 'Davlatov-2026-xK9mQ4zP7wL2';

  function handleAdmin(e) {
    if ((e.parameter.key || '') !== ADMIN_KEY) return { ok: false, error: 'bad key' };
    const a = e.parameter.action;
    const p = e.parameter;

    if (a === 'adminPing')        return { ok: true };
    if (a === 'adminListUsers')   return adminListUsers();
    if (a === 'adminListVideos')  return adminListVideos();
    if (a === 'adminLogs')        return adminLogs();
    if (a === 'adminStats')       return adminStats(p);

    // Все действия, которые меняют таблицу, — под блокировкой
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      if (a === 'adminSaveUser')    return adminSaveUser(p);
      if (a === 'adminDeleteUser')  return adminDeleteUser(p);
      if (a === 'adminSaveVideo')   return adminSaveVideo(p);
      if (a === 'adminDeleteVideo') return adminDeleteVideo(p);
      if (a === 'adminSyncAll')     { syncAllUsers(); return { ok: true }; }
    } finally {
      lock.releaseLock();
    }
    return { ok: false, error: 'unknown admin action' };
  }

  function adminListUsers() {
    const rows = getSheet(SHEET_USERS).getDataRange().getValues();
    const tz = 'Asia/Dushanbe';
    const users = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r[0] && !r[7] && !r[2]) continue; // пустая строка
      const added = r[11] instanceof Date
        ? Utilities.formatDate(r[11], tz, 'yyyy-MM-dd')
        : (r[11] || '').toString();
      users.push({
        row: i + 1,
        login: (r[0] || '').toString(),
        name: (r[2] || '').toString(),
        status: (r[3] || '').toString().trim(),
        lessons: parseIds((r[4] || '').toString()),
        lastLogin: (r[5] || '').toString(),
        comment: (r[6] || '').toString(),
        email: (r[7] || '').toString(),
        lastSeen: (r[COL_LAST_SEEN - 1] instanceof Date) ? r[COL_LAST_SEEN - 1].toISOString() : '',
        amount: (r[10] === undefined || r[10] === '') ? '' : r[10],
        added: added,
        manager: (r[12] || '').toString(),
        expires: normDate(r[COL_EXPIRES - 1]),
      });
    }
    return { ok: true, users };
  }

  function adminSaveUser(p) {
    const sheet   = getSheet(SHEET_USERS);
    let row       = parseInt(p.row || '0');
    const isNew   = !row;
    const email   = (p.email || '').trim().toLowerCase();
    const login   = (p.login || '').trim().toLowerCase();
    const status  = (p.status || 'pending').trim();
    const lessons = parseIds(p.lessons || '').join(',');

    // Защита от дубликатов на стороне сервера
    const all = sheet.getDataRange().getValues();
    for (let i = 1; i < all.length; i++) {
      if (i + 1 === row) continue;
      const e2 = (all[i][7] || '').toString().trim().toLowerCase();
      const l2 = (all[i][0] || '').toString().trim().toLowerCase();
      if ((email && (e2 === email || l2 === email)) || (login && (l2 === login || e2 === login))) {
        return { ok: false, error: 'Такой ученик уже есть (строка ' + (i + 1) + ')' };
      }
    }

    if (isNew) {
      row = sheet.getLastRow() + 1;
      sheet.getRange(row, 1).setValue(p.login || email);
      sheet.getRange(row, 2).setValue(p.pass || '');
    } else {
      if (p.login) sheet.getRange(row, 1).setValue(p.login);
      if (p.pass)  sheet.getRange(row, 2).setValue(p.pass);
    }
    sheet.getRange(row, 3).setValue(p.name || '');
    sheet.getRange(row, 4).setValue(status);
    const lc = sheet.getRange(row, COL_LESSONS);
    lc.setNumberFormat('@');   // хранить как текст, иначе "1,2" станет числом 1.2
    lc.setValue(lessons);
    sheet.getRange(row, 7).setValue(p.comment || '');
    sheet.getRange(row, 8).setValue(email);

    // Сумма (K), Дата добавления (L), Менеджер (M) — пишем только то, что пришло
    if (p.amount !== undefined) {
      const n = Number(p.amount);
      sheet.getRange(row, 11).setValue(p.amount === '' || isNaN(n) ? '' : n);
    }
    const added = p.added || (isNew ? Utilities.formatDate(new Date(), 'Asia/Dushanbe', 'yyyy-MM-dd') : undefined);
    if (added !== undefined) {
      const c = sheet.getRange(row, 12);
      c.setNumberFormat('@');   // хранить как текст, чтобы Sheets не превращал в дату
      c.setValue(added);
    }
    if (p.manager !== undefined) sheet.getRange(row, 13).setValue(p.manager);

    if (p.expires !== undefined) {
      const c = sheet.getRange(row, COL_EXPIRES);
      c.setNumberFormat('@');
      c.setValue(p.expires);                          // '' = без срока
      sheet.getRange(row, COL_EXP_DONE).clearContent(); // сброс отметки при продлении
    }
    // onEdit-триггер не срабатывает на правки из скрипта — синхронизируем сами
    syncDriveAccessForRow(row);
    writeLog('ADMIN', 'Сохранён пользователь: ' + (email || p.login) + ' [' + status + '] уроки: ' + lessons);
    return { ok: true, row };
  }

  function adminDeleteUser(p) {
    const sheet = getSheet(SHEET_USERS);
    const row   = parseInt(p.row || '0');
    if (row < 2) return { ok: false, error: 'bad row' };
    const email = (sheet.getRange(row, COL_EMAIL).getValue() || '').toString().trim().toLowerCase();
    if (email !== (p.email || '').trim().toLowerCase()) return { ok: false, error: 'row changed, refresh' };

    // Сначала отзываем доступ на Диске, потом удаляем строку
    sheet.getRange(row, COL_STATUS).setValue('denied');
    syncDriveAccessForRow(row);
    sheet.deleteRow(row);
    writeLog('ADMIN', 'Удалён пользователь: ' + email);
    return { ok: true };
  }

  function adminListVideos() {
    const rows = getSheet(SHEET_VIDEOS).getDataRange().getValues();
    const videos = [];
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i][0] && !rows[i][2]) continue;
      videos.push({
        row: i + 1,
        lessonId: parseInt(rows[i][0]) || 0,
        part: parseInt(rows[i][1]) || 0,
        fileId: (rows[i][2] || '').toString(),
        title: (rows[i][3] || '').toString(),
      });
    }
    return { ok: true, videos };
  }

  function adminSaveVideo(p) {
    const sheet = getSheet(SHEET_VIDEOS);
    let row = parseInt(p.row || '0');
    if (!row) row = sheet.getLastRow() + 1;
    sheet.getRange(row, 1, 1, 4).setValues([[
      parseInt(p.lessonId), parseInt(p.part), (p.fileId || '').trim(), p.title || ''
    ]]);
    syncAllUsers(); // выдаём права на новое видео тем, у кого есть этот урок
    writeLog('ADMIN', 'Видео сохранено: урок ' + p.lessonId + ' часть ' + p.part);
    return { ok: true, row };
  }

  function adminDeleteVideo(p) {
    const row = parseInt(p.row || '0');
    if (row < 2) return { ok: false, error: 'bad row' };
    getSheet(SHEET_VIDEOS).deleteRow(row);
    writeLog('ADMIN', 'Видео удалено (строка ' + row + ')');
    return { ok: true };
  }

  function adminLogs() {
    const sheet = getSheet(SHEET_LOGS);
    const last  = sheet.getLastRow();
    if (last < 2) return { ok: true, logs: [] };
    const start = Math.max(2, last - 299);
    const rows  = sheet.getRange(start, 1, last - start + 1, 3).getValues();
    const logs  = rows.reverse().map(r => ({ time: r[0].toString(), who: r[1].toString(), action: r[2].toString() }));
    return { ok: true, logs };
  }

  function logDay(v, tz) {
    if (v instanceof Date) return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
    const m = String(v).match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : '';
  }

  function adminStats(p) {
    const n  = Math.min(parseInt(p.days) || 28, 180);
    const tz = 'Asia/Dushanbe';
    const dayKey = k => Utilities.formatDate(new Date(Date.now() - k * 864e5), tz, 'yyyy-MM-dd');

    const daily = {}, order = [];
    for (let k = 2 * n - 1; k >= 0; k--) {
      const d = dayKey(k);
      order.push(d);
      daily[d] = { views: 0, viewers: {}, logins: 0 };
    }
    const split = order[n]; // первый день текущего периода
    const tot = { cur: { views: 0, logins: 0, v: {} }, prev: { views: 0, logins: 0, v: {} } };
    const lessons = {}, top = {};

    const sheet = getSheet(SHEET_LOGS), last = sheet.getLastRow();
    if (last >= 2) {
      sheet.getRange(2, 1, last - 1, 3).getValues().forEach(r => {
        const o = daily[logDay(r[0], tz)];
        if (!o) return;
        const d   = logDay(r[0], tz);
        const act = (r[2] || '').toString();
        const who = (r[1] || '').toString();
        const t   = d >= split ? tot.cur : tot.prev;
        const m   = act.match(/^getPart: урок (\d+)/);
        if (m) {
          o.views++; o.viewers[who] = 1; t.views++; t.v[who] = 1;
          if (t === tot.cur) {
            lessons[m[1]] = (lessons[m[1]] || 0) + 1;
            top[who] = (top[who] || 0) + 1;
          }
        } else if (/[Вв]ход успешен/.test(act)) {
          o.logins++; t.logins++;
        }
      });
    }

    const fin = t => ({ views: t.views, viewers: Object.keys(t.v).length, logins: t.logins });
    return {
      ok: true,
      daily: order.map(d => ({ date: d, views: daily[d].views, viewers: Object.keys(daily[d].viewers).length, logins: daily[d].logins })),
      totals: { cur: fin(tot.cur), prev: fin(tot.prev) },
      lessons,
      top: Object.keys(top).map(w => ({ who: w, views: top[w] })).sort((a, b) => b.views - a.views).slice(0, 8),
    };
  }

  function normDate(v) {
    if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Dushanbe', 'yyyy-MM-dd');
    const s = (v || '').toString().trim();
    return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : '';
  }

  // Доступ действует включительно до указанной даты
  function isExpired(v) {
    const e = normDate(v);
    if (!e) return false;
    return e < Utilities.formatDate(new Date(), 'Asia/Dushanbe', 'yyyy-MM-dd');
  }

  // Если статус active, но срок вышел, считаем ученика denied
  function effectiveStatus(r) {
    const st = (r[3] || '').toString().trim();
    return (st === 'active' && isExpired(r[COL_EXPIRES - 1])) ? 'denied' : st;
  }

  // Раз в сутки закрывает просроченным доступ к видео на Диске
  function expireSweep() {
    const sheet = getSheet(SHEET_USERS);
    const rows  = sheet.getDataRange().getValues();
    let n = 0;
    for (let i = 1; i < rows.length; i++) {
      const r   = rows[i];
      const exp = normDate(r[COL_EXPIRES - 1]);
      if (!exp || (r[3] || '').toString().trim() !== 'active' || !isExpired(exp)) continue;
      if (normDate(r[COL_EXP_DONE - 1]) === exp) continue;      // уже закрыт
      syncDriveAccessForRow(i + 1);
      const c = sheet.getRange(i + 1, COL_EXP_DONE);
      c.setNumberFormat('@'); c.setValue(exp);
      n++;
    }
    if (n) writeLog('SYSTEM', 'Срок доступа истёк, закрыт доступ у ' + n + ' уч.');
  }

  // Запустить ОДИН РАЗ вручную (кнопка ▶)
  function createExpiryTrigger() {
    ScriptApp.getProjectTriggers().forEach(t => {
      if (t.getHandlerFunction() === 'expireSweep') ScriptApp.deleteTrigger(t);
    });
    ScriptApp.newTrigger('expireSweep').timeBased().everyDays(1).atHour(1).create();
    Logger.log('✅ Ежедневная проверка сроков включена (около 01:00).');
  }
  function fixLessonsColumn() {
    const sheet = getSheet(SHEET_USERS);
    sheet.getRange(2, COL_LESSONS, sheet.getMaxRows() - 1, 1).setNumberFormat('@');
    Logger.log('✅ Колонка "Уроки" теперь текстовая.');
  }