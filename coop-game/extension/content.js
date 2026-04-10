// Content script - floating ball game

(function () {
    if (window.monkeyTypewriterInjected) return;
    window.monkeyTypewriterInjected = true;

    const game = {
        letterPool: { 't': 3, 'o': 4, 'b': 2, 'e': 2, 'n': 1, 'r': 1 },
        goalPhrase: 'to be or not to be',
        wordPattern: [2, 2, 2, 3, 2, 2],
        currentTarget: '',
        currentTyped: '',
        errorCount: 0,
        lineCount: 0,
        isStarted: false,
        miniMode: false,
        theme: 'light',
        globalSuccess: 0,
        isDragging: false,
        dragOffset: { x: 0, y: 0 }
    };

    const themes = {
        light: {
            bg: '#f5f0e6',
            fg: '#2a2520',
            paper: '#faf6ed',
            muted: '#8b7355',
            keyBg: '#e8e0d0',
            accent: '#c9a959'
        },
        dark: {
            bg: '#1a1815',
            fg: '#f0e6d6',
            paper: '#252220',
            muted: '#a08060',
            keyBg: '#2a2825',
            accent: '#c9a959'
        }
    };

    function generateSequence() {
        let letters = [];
        Object.keys(game.letterPool).forEach(l => {
            for (let i = 0; i < game.letterPool[l]; i++) letters.push(l);
        });
        for (let i = letters.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [letters[i], letters[j]] = [letters[j], letters[i]];
        }
        let result = [], idx = 0;
        for (let len of game.wordPattern) {
            let word = '';
            for (let i = 0; i < len; i++) word += letters[idx++];
            result.push(word);
        }
        return result.join(' ');
    }

    function applyTheme() {
        const t = themes[game.theme];
        ball.style.background = t.paper;
        ball.style.borderColor = t.fg;
        ball.style.color = t.fg;
        panel.style.background = t.paper;
        panel.style.borderColor = t.fg;

        panel.querySelector('#mk-title').style.color = t.fg;
        panel.querySelector('#mk-tw').style.background = t.bg;
        panel.querySelector('#mk-tw').style.borderColor = t.fg;

        panel.querySelector('.mk-kb').style.background = t.keyBg;
        panel.querySelector('.mk-kb').style.borderColor = t.fg;

        panel.querySelectorAll('.mk-key').forEach(k => {
            k.style.background = t.paper;
            k.style.borderColor = t.fg;
            k.style.color = t.fg;
        });

        panel.querySelectorAll('.mk-btn').forEach(b => {
            b.style.background = t.paper;
            b.style.borderColor = t.fg;
            b.style.color = t.fg;
        });

        render();
    }

    // Ball with "M" text (draggable)
    const ball = document.createElement('div');
    ball.id = 'mk-ball';
    ball.style.cssText = `
        position: fixed;
        bottom: 15px;
        right: 15px;
        width: 36px;
        height: 36px;
        background: #faf6ed;
        border: 2px solid #2a2520;
        cursor: grab;
        z-index: 999999;
        display: none;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        font-family: 'Press Start 2P', monospace;
        font-size: 14px;
        color: #2a2520;
        user-select: none;
    `;
    ball.textContent = 'M';

    // Mini panel
    const panel = document.createElement('div');
    panel.id = 'mk-panel';
    panel.style.cssText = `
        position: fixed;
        bottom: 60px;
        right: 15px;
        width: 230px;
        background: #faf6ed;
        border: 3px solid #2a2520;
        padding: 10px;
        z-index: 999998;
        display: none;
        font-family: 'VT323', monospace;
        border-radius: 6px;
        box-shadow: 0 3px 12px rgba(0,0,0,0.15);
    `;

    panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span id="mk-title" style="font-family:'Press Start 2P',monospace;font-size:9px;">MONKEY</span>
            <div style="display:flex;gap:4px;">
                <button class="mk-btn" id="mk-l" style="font-size:11px;padding:2px 6px;border:2px solid #2a2520;background:#faf6ed;border-radius:3px;cursor:pointer;">L</button>
                <button class="mk-btn" id="mk-d" style="font-size:11px;padding:2px 6px;border:2px solid #2a2520;background:#faf6ed;border-radius:3px;cursor:pointer;">D</button>
            </div>
            <span id="mk-x" style="cursor:pointer;font-size:16px;color:#8b7355;">x</span>
        </div>
        <div id="mk-tw" style="border:2px solid #2a2520;background:#f5f0e6;padding:8px;min-height:45px;font-size:14px;margin-bottom:8px;border-radius:4px;"></div>
        <div class="mk-kb" style="border:2px solid #2a2520;background:#e8e0d0;padding:6px;border-radius:4px;">
            <div style="display:flex;justify-content:center;gap:3px;margin-bottom:3px;">
                <div class="mk-key" data-key="t" style="width:20px;height:20px;border:2px solid #2a2520;background:#faf6ed;display:flex;align-items:center;justify-content:center;font-size:12px;border-radius:3px;cursor:pointer;">T</div>
                <div class="mk-key" data-key="o" style="width:20px;height:20px;border:2px solid #2a2520;background:#faf6ed;display:flex;align-items:center;justify-content:center;font-size:12px;border-radius:3px;cursor:pointer;">O</div>
                <div class="mk-key" data-key="b" style="width:20px;height:20px;border:2px solid #2a2520;background:#faf6ed;display:flex;align-items:center;justify-content:center;font-size:12px;border-radius:3px;cursor:pointer;">B</div>
                <div class="mk-key" data-key="e" style="width:20px;height:20px;border:2px solid #2a2520;background:#faf6ed;display:flex;align-items:center;justify-content:center;font-size:12px;border-radius:3px;cursor:pointer;">E</div>
                <div class="mk-key" data-key="n" style="width:20px;height:20px;border:2px solid #2a2520;background:#faf6ed;display:flex;align-items:center;justify-content:center;font-size:12px;border-radius:3px;cursor:pointer;">N</div>
                <div class="mk-key" data-key="r" style="width:20px;height:20px;border:2px solid #2a2520;background:#faf6ed;display:flex;align-items:center;justify-content:center;font-size:12px;border-radius:3px;cursor:pointer;">R</div>
            </div>
            <div style="display:flex;justify-content:center;gap:3px;">
                <div class="mk-key" data-key=" " style="width:65px;height:20px;border:2px solid #2a2520;background:#faf6ed;display:flex;align-items:center;justify-content:center;font-size:10px;border-radius:3px;cursor:pointer;">SPACE</div>
            </div>
        </div>
        <div style="font-size:11px;display:flex;justify-content:space-between;margin-top:8px;color:#8b7355;">
            <span>Err: <span id="mk-err">0</span></span>
            <span>Lines: <span id="mk-ln">0</span></span>
        </div>
    `;

    const host = document.createElement('div');
    host.style.all = 'initial';
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });
    shadow.appendChild(ball);
    shadow.appendChild(panel);

    function render() {
        if (!game.currentTarget) newLine();
        const t = themes[game.theme];
        let html = '<div style="display:flex;align-items:center;height:20px;">';
        for (let i = 0; i < game.currentTarget.length; i++) {
            const char = game.currentTarget[i];
            const typed = game.currentTyped[i];
            html += `<span style="width:12px;height:18px;display:inline-flex;align-items:center;justify-content:center;position:relative;">`;
            if (char !== ' ') {
                html += `<span style="opacity:0.55;font-size:13px;color:${t.muted};">${char}</span>`;
            }
            if (typed) {
                html += `<span style="position:absolute;font-size:13px;color:${t.fg};">${typed}</span>`;
            }
            if (i === game.currentTyped.length) {
                html += `<span style="position:absolute;bottom:1px;width:8px;height:2px;background:${t.fg};"></span>`;
            }
            html += '</span>';
        }
        html += '</div>';
        shadow.querySelector('#mk-tw').innerHTML = html;
        shadow.querySelector('#mk-err').textContent = game.errorCount;
        shadow.querySelector('#mk-ln').textContent = game.lineCount;
    }

    function newLine() {
        game.currentTarget = generateSequence();
        game.currentTyped = '';
        game.isStarted = true;
    }

    function handleKey(key) {
        if (!game.isStarted) return;
        const valid = ['t', 'o', 'b', 'e', 'n', 'r', ' '];
        if (game.currentTyped.length >= game.currentTarget.length) return;
        const expected = game.currentTarget[game.currentTyped.length];

        const t = themes[game.theme];
        const keyEl = shadow.querySelector(`.mk-key[data-key="${key.toLowerCase()}"]`);
        if (keyEl) {
            keyEl.style.background = t.fg;
            keyEl.style.color = t.paper;
            setTimeout(() => applyTheme(), 70);
        }

        if (expected === ' ') {
            if (key === ' ') game.currentTyped += ' ';
            else { game.errorCount++; render(); return; }
        } else {
            if (!valid.includes(key.toLowerCase())) { game.errorCount++; render(); return; }
            if (key.toLowerCase() === expected) game.currentTyped += key.toLowerCase();
            else { game.errorCount++; render(); return; }
        }

        if (game.currentTyped.length === game.currentTarget.length) {
            game.lineCount++;
            if (game.currentTyped === game.goalPhrase) {
                game.globalSuccess++;
                alert('TO BE OR NOT TO BE\n\nCongratulations!\nWe never expected anyone to make it...\nPeople with same accomplishment: ' + game.globalSuccess);
                game.errorCount = 0;
                game.lineCount = 0;
            }
            newLine();
        }
        render();
    }

    function toggle() {
        game.miniMode = !game.miniMode;
        panel.style.display = game.miniMode ? 'block' : 'none';
        if (game.miniMode && !game.currentTarget) { newLine(); render(); }
    }

    function showBall() { ball.style.display = 'flex'; }
    function hideBall() { ball.style.display = 'none'; panel.style.display = 'none'; game.miniMode = false; }

    // Draggable ball
    ball.addEventListener('mousedown', (e) => {
        game.isDragging = true;
        game.dragOffset.x = e.clientX - ball.offsetLeft;
        game.dragOffset.y = e.clientY - ball.offsetTop;
        ball.style.cursor = 'grabbing';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!game.isDragging) return;
        const x = e.clientX - game.dragOffset.x;
        const y = e.clientY - game.dragOffset.y;
        ball.style.left = x + 'px';
        ball.style.top = y + 'px';
        ball.style.right = 'auto';
        ball.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
        if (game.isDragging) {
            game.isDragging = false;
            ball.style.cursor = 'grab';
        }
    });

    // Click to toggle (only if not dragging)
    ball.addEventListener('click', (e) => {
        if (!game.isDragging) toggle();
    });

    shadow.querySelector('#mk-x').addEventListener('click', toggle);
    shadow.querySelector('#mk-l').addEventListener('click', () => { game.theme = 'light'; applyTheme(); });
    shadow.querySelector('#mk-d').addEventListener('click', () => { game.theme = 'dark'; applyTheme(); });

    shadow.querySelectorAll('.mk-key').forEach(key => {
        key.addEventListener('click', () => handleKey(key.dataset.key));
    });

    document.addEventListener('keydown', (e) => {
        if (!game.miniMode) return;
        if (e.key === 'Escape') { game.errorCount = 0; game.lineCount = 0; newLine(); render(); return; }
        if (e.key.length === 1) handleKey(e.key);
        if (e.key === ' ') e.preventDefault();
    });

    chrome.runtime.onMessage?.addListener((msg) => {
        if (msg.action === 'toggle') {
            if (ball.style.display === 'none' || ball.style.display === '') {
                showBall(); chrome.storage.local.set({ monkeyEnabled: true });
            } else {
                hideBall(); chrome.storage.local.set({ monkeyEnabled: false });
            }
        }
    });

    chrome.storage.local.get(['monkeyEnabled', 'monkeyTheme'], (r) => {
        if (r.monkeyTheme) game.theme = r.monkeyTheme;
        if (r.monkeyEnabled) showBall();
        applyTheme();
    });
})();