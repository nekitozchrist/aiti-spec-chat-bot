(function() {
    // Проверка Bridge
    if (!window.vkBridge) {
        document.getElementById('content').innerHTML = 
            '<div class="error">Ошибка: VK Bridge не загружен. Проверьте подключение.</div>';
        return;
    }

    var bridge = window.vkBridge.default || window.vkBridge;
    bridge.send('VKWebAppInit');
    
    var headerEl = document.getElementById('header');
    var contentEl = document.getElementById('content');
    var userToken = null;
    
    // Состояние - текущий экран
    var currentScreen = 'main';
    
    // Тексты ответов (синхронный кэш)
    var cache = {
        mainMenu: null,
        knowledgeCategories: null,
        knowledgeTexts: {},
        diagnosticsList: null,
        diagnosticSolutions: {},
        info: null
    };
    
    // Получение токена перед запуском
    function initApp() {
        contentEl.innerHTML = '<div class="loading">Авторизация...</div>';
        
        bridge.send("VKWebAppGetAuthToken", {
            "app_id": 54477515,  // ID вашего приложения
            "scope": ""           // базовые права
        }).then(function(data) {
            userToken = data.access_token;
            showMainMenu();
        }).catch(function(error) {
            console.error('Auth error:', error);
            contentEl.innerHTML = '<div class="error">Ошибка авторизации. Попробуйте перезагрузить приложение.</div>';
        });
    }
    
    // Универсальная функция вызова процедур
    function callProcedure(method, params, callback) {
        if (!userToken) {
            contentEl.innerHTML = '<div class="error">Нет токена доступа</div>';
            return;
        }
        
        var requestParams = {
            v: '5.131',
            access_token: userToken
        };
        
        // Добавляем пользовательские параметры
        for (var key in params) {
            if (params.hasOwnProperty(key)) {
                requestParams[key] = params[key];
            }
        }
        
        bridge.send('VKWebAppCallAPIMethod', {
            method: 'execute.' + method,
            params: requestParams
        }).then(function(result) {
            callback(result.response);
        }).catch(function(error) {
            console.error('Procedure error:', error);
            contentEl.innerHTML = '<div class="error">Ошибка загрузки данных</div>';
        });
    }
    
    // Функция отображения главного меню
    function showMainMenu() {
        currentScreen = 'main';
        headerEl.innerHTML = '';
        
        if (cache.mainMenu) {
            renderMainMenu(cache.mainMenu);
            return;
        }
        
        contentEl.innerHTML = '<div class="loading">Загрузка...</div>';
        
        callProcedure('getMainMenu', {}, function(data) {
            cache.mainMenu = data;
            renderMainMenu(data);
        });
    }
    
    function renderMainMenu(data) {
        var html = '';
        for (var i = 0; i < data.buttons.length; i++) {
            var btn = data.buttons[i];
            html += '<button class="menu-item" onclick="app.handleMainButton(\'' + btn.action + '\', \'' + (btn.param || '') + '\')">' + btn.icon + ' ' + btn.title + '</button>';
        }
        contentEl.innerHTML = html;
    }
    
    // Категории знаний
    function showKnowledgeCategories() {
        currentScreen = 'knowledge';
        headerEl.innerHTML = '<button class="back-btn" onclick="app.showMainMenu()">← Назад</button>';
        
        if (cache.knowledgeCategories) {
            renderKnowledgeCategories(cache.knowledgeCategories);
            return;
        }
        
        contentEl.innerHTML = '<div class="loading">Загрузка...</div>';
        
        callProcedure('getKnowledgeCategories', {}, function(data) {
            cache.knowledgeCategories = data;
            renderKnowledgeCategories(data);
        });
    }
    
    function renderKnowledgeCategories(data) {
        var html = '';
        for (var i = 0; i < data.categories.length; i++) {
            var cat = data.categories[i];
            html += '<button class="menu-item" onclick="app.showKnowledgeContent(\'' + cat.key + '\')">' + cat.icon + ' ' + cat.title + '</button>';
        }
        contentEl.innerHTML = html;
    }
    
    // Текст категории
    function showKnowledgeContent(key) {
        currentScreen = 'category:' + key;
        headerEl.innerHTML = '<button class="back-btn" onclick="app.showKnowledgeCategories()">← Назад</button>';
        
        if (cache.knowledgeTexts[key]) {
            contentEl.innerHTML = '<div class="kb-text">' + cache.knowledgeTexts[key] + '</div>';
            return;
        }
        
        contentEl.innerHTML = '<div class="loading">Загрузка...</div>';
        
        callProcedure('getKnowledgeText', { category: key }, function(data) {
            cache.knowledgeTexts[key] = data.text;
            contentEl.innerHTML = '<div class="kb-text">' + data.text + '</div>';
        });
    }
    
    // Диагностика - список проблем
    function showDiagnosticsList() {
        currentScreen = 'diagnostics';
        headerEl.innerHTML = '<button class="back-btn" onclick="app.showMainMenu()">← Назад</button>';
        
        if (cache.diagnosticsList) {
            renderDiagnosticsList(cache.diagnosticsList);
            return;
        }
        
        contentEl.innerHTML = '<div class="loading">Загрузка...</div>';
        
        callProcedure('getDiagnosticsList', {}, function(data) {
            cache.diagnosticsList = data;
            renderDiagnosticsList(data);
        });
    }
    
    function renderDiagnosticsList(data) {
        var html = '';
        for (var i = 0; i < data.problems.length; i++) {
            var p = data.problems[i];
            html += '<button class="menu-item" onclick="app.showDiagnosticSolution(\'' + p.key + '\')">' + p.icon + ' ' + p.title + '</button>';
        }
        contentEl.innerHTML = html;
    }
    
    // Решение диагностики
    function showDiagnosticSolution(key) {
        currentScreen = 'solution:' + key;
        headerEl.innerHTML = '<button class="back-btn" onclick="app.showDiagnosticsList()">← Назад</button>';
        
        if (cache.diagnosticSolutions[key]) {
            renderDiagnosticSolution(key, cache.diagnosticSolutions[key]);
            return;
        }
        
        contentEl.innerHTML = '<div class="loading">Загрузка...</div>';
        
        callProcedure('getDiagnosticSolution', { problem: key }, function(data) {
            cache.diagnosticSolutions[key] = data.text;
            renderDiagnosticSolution(key, data.text);
        });
    }
    
    function renderDiagnosticSolution(key, text) {
        var html = '<div class="kb-text">' + text + '</div>';
        html += '<div class="solution-actions">';
        html += '<button class="menu-item btn-success" onclick="app.problemSolved()">✅ Проблема решена</button>';
        html += '<button class="menu-item btn-danger" onclick="app.needOperator()">❌ Нужна помощь</button>';
        html += '</div>';
        contentEl.innerHTML = html;
    }
    
    // Информация о боте
    function showInfo() {
        currentScreen = 'info';
        headerEl.innerHTML = '<button class="back-btn" onclick="app.showMainMenu()">← Назад</button>';
        
        if (cache.info) {
            contentEl.innerHTML = '<div class="kb-text">' + cache.info + '</div>';
            return;
        }
        
        contentEl.innerHTML = '<div class="loading">Загрузка...</div>';
        
        callProcedure('getInfo', {}, function(data) {
            cache.info = data.text;
            contentEl.innerHTML = '<div class="kb-text">' + data.text + '</div>';
        });
    }
    
    // Обработчики действий
    function problemSolved() {
        alert('✅ Отлично! Рады, что помогли.');
        showMainMenu();
    }
    
    function needOperator() {
        bridge.send('VKWebAppOpenApp', {
            app_id: 6123443123,
            owner_id: -214856459
        }).catch(function() {
            alert('Не удалось открыть чат. Обратитесь в поддержку.');
        });
    }
    
    function handleMainButton(action, param) {
        if (action === 'knowledge') {
            showKnowledgeCategories();
        } else if (action === 'diagnostics') {
            showDiagnosticsList();
        } else if (action === 'info') {
            showInfo();
        }
    }
    
    // Экспортируем функции в глобальную область
    window.app = {
        showMainMenu: showMainMenu,
        showKnowledgeCategories: showKnowledgeCategories,
        showKnowledgeContent: showKnowledgeContent,
        showDiagnosticsList: showDiagnosticsList,
        showDiagnosticSolution: showDiagnosticSolution,
        showInfo: showInfo,
        handleMainButton: handleMainButton,
        problemSolved: problemSolved,
        needOperator: needOperator
    };
    
    // Старт с авторизацией
    initApp();
})();
