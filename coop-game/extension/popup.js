// Popup script
document.getElementById('toggleBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.tabs.sendMessage(tab.id, { action: 'toggle' });

    // Update button text and style
    const btn = document.getElementById('toggleBtn');
    chrome.storage.local.get(['monkeyEnabled'], (result) => {
        const newState = !result.monkeyEnabled;
        chrome.storage.local.set({ monkeyEnabled: newState });
        btn.textContent = newState ? 'DISABLE FLOATING BALL' : 'ENABLE FLOATING BALL';
        btn.classList.toggle('enabled', newState);
    });
});

// Load current state
chrome.storage.local.get(['monkeyEnabled'], (result) => {
    const btn = document.getElementById('toggleBtn');
    btn.textContent = result.monkeyEnabled ? 'DISABLE FLOATING BALL' : 'ENABLE FLOATING BALL';
    btn.classList.toggle('enabled', !!result.monkeyEnabled);
});