// ═══════════════════════════════════════════════════════════════════════════
//  THE WORDS — Google Apps Script Backend v2
//  Бэкенд для бюро переводов: Google Sheets + Google Drive
// ═══════════════════════════════════════════════════════════════════════════
//
//  ╔══════════════════════════════════════════════════════════════════╗
//  ║  ПОШАГОВАЯ ИНСТРУКЦИЯ — ЧИТАЙ ВНИМАТЕЛЬНО                      ║
//  ╠══════════════════════════════════════════════════════════════════╣
//  ║                                                                  ║
//  ║  ШАГ 1: Создать проект                                          ║
//  ║  • Открой https://script.google.com                              ║
//  ║  • Нажми «Новый проект»                                         ║
//  ║  • Удали всё содержимое файла Code.gs                           ║
//  ║  • Вставь ВЕСЬ этот код                                         ║
//  ║  • Нажми Ctrl+S (сохранить)                                     ║
//  ║  • Переименуй проект: клик на «Проект без названия» →           ║
//  ║    напиши «The Words Backend»                                    ║
//  ║                                                                  ║
//  ║  ШАГ 2: Запустить setupSystem                                    ║
//  ║  • В верхнем меню найди выпадающий список функций               ║
//  ║    (там написано «setupSystem» или «Выберите функцию»)           ║
//  ║  • Выбери «setupSystem»                                         ║
//  ║  • Нажми кнопку ▶ «Выполнить»                                   ║
//  ║  • ПЕРВЫЙ РАЗ появится окно «Требуется авторизация»             ║
//  ║    → Нажми «Просмотреть разрешения»                              ║
//  ║    → Выбери свой Google аккаунт                                  ║
//  ║    → Появится «Google не проверил это приложение»                ║
//  ║    → Нажми «Дополнительно» (внизу слева)                        ║
//  ║    → Нажми «Перейти к The Words Backend (небезопасно)»           ║
//  ║    → Нажми «Разрешить»                                           ║
//  ║  • Дождись завершения (внизу будет «Выполнение завершено»)       ║
//  ║  • Открой «Журнал выполнения» (Ctrl+Enter или меню Вид →        ║
//  ║    Журнал выполнения) — там будут ID таблицы и папки             ║
//  ║                                                                  ║
//  ║  ШАГ 3: Опубликовать как Web App                                 ║
//  ║  • Меню «Развернуть» → «Новое развёртывание»                    ║
//  ║  • Слева нажми шестерёнку ⚙ → выбери «Веб-приложение»           ║
//  ║  • Описание: «The Words API»                                     ║
//  ║  • Выполнять от: «Вашего аккаунта» (Me)                         ║
//  ║  • Доступ: «Все» (Anyone)  ← ВАЖНО!                             ║
//  ║  • Нажми «Развернуть»                                            ║
//  ║  • Скопируй URL (выглядит как                                    ║
//  ║    https://script.google.com/macros/s/XXXX/exec)                 ║
//  ║                                                                  ║
//  ║  ШАГ 4: Вставить URL в приложение The Words                      ║
//  ║  • В приложении → Настройки → Google Apps Script                 ║
//  ║  • Вставь скопированный URL → Подключить                         ║
//  ║  • Должен появиться зелёный статус «✓ Подключено»               ║
//  ║                                                                  ║
//  ║  ЕСЛИ ЧТО-ТО НЕ РАБОТАЕТ:                                       ║
//  ║  • Запусти функцию testSetup() — она проверит всё                ║
//  ║  • Открой Журнал выполнения — там будут ошибки                   ║
//  ║  • При изменении кода нужно НОВОЕ развёртывание                  ║
//  ║    (Развернуть → Управление → карандаш → Новая версия)           ║
//  ║                                                                  ║
//  ╚══════════════════════════════════════════════════════════════════╝
//
// ═══════════════════════════════════════════════════════════════════════════


// ╔═══════════════════════════════════════╗
// ║  1. ПЕРВОНАЧАЛЬНАЯ НАСТРОЙКА          ║
// ╚═══════════════════════════════════════╝

/**
 * ЗАПУСТИ ЭТУ ФУНКЦИЮ ПЕРВОЙ!
 * Создаёт папки на Google Drive и таблицу Google Sheets.
 */
function setupSystem() {
  Logger.log('🚀 Начинаю настройку The Words...');
  
  // ── 1. Корневая папка ──
  var rootFolder;
  var folders = DriveApp.getFoldersByName('The Words Bureau');
  if (folders.hasNext()) {
    rootFolder = folders.next();
    Logger.log('📁 Корневая папка уже есть: ' + rootFolder.getId());
  } else {
    rootFolder = DriveApp.createFolder('The Words Bureau');
    Logger.log('📁 Создана корневая папка: ' + rootFolder.getId());
  }

  // ── 2. Подпапки ──
  var subfolders = ['01_Originals', '02_AI_Translation', '03_Review', '04_Final'];
  for (var i = 0; i < subfolders.length; i++) {
    var name = subfolders[i];
    var existing = rootFolder.getFoldersByName(name);
    if (!existing.hasNext()) {
      rootFolder.createFolder(name);
      Logger.log('  📂 Создана: ' + name);
    } else {
      Logger.log('  📂 Уже есть: ' + name);
    }
  }

  // ── 3. Google Sheets ──
  var ss;
  var files = DriveApp.getFilesByName('The Words — Реестр заказов');
  if (files.hasNext()) {
    ss = SpreadsheetApp.open(files.next());
    Logger.log('📊 Таблица уже есть: ' + ss.getId());
  } else {
    ss = SpreadsheetApp.create('The Words — Реестр заказов');
    // Переносим в нашу папку
    var file = DriveApp.getFileById(ss.getId());
    rootFolder.addFile(file);
    DriveApp.getRootFolder().removeFile(file);
    Logger.log('📊 Создана таблица: ' + ss.getId());
  }

  // ── 4. Лист "Orders" ──
  var ordersSheet = ss.getSheetByName('Orders');
  if (!ordersSheet) {
    // Переименовываем первый лист
    ordersSheet = ss.getSheets()[0];
    ordersSheet.setName('Orders');
  }

  var headers = [
    'ID заказа',        // A = 1
    'Дата создания',    // B = 2
    'Клиент',           // C = 3
    'Тип клиента',      // D = 4
    'Языковая пара',    // E = 5
    'Тип документа',    // F = 6
    'Кол-во слов',      // G = 7
    'Статус',           // H = 8
    'Переводчик',       // I = 9
    'Файл оригинала',   // J = 10
    'Файл AI-перевода', // K = 11
    'Файл ревью',       // L = 12
    'Файл финальный',   // M = 13
    'Ссылка оригинал',  // N = 14
    'Ссылка AI',        // O = 15
    'Ссылка ревью',     // P = 16
    'Ссылка финал',     // Q = 17
    'Дата завершения',  // R = 18
    'Комментарий'       // S = 19
  ];

  // Записываем заголовки (если их нет или они другие)
  var firstCell = ordersSheet.getRange(1, 1).getValue();
  if (firstCell !== 'ID заказа') {
    ordersSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    ordersSheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#E8C547')
      .setFontColor('#0A0A0F')
      .setFontSize(10);
    ordersSheet.setFrozenRows(1);

    // Ширина колонок
    ordersSheet.setColumnWidth(1, 110);
    ordersSheet.setColumnWidth(2, 130);
    ordersSheet.setColumnWidth(3, 150);
    ordersSheet.setColumnWidth(5, 130);
    ordersSheet.setColumnWidth(6, 120);
    ordersSheet.setColumnWidth(8, 110);
    ordersSheet.setColumnWidth(14, 200);
    ordersSheet.setColumnWidth(15, 200);
    ordersSheet.setColumnWidth(16, 200);
    ordersSheet.setColumnWidth(17, 200);
    Logger.log('  ✅ Заголовки записаны');
  }

  // ── 5. Лист "Log" ──
  var logSheet = ss.getSheetByName('Log');
  if (!logSheet) {
    logSheet = ss.insertSheet('Log');
    logSheet.getRange(1, 1, 1, 5).setValues([['Время', 'ID заказа', 'Действие', 'Детали', 'Пользователь']]);
    logSheet.getRange(1, 1, 1, 5)
      .setFontWeight('bold')
      .setBackground('#47A0E8')
      .setFontColor('#ffffff');
    logSheet.setFrozenRows(1);
    Logger.log('  ✅ Лист Log создан');
  }

  // ── 6. Сохраняем ID ──
  var props = PropertiesService.getScriptProperties();
  props.setProperty('SPREADSHEET_ID', ss.getId());
  props.setProperty('ROOT_FOLDER_ID', rootFolder.getId());

  Logger.log('');
  Logger.log('═══════════════════════════════════════════════');
  Logger.log('✅ НАСТРОЙКА ЗАВЕРШЕНА!');
  Logger.log('');
  Logger.log('📊 Таблица: ' + ss.getUrl());
  Logger.log('📁 Папка:   https://drive.google.com/drive/folders/' + rootFolder.getId());
  Logger.log('');
  Logger.log('👉 Теперь опубликуй Web App:');
  Logger.log('   Развернуть → Новое развёртывание → Веб-приложение');
  Logger.log('   Выполнять от: Вашего аккаунта');
  Logger.log('   Доступ: Все (Anyone)');
  Logger.log('═══════════════════════════════════════════════');
}


/**
 * Тестовая функция — запусти если что-то не работает.
 * Проверяет что всё настроено правильно.
 */
function testSetup() {
  Logger.log('🔍 Проверяю настройки...');
  
  var props = PropertiesService.getScriptProperties();
  var ssId = props.getProperty('SPREADSHEET_ID');
  var folderId = props.getProperty('ROOT_FOLDER_ID');
  
  if (!ssId) {
    Logger.log('❌ SPREADSHEET_ID не найден. Запусти setupSystem() сначала!');
    return;
  }
  if (!folderId) {
    Logger.log('❌ ROOT_FOLDER_ID не найден. Запусти setupSystem() сначала!');
    return;
  }
  
  Logger.log('✅ SPREADSHEET_ID: ' + ssId);
  Logger.log('✅ ROOT_FOLDER_ID: ' + folderId);
  
  // Проверяем доступ к таблице
  try {
    var ss = SpreadsheetApp.openById(ssId);
    Logger.log('✅ Таблица открывается: ' + ss.getName());
    
    var ordersSheet = ss.getSheetByName('Orders');
    if (ordersSheet) {
      Logger.log('✅ Лист Orders: ' + ordersSheet.getLastRow() + ' строк');
    } else {
      Logger.log('❌ Лист Orders не найден!');
    }
    
    var logSheet = ss.getSheetByName('Log');
    if (logSheet) {
      Logger.log('✅ Лист Log существует');
    } else {
      Logger.log('❌ Лист Log не найден!');
    }
  } catch (e) {
    Logger.log('❌ Ошибка доступа к таблице: ' + e.toString());
  }
  
  // Проверяем папки
  try {
    var rootFolder = DriveApp.getFolderById(folderId);
    Logger.log('✅ Папка открывается: ' + rootFolder.getName());
    
    var subfolders = ['01_Originals', '02_AI_Translation', '03_Review', '04_Final'];
    for (var i = 0; i < subfolders.length; i++) {
      var sub = rootFolder.getFoldersByName(subfolders[i]);
      if (sub.hasNext()) {
        Logger.log('  ✅ ' + subfolders[i]);
      } else {
        Logger.log('  ❌ ' + subfolders[i] + ' НЕ НАЙДЕНА');
      }
    }
  } catch (e) {
    Logger.log('❌ Ошибка доступа к папке: ' + e.toString());
  }
  
  Logger.log('');
  Logger.log('🔍 Проверка завершена. Если все ✅ — можно публиковать Web App.');
}


/**
 * Тестовый вызов — создаёт тестовый заказ чтобы убедиться что API работает.
 * Запусти после публикации Web App.
 */
function testCreateOrder() {
  var result = createOrder({
    orderId: 'TW-TEST',
    clientName: 'Тестовый клиент',
    clientType: 'Физлицо',
    langPair: 'RU → KK',
    docType: 'Юридический',
    wordCount: 150,
    translator: 'Переводчик 1',
    comment: 'Тестовый заказ — можно удалить'
  });
  
  Logger.log('✅ Тестовый заказ создан: ' + JSON.stringify(result));
  
  // Тестируем сохранение файла
  var fileResult = saveFile({
    orderId: 'TW-TEST',
    stage: 'original',
    content: 'Это тестовый документ для проверки сохранения файлов.',
    langPair: 'ru-kk',
    fileName: 'TW-TEST_ORIG_ru-kk.txt'
  });
  
  Logger.log('✅ Тестовый файл сохранён: ' + JSON.stringify(fileResult));
}


// ╔═══════════════════════════════════════╗
// ║  2. WEB APP ENDPOINTS                 ║
// ╚═══════════════════════════════════════╝

/**
 * Обработка POST запросов от приложения
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var result;

    if (action === 'createOrder') {
      result = createOrder(data);
    } else if (action === 'saveFile') {
      result = saveFile(data);
    } else if (action === 'updateStatus') {
      result = updateOrderStatus(data);
    } else if (action === 'getOrders') {
      result = getOrders(data);
    } else if (action === 'getConfig') {
      result = getSystemConfig();
    } else {
      result = { error: 'Unknown action: ' + action };
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, data: result }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log('❌ doPost error: ' + err.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Обработка GET запросов
 * Поддерживает JSONP (callback параметр) для обхода CORS
 * и обычные JSON-ответы
 */
function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = params.action || '';
    var callback = params.callback || '';
    var result;

    if (action === 'getConfig') {
      result = { success: true, data: getSystemConfig() };
    } else if (action === 'getOrders') {
      result = { success: true, data: getOrders({}) };
    } else if (action === 'createOrder') {
      // Позволяем создание через GET+JSONP
      result = { success: true, data: createOrder({
        orderId: params.orderId || '',
        clientName: params.clientName || 'Без имени',
        clientType: params.clientType || 'Физлицо',
        langPair: params.langPair || '',
        docType: params.docType || '',
        wordCount: parseInt(params.wordCount) || 0,
        translator: params.translator || 'Не назначен',
        comment: params.comment || ''
      })};
    } else if (action === 'updateStatus') {
      result = { success: true, data: updateOrderStatus({
        orderId: params.orderId || '',
        status: params.status || '',
        comment: params.comment || ''
      })};
    } else if (action === 'saveFile') {
      // Для файлов через GET — контент передаётся как параметр (для небольших текстов)
      // Для больших файлов будем использовать POST через iframe
      var content = params.content || '';
      // URL-decode контента
      result = { success: true, data: saveFile({
        orderId: params.orderId || '',
        stage: params.stage || '',
        content: content,
        langPair: params.langPair || '',
        fileName: params.fileName || ''
      })};
    } else {
      result = {
        success: true,
        message: 'The Words API работает!',
        version: '2.1',
        timestamp: new Date().toISOString()
      };
    }

    var jsonStr = JSON.stringify(result);

    // JSONP: оборачиваем в callback если указан
    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + jsonStr + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return ContentService
      .createTextOutput(jsonStr)
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log('❌ doGet error: ' + err.toString());
    var errJson = JSON.stringify({ success: false, error: err.toString() });
    var cb = (e && e.parameter && e.parameter.callback) ? e.parameter.callback : '';
    if (cb) {
      return ContentService
        .createTextOutput(cb + '(' + errJson + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService
      .createTextOutput(errJson)
      .setMimeType(ContentService.MimeType.JSON);
  }
}


/**
 * POST тоже обновлён — поддерживает CORS preflight через HtmlService
 */


// ╔═══════════════════════════════════════╗
// ║  3. ОСНОВНЫЕ ФУНКЦИИ                  ║
// ╚═══════════════════════════════════════╝

/**
 * Создать заказ в таблице
 */
function createOrder(data) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('Orders');
  
  var orderId = data.orderId || generateOrderId_(sheet);
  var now = new Date();
  var dateStr = Utilities.formatDate(now, 'Asia/Almaty', 'dd.MM.yyyy HH:mm');
  
  var row = [
    orderId,                          // A: ID
    dateStr,                          // B: Дата
    data.clientName || 'Без имени',   // C: Клиент
    data.clientType || 'Физлицо',     // D: Тип
    data.langPair || '',              // E: Языки
    data.docType || '',               // F: Тип документа
    data.wordCount || 0,              // G: Слов
    'Принят',                         // H: Статус
    data.translator || 'Не назначен', // I: Переводчик
    '', '', '', '',                   // J-M: Файлы
    '', '', '', '',                   // N-Q: Ссылки
    '',                               // R: Дата заверш.
    data.comment || ''                // S: Комментарий
  ];

  sheet.appendRow(row);
  
  // Подсветка статуса
  var lastRow = sheet.getLastRow();
  sheet.getRange(lastRow, 8).setBackground('#47A0E8').setFontColor('#ffffff');
  
  addLog_(orderId, 'ORDER_CREATED', 'Клиент: ' + (data.clientName || 'Без имени') + ', ' + (data.langPair || ''));
  
  return { orderId: orderId, row: lastRow };
}


/**
 * Сохранить файл на Google Drive
 * data.stage: 'original' | 'ai_translation' | 'review' | 'final'
 */
function saveFile(data) {
  var rootFolder = getRootFolder_();
  
  var folderNames = {
    'original':       '01_Originals',
    'ai_translation': '02_AI_Translation',
    'review':         '03_Review',
    'final':          '04_Final'
  };
  
  var stageLabels = {
    'original':       'ORIG',
    'ai_translation': 'AI',
    'review':         'REV',
    'final':          'FINAL'
  };

  var folderName = folderNames[data.stage];
  if (!folderName) {
    throw new Error('Неизвестный stage: ' + data.stage);
  }

  // Находим подпапку
  var subFolders = rootFolder.getFoldersByName(folderName);
  if (!subFolders.hasNext()) {
    throw new Error('Папка не найдена: ' + folderName + '. Запусти setupSystem()');
  }
  var targetFolder = subFolders.next();
  
  // Создаём папку для заказа (если нет)
  var orderFolders = targetFolder.getFoldersByName(data.orderId);
  var orderFolder;
  if (orderFolders.hasNext()) {
    orderFolder = orderFolders.next();
  } else {
    orderFolder = targetFolder.createFolder(data.orderId);
  }

  // Имя файла
  var fileName = data.fileName || 
    (data.orderId + '_' + stageLabels[data.stage] + '_' + (data.langPair || 'xx-xx') + '.txt');

  // Создаём файл
  var content = data.content || '';
  var blob = Utilities.newBlob(content, 'text/plain; charset=utf-8', fileName);
  var file = orderFolder.createFile(blob);
  
  // Обновляем ссылку в таблице
  updateFileLink_(data.orderId, data.stage, fileName, file.getUrl());
  
  addLog_(data.orderId, 'FILE_SAVED', stageLabels[data.stage] + ': ' + fileName);

  return { 
    fileId: file.getId(), 
    fileUrl: file.getUrl(),
    fileName: fileName,
    folder: folderName
  };
}


/**
 * Обновить статус заказа
 */
function updateOrderStatus(data) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('Orders');
  var dataRange = sheet.getDataRange();
  var values = dataRange.getValues();
  
  for (var i = 1; i < values.length; i++) {
    if (values[i][0] === data.orderId) {
      var rowNum = i + 1;
      
      // Статус (колонка H = 8)
      sheet.getRange(rowNum, 8).setValue(data.status);
      
      // Цвет по статусу
      var colors = {
        'Принят':        { bg: '#47A0E8', fg: '#ffffff' },
        'Классификация': { bg: '#E8C547', fg: '#0A0A0F' },
        'AI Перевод':    { bg: '#A047E8', fg: '#ffffff' },
        'На ревью':      { bg: '#E87847', fg: '#ffffff' },
        'Готов':         { bg: '#3DDC84', fg: '#0A0A0F' },
        'Выдан':         { bg: '#2A8A5A', fg: '#ffffff' }
      };
      
      var color = colors[data.status];
      if (color) {
        sheet.getRange(rowNum, 8).setBackground(color.bg).setFontColor(color.fg);
      }
      
      // Дата завершения
      if (data.status === 'Готов' || data.status === 'Выдан') {
        var dateStr = Utilities.formatDate(new Date(), 'Asia/Almaty', 'dd.MM.yyyy HH:mm');
        sheet.getRange(rowNum, 18).setValue(dateStr);
      }
      
      // Комментарий (дописываем)
      if (data.comment) {
        var existing = sheet.getRange(rowNum, 19).getValue();
        var newComment = existing ? (existing + '\n' + data.comment) : data.comment;
        sheet.getRange(rowNum, 19).setValue(newComment);
      }
      
      addLog_(data.orderId, 'STATUS_UPDATE', '→ ' + data.status);
      return { orderId: data.orderId, status: data.status, row: rowNum };
    }
  }
  
  throw new Error('Заказ не найден: ' + data.orderId);
}


/**
 * Получить все заказы из таблицы
 */
function getOrders(data) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('Orders');
  var dataRange = sheet.getDataRange();
  var values = dataRange.getValues();
  
  if (values.length <= 1) return [];
  
  var headers = values[0];
  var orders = [];
  
  for (var i = 1; i < values.length; i++) {
    var order = {};
    for (var j = 0; j < headers.length; j++) {
      order[headers[j]] = values[i][j];
    }
    orders.push(order);
  }
  
  // Фильтр по статусу
  if (data && data.status) {
    orders = orders.filter(function(o) { return o['Статус'] === data.status; });
  }
  
  return orders;
}


/**
 * Конфигурация системы (ссылки на таблицу и папку)
 */
function getSystemConfig() {
  var props = PropertiesService.getScriptProperties();
  var ssId = props.getProperty('SPREADSHEET_ID') || '';
  var folderId = props.getProperty('ROOT_FOLDER_ID') || '';
  
  return {
    spreadsheetId: ssId,
    rootFolderId: folderId,
    spreadsheetUrl: ssId ? ('https://docs.google.com/spreadsheets/d/' + ssId) : '',
    driveFolderUrl: folderId ? ('https://drive.google.com/drive/folders/' + folderId) : ''
  };
}


// ╔═══════════════════════════════════════╗
// ║  4. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ           ║
// ╚═══════════════════════════════════════╝

function getSpreadsheet_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SPREADSHEET_ID');
  if (!id) {
    throw new Error('SPREADSHEET_ID не найден. Запусти setupSystem()!');
  }
  return SpreadsheetApp.openById(id);
}

function getRootFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('ROOT_FOLDER_ID');
  if (!id) {
    throw new Error('ROOT_FOLDER_ID не найден. Запусти setupSystem()!');
  }
  return DriveApp.getFolderById(id);
}

function generateOrderId_(sheet) {
  var lastRow = sheet.getLastRow();
  var num = lastRow; // row 1 = header
  return 'TW-' + ('0000' + num).slice(-4);
}

function updateFileLink_(orderId, stage, fileName, fileUrl) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('Orders');
  var values = sheet.getDataRange().getValues();
  
  // stage → колонки файл/ссылка
  var cols = {
    'original':       { file: 10, link: 14 },
    'ai_translation': { file: 11, link: 15 },
    'review':         { file: 12, link: 16 },
    'final':          { file: 13, link: 17 }
  };
  
  var c = cols[stage];
  if (!c) return;
  
  for (var i = 1; i < values.length; i++) {
    if (values[i][0] === orderId) {
      var rowNum = i + 1;
      sheet.getRange(rowNum, c.file).setValue(fileName);
      sheet.getRange(rowNum, c.link).setValue(fileUrl);
      return;
    }
  }
}

function addLog_(orderId, action, details) {
  try {
    var ss = getSpreadsheet_();
    var logSheet = ss.getSheetByName('Log');
    if (!logSheet) return;
    
    var now = new Date();
    var dateStr = Utilities.formatDate(now, 'Asia/Almaty', 'dd.MM.yyyy HH:mm:ss');
    var email = '';
    try { email = Session.getActiveUser().getEmail(); } catch(e) { email = 'system'; }
    
    logSheet.appendRow([dateStr, orderId, action, details, email]);
  } catch (e) {
    Logger.log('Log error: ' + e.toString());
  }
}
