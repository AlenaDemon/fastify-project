// @ts-check

import path from 'path'; // модуль Node.js для работы с путями файловой системы.
import { fileURLToPath } from 'url'; // преобразует URL файла (ES-модуля) в обычный путь.
import fastify from 'fastify'; // фреймворк для создания веб-сервера (аналог Express, но быстрее).
import sqlite3 from 'sqlite3'; // драйвер для работы с SQLite (встроенная база данных).
import view from '@fastify/view'; // плагин для шаблонизации (рендеринг HTML).
import pug from 'pug'; // движок шаблонов.
import formbody from '@fastify/formbody'; // парсит данные из HTML-форм (application/x-www-form-urlencoded).
import { plugin as fastifyReverseRoutes } from 'fastify-reverse-routes'; // генерирует URL по имени маршрута (удобно для ссылок в шаблонах).
import flash from '@fastify/flash'; // система "флеш-сообщений" (одноразовые уведомления, например, после редиректа).
import fastifyCookie from '@fastify/cookie'; // работа с куками.
import fastifySession from '@fastify/secure-session'; // безопасные сессии (хранение данных пользователя между запросами).
import wrapFastify from 'fastify-method-override-wrapper'; // добавляет поддержку PUT, DELETE через скрытое поле _method (если форма отправляет POST, но хочет имитировать DELETE).

import addRoutes from './routes/index.js'; // импорт кастомных маршрутов из файла ./routes/index.js.

export default async () => {
  const __dirname = fileURLToPath(path.dirname(import.meta.url)); // получает текущую директорию 

  const wrappedFastify = wrapFastify(fastify); // оборачивает Fastify для поддержки methodOverride (чтобы формы могли отправлять PUT/DELETE).
  const app = wrappedFastify({
    logger: true, // Включить логирование
    exposeHeadRoutes: false, // Не создавать HEAD-версии маршрутов
  }); // создаётся экземпляр Fastify с логгером.

  const db = new sqlite3.Database(':memory:'); // создаёт БД в оперативной памяти (при перезапуске сервера данные исчезнут).

  const prepareDatabase = () => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE courses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title VARCHAR(255) NOT NULL,
          description TEXT
        )
      `);
      db.run(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          password VARCHAR(255) NOT NULL
        )
      `);
    });

    const courses = [
      { id: 1, title: 'JavaScript', description: 'Курс по языку программирования JavaScript' },
      { id: 2, title: 'Fastify', description: 'Курс по фреймворку Fastify' },
    ];

    const users = [
      { id: 1, name: 'admin', email: 'admin@example.com', password: 'admin' },
    ];
    
    // Заполняем таблицу courses
    const stmtCourses = db.prepare('INSERT INTO courses VALUES (?, ?, ?)');

    courses.forEach((course) => {
      stmtCourses.run(course.id, course.title, course.description);
    });
    stmtCourses.finalize();

    // Заполняем таблицу users
    const stmtUsers = db.prepare('INSERT INTO users VALUES (?, ?, ?, ?)');

    users.forEach((user) => {
      stmtUsers.run(user.id, user.name, user.email, user.password);
    });

    stmtUsers.finalize();
  };

  prepareDatabase(); // иницифлизация базы данных

  await app.register(fastifyReverseRoutes); // Генерация URL по имени маршрута
  await app.register(formbody); // Парсинг данных форм
  await app.register(view, { // Шаблонизация Pug
    engine: {
      pug,
    },
    templates: path.join(__dirname, 'views'),
    defaultContext: {
      route(name, placeholdersValues) {
        return app.reverse(name, placeholdersValues); // Хелпер для генерации URL в шаблонах
      },
    },
  });
  await app.register(fastifyCookie); // Работа с куками
  await app.register(fastifySession, { // Сессии
    secret: 'a secret with minimum length of 32 characters',
  });

  await app.register(flash); // Флеш-сообщения

  addRoutes(app, db); // Подключаем маршруты из routes/index.js
  return app; // Возвращаем готовый экземпляр Fastify
};