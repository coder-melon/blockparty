
const userIdInput = document.getElementById('userIdInput');
const sleepTimeInput = document.getElementById('sleepTimeInput');
const activeText = document.getElementById('taskActive');

let userId = userIdInput.value;
let sleepTime = sleepTimeInput.value;

chrome.runtime.connect({ name: "popup" });

// Listen for messages from the background script
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === 'backgroundTaskActive') {
        backgroundTaskActive();
    } else if (message.action === 'backgroundTaskInactive') {
        backgroundTaskInactive();
    }
    if (message.action === 'updateListProgress') {
        document.getElementById('listProgress').textContent = message.progressText;
    } else if (message.action === 'updateBlockProgress') {
        document.getElementById('blockProgress').textContent = message.progressText;
    }
});

// Reset UI
document.getElementById('resetButton').addEventListener('click', function () {
    backgroundTaskInactive();
});

// Function to toggle visibility of the configuration tab
document.getElementById('configButton').addEventListener('click', function () {
    var configTab = document.getElementById('configTab');
    if (configTab.style.display === 'none') {
        configTab.style.display = 'block';
    } else {
        configTab.style.display = 'none';
    }
});

// Event listener for the start button
document.getElementById('startButton').addEventListener('click', async function () {
    // Send a message to the background script with user input values
    chrome.runtime.sendMessage({
        action: 'startBlockingProcess',
        userId: userId,
        sleepTime: sleepTime
    });
});

// Function to update userId variable when input changes
userIdInput.addEventListener('input', function () {
    userId = userIdInput.value;
});

// Function to update sleepTime variable when input changes
sleepTimeInput.addEventListener('input', function () {
    sleepTime = sleepTimeInput.value;
});

async function backgroundTaskActive() {
    startButton.disabled = true;
    activeText.style.display = 'block';
}

// Function to enable the start button and set active to false
async function backgroundTaskInactive() {
    startButton.disabled = false;
    activeText.style.display = 'none';
}
