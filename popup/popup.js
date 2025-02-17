
const userIdInput = document.getElementById('userIdInput');
const sleepTimeInput = document.getElementById('sleepTimeInput');
const taskActiveTab = document.getElementById('taskActive');
const configTab = document.getElementById('configTab');
const errorTab = document.getElementById('errorTab');
const startButton = document.getElementById('startButton');
const configButton = document.getElementById("configButton");
const resetButton = document.getElementById('resetButton');

// Defaults
let username = "chopping.block2024";
let sleepTimeInSeconds = 60; // 1 minute

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
resetButton.addEventListener('click', function () {
    backgroundTaskInactive();
});

// Function to toggle visibility of the configuration tab
configButton.addEventListener('click', function () {
    if (configTab.style.display === 'none') {
        configTab.style.display = 'block';
    } else {
        configTab.style.display = 'none';
    }
});

// Event listener for the start button
startButton.addEventListener('click', async function () {
    let userId = await getUserId(username);

    if (userId == null) {
        displayErrorMessage("User not found. Please enter a valid username.");
        return;
    }
    if (errorTab.style.display === 'block') {
        errorTab.style.display = 'none';
    }

    // Send a message to the background script with user input values
    chrome.runtime.sendMessage({
        action: 'startBlockingProcess',
        userId: userId,
        sleepTime: sleepTimeInSeconds
    });
});

// Function to update userId variable when input changes
userIdInput.addEventListener('input', async function () {
    username = userIdInput.value;
});

// Function to update sleepTime variable when input changes
sleepTimeInput.addEventListener('input', function () {
    sleepTimeInSeconds = sleepTimeInput.value;
});

async function getUserId(username) {
    let result;
    try {
        result = await fetch(`https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`, {
            "credentials": "include",
            "headers": {
                "X-IG-App-ID": "936619743392459"
            }
        }).then((a) => a.json());
        return result.data.user.id;
    } catch (error) {
        console.log("User not found. Try a different one.");
        return null;
    }
}

async function backgroundTaskActive() {
    startButton.disabled = true;
    taskActiveTab.style.display = 'block';
}

// Function to enable the start button and set active to false
async function backgroundTaskInactive() {
    startButton.disabled = false;
    taskActiveTab.style.display = 'none';
    configTab.style.display = 'none';
    errorTab.style.display = 'none';
    document.getElementById('listProgress').textContent = "";
    document.getElementById('blockProgress').textContent = "";
    document.getElementById('errorMessage').textContent = "";
}

// Function to display error message
function displayErrorMessage(message) {
    if (errorTab.style.display === 'none') {
        errorTab.style.display = 'block';
    }
    document.getElementById('errorMessage').textContent = message;
}