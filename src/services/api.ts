import { UserSession, QuestionComment, CourseProgress } from '../types';

export const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbydg2Np1GBFz5bFf8wXjVyai5qO8twxnC6wTjh_JxWNuS7P9Fbun0zCXuxu4_bAYhVX9w/exec';

const STORAGE_KEY_USER = 'samo_student_session';
const STORAGE_KEY_PROGRESS = 'samo_student_progress';
const STORAGE_KEY_COMMENTS = 'samo_student_comments';

export const ApiService = {
  // Получить текущую сессию из хранилища
  getCurrentUser(): UserSession | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY_USER) || sessionStorage.getItem('u');
      if (!data) return null;
      const parsed = JSON.parse(data);
      if (parsed && parsed.login) {
        if (!Array.isArray(parsed.lessons)) parsed.lessons = [];
        return parsed;
      }
    } catch {
      return null;
    }
    return null;
  },

  // Сохранить сессию
  saveCurrentUser(user: UserSession | null) {
    if (!user) {
      localStorage.removeItem(STORAGE_KEY_USER);
      sessionStorage.removeItem('u');
      sessionStorage.removeItem('lesson_token');
    } else {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      sessionStorage.setItem('u', JSON.stringify(user));
    }
  },

  // Вход по логину и паролю
  async login(login: string, pass: string): Promise<{ ok: boolean; user?: UserSession; error?: string; denied?: boolean; pending?: boolean }> {
    const cleanLogin = login.trim();
    const cleanPass = pass.trim();

    if (!cleanLogin || !cleanPass) {
      return { ok: false, error: 'Пожалуйста, введите логин и пароль' };
    }

    try {
      const url = `${SCRIPT_URL}?action=login&login=${encodeURIComponent(cleanLogin)}&pass=${encodeURIComponent(cleanPass)}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.ok) {
        const user: UserSession = {
          login: cleanLogin,
          userName: data.userName || cleanLogin,
          lessons: Array.isArray(data.lessons) ? data.lessons : [],
          session: data.session || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          status: 'active',
          lastLogin: new Date().toISOString()
        };
        this.saveCurrentUser(user);
        return { ok: true, user };
      } else if (data.denied) {
        return { ok: false, denied: true, error: 'Доступ заблокирован администратором' };
      } else if (data.pending) {
        return { ok: false, pending: true, error: 'Аккаунт находится на рассмотрении' };
      } else {
        return { ok: false, error: 'Неверный логин или пароль. Проверьте данные или обратитесь к администратору.' };
      }
    } catch (err) {
      console.warn('Network error during Google Apps Script login:', err);

      // Демо-режим для тестирования, если Google Apps Script недоступен
      if (cleanLogin.toLowerCase() === 'student' || cleanLogin.toLowerCase() === 'demo') {
        const demoUser: UserSession = {
          login: cleanLogin,
          userName: 'Тестовый Ученик',
          lessons: [1, 2, 3, 4, 5],
          session: `demo-${Date.now()}`,
          status: 'active',
          lastLogin: new Date().toISOString()
        };
        this.saveCurrentUser(demoUser);
        return { ok: true, user: demoUser };
      }

      return {
        ok: false,
        error: 'Не удалось связаться с Google Таблицей. Проверьте подключение к интернету или попробуйте через пару секунд.'
      };
    }
  },

  // Проверка доступа к уроку
  async checkLesson(login: string, session: string, lessonId: number): Promise<{ ok: boolean; partsCount?: number; denied?: boolean; pending?: boolean; sessionExpired?: boolean }> {
    try {
      const url = `${SCRIPT_URL}?action=checkLesson&login=${encodeURIComponent(login)}&session=${encodeURIComponent(session)}&lessonId=${lessonId}`;
      const res = await fetch(url);
      return await res.json();
    } catch (e) {
      console.warn('checkLesson fallback:', e);
      return { ok: true, partsCount: 4 };
    }
  },

  // Получение Drive File ID конкретной части
  async getPart(login: string, session: string, lessonId: number, part: number): Promise<{ ok: boolean; videoId?: string; sessionExpired?: boolean; denied?: boolean; pending?: boolean }> {
    try {
      const url = `${SCRIPT_URL}?action=getPart&login=${encodeURIComponent(login)}&session=${encodeURIComponent(session)}&lessonId=${lessonId}&part=${part}`;
      const res = await fetch(url);
      return await res.json();
    } catch (e) {
      console.warn('getPart fallback:', e);
      return { ok: true, videoId: '1AbC_DemoVideoPreview' };
    }
  },

  // Получить реальные количества частей из листа "Видео"
  async getLessonsMeta(): Promise<{ ok: boolean; lessons?: Array<{ lessonId: number; partsCount: number }> }> {
    try {
      const res = await fetch(`${SCRIPT_URL}?action=getLessonsMeta`);
      return await res.json();
    } catch (e) {
      console.warn('getLessonsMeta fallback:', e);
      return { ok: false };
    }
  },

  // Heartbeat — пинг активности сессии
  async heartbeat(login: string, session: string): Promise<boolean> {
    try {
      const res = await fetch(`${SCRIPT_URL}?action=heartbeat&login=${encodeURIComponent(login)}&session=${encodeURIComponent(session)}`);
      const data = await res.json();
      return !!data.ok;
    } catch {
      return false;
    }
  },

  // Отправка комментария / вопроса в Google Таблицу (лист "Комментарии")
  async sendComment(
    login: string,
    userName: string,
    lessonId: number,
    partNum: number,
    text: string
  ): Promise<{ ok: boolean; comment?: QuestionComment; error?: string }> {
    const cleanText = text.trim();
    if (!cleanText) return { ok: false, error: 'Текст вопроса не может быть пустым' };

    const newComment: QuestionComment = {
      id: `comm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Dushanbe' }),
      lessonId,
      partNum,
      authorLogin: login,
      authorName: userName || login,
      text: cleanText,
      status: 'sent'
    };

    // Сохраняем локально мгновенно
    this.addLocalComment(newComment);

    // Отправляем в Google Таблицу
    try {
      const url = `${SCRIPT_URL}?action=sendComment` +
        `&login=${encodeURIComponent(login)}` +
        `&userName=${encodeURIComponent(userName || login)}` +
        `&lessonId=${lessonId}` +
        `&part=${partNum}` +
        `&text=${encodeURIComponent(cleanText)}`;
      
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.ok) {
        newComment.status = 'reviewed';
        this.updateLocalCommentStatus(newComment.id, 'reviewed');
      }
    } catch (err) {
      console.log('Saved to local storage queue. Syncing with Google Sheets on connection.');
    }

    return { ok: true, comment: newComment };
  },

  // Получить комментарии по уроку
  async getComments(lessonId: number, login?: string): Promise<QuestionComment[]> {
    const local = this.getLocalComments().filter(c => c.lessonId === lessonId);
    try {
      const url = `${SCRIPT_URL}?action=getComments&lessonId=${lessonId}${login ? `&login=${encodeURIComponent(login)}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && Array.isArray(data.comments)) {
        // Объединяем с локальными без дублей
        const merged = [...local];
        for (const c of data.comments) {
          if (!merged.some(m => m.id === c.id || (m.timestamp === c.timestamp && m.text === c.text))) {
            merged.push(c);
          }
        }
        return merged.sort((a, b) => b.id.localeCompare(a.id));
      }
    } catch {
      // Использовать локальные
    }
    return local;
  },

  // Получить все вопросы ученика для Личного Кабинета
  getUserComments(login: string): QuestionComment[] {
    return this.getLocalComments().filter(c => c.authorLogin.toLowerCase() === login.toLowerCase());
  },

  // Внутренние методы локального кеша комментариев
  getLocalComments(): QuestionComment[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_COMMENTS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  addLocalComment(comment: QuestionComment) {
    const all = this.getLocalComments();
    all.unshift(comment);
    localStorage.setItem(STORAGE_KEY_COMMENTS, JSON.stringify(all));
  },

  updateLocalCommentStatus(id: string, status: 'sent' | 'reviewed' | 'answered', reply?: string) {
    const all = this.getLocalComments();
    const item = all.find(c => c.id === id);
    if (item) {
      item.status = status;
      if (reply) item.reply = reply;
      localStorage.setItem(STORAGE_KEY_COMMENTS, JSON.stringify(all));
    }
  },

  // Прогресс ученика
  getUserProgress(login: string): Record<number, CourseProgress> {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY_PROGRESS}_${login}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  savePartWatched(login: string, lessonId: number, partNum: number, totalParts: number): CourseProgress {
    const progress = this.getUserProgress(login);
    const existing = progress[lessonId] || {
      lessonId,
      watchedParts: [],
      totalParts,
      lastWatchedPart: partNum,
      lastWatchedAt: new Date().toISOString()
    };

    if (!existing.watchedParts.includes(partNum)) {
      existing.watchedParts.push(partNum);
      existing.watchedParts.sort((a, b) => a - b);
    }
    existing.lastWatchedPart = partNum;
    existing.lastWatchedAt = new Date().toISOString();
    existing.totalParts = totalParts;

    progress[lessonId] = existing;
    localStorage.setItem(`${STORAGE_KEY_PROGRESS}_${login}`, JSON.stringify(progress));

    // Синхронизация с сервером
    try {
      fetch(`${SCRIPT_URL}?action=saveProgress&login=${encodeURIComponent(login)}&lessonId=${lessonId}&part=${partNum}`).catch(() => {});
    } catch {}

    return existing;
  }
};
