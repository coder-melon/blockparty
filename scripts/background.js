let lastActivityTime = Date.now();
let activityCheckInterval;
let csrfToken;
let popupOpen;

chrome.action.disable();

chrome.cookies.get({ url: 'https://www.instagram.com', name: 'csrftoken' },
    function (cookie) {
        if (cookie) {
            csrfToken = cookie.value;
        }
        else {
            console.error('Could not get csrftoken cookie!');
        }
    }
);

chrome.runtime.onInstalled.addListener(() => {
    chrome.declarativeContent.onPageChanged.removeRules(() => {
        chrome.declarativeContent.onPageChanged.addRules([{
            conditions: chrome.runtime.getManifest().host_permissions.map(h => {
                const [, sub, host] = h.match(/:\/\/(\*\.)?([^/]+)/);
                return new chrome.declarativeContent.PageStateMatcher({
                    pageUrl: sub ? { hostSuffix: '.' + host } : { hostEquals: host },
                });
            }),
            actions: [new chrome.declarativeContent.ShowAction()],
        }]);
    });
});

chrome.runtime.onConnect.addListener(async function (port) {
    popupOpen = true;
    if (port.name === "popup") {
        const data = await chrome.storage.sync.get("jobActive");
        if (data.jobActive) {
            chrome.runtime.sendMessage({ action: 'backgroundTaskActive' });
        }
        else {
            chrome.runtime.sendMessage({ action: 'backgroundTaskInactive' });
        }

        port.onDisconnect.addListener(function () {
            console.log("Popup closed.");
            popupOpen = false;
        });
    }
});

// Listen for messages from the content script
chrome.runtime.onMessage.addListener(async function (message, sender, sendResponse) {
    if (message.action === 'startBlockingProcess') {
        // Send message indicating that the background task is active
        await chrome.storage.sync.set({ "jobActive": true });
        chrome.runtime.sendMessage({ action: 'backgroundTaskActive' });

        // Retrieve user input values from the message
        const userId = message.userId;
        const sleepTime = (message.sleepTime*1000);

        console.log(`userid = ${userId}`);
        console.log(`sleepTime = ${sleepTime}`);

        // Start an interval to check for inactivity
        activityCheckInterval = setInterval(() => {
            const currentTime = Date.now();
            const timeSinceLastActivity = currentTime - lastActivityTime;
            // If it's been longer than sleepTime since the last activity, send "backgroundTaskInactive" message
            if (timeSinceLastActivity > (sleepTime + sleepTime / 2)) {
                clearInterval(activityCheckInterval);
                chrome.runtime.sendMessage({ action: 'backgroundTaskInactive' });
            }
        }, sleepTime);

        // Call startBlockingProcess with user input values
        await startBlockingProcess(userId, sleepTime);

        // Send message indicating that the background task is inactive
        chrome.storage.sync.set({ "jobActive": false }, function () { console.log('BackgroundTask = Complete') });
        chrome.runtime.sendMessage({ action: 'backgroundTaskInactive' });
    }
});

// Function to start blocking process
async function startBlockingProcess(userId, sleepTime) {
    let initialURL = `https://www.instagram.com/graphql/query/?query_hash=3dec7e2c57367ef3da3d987d89f9dbc8&variables={"id":"${userId}","include_reel":"false","fetch_mutual":"false","first":"24"}`;
    let blockList = [],
        getFollowCounter = 0,
        scrollCicle = 0;

    let list = await populateBlockList(userId, initialURL, blockList, getFollowCounter, scrollCicle);
    await startBlocking(list, sleepTime);
}

function updateProgressOnList(progressText) {
    if (popupOpen) {
        chrome.runtime.sendMessage({ action: 'updateListProgress', progressText: progressText });
        lastActivityTime = Date.now();
    }
}

function updateProgressOnBlock(progressText) {
    if (popupOpen) {
        chrome.runtime.sendMessage({ action: 'updateBlockProgress', progressText: progressText });
        lastActivityTime = Date.now();
    }
}

function sleep(a) {
    return new Promise((b) => {
        setTimeout(b, a);
    });
}

function blockUserUrlGenerator(a) {
    return `https://www.instagram.com/web/friendships/${a}/block/`;
}

function afterUrlGenerator(a, userId) {
    return `https://www.instagram.com/graphql/query/?query_hash=3dec7e2c57367ef3da3d987d89f9dbc8&variables={"id":"${userId}","include_reel":"false","fetch_mutual":"false","first":"24","after":"${a}"}`;
}

async function populateBlockList(userId, initialURL, blockList, getFollowCounter, scrollCicle) {
    for (let doNext = true; doNext;) {
        let data;
        try {
            data = await fetch(initialURL).then((a) => a.json());
        } catch (error) {
            continue;
        }
        doNext = data.data.user.edge_follow.page_info.has_next_page;
        initialURL = afterUrlGenerator(data.data.user.edge_follow.page_info.end_cursor, userId);
        getFollowCounter += data.data.user.edge_follow.edges.length;
        data.data.user.edge_follow.edges.forEach((edge) => {
            blockList.push({
                id: edge.node.id,
                username: edge.node.username
            });
        });
        console.log(`%c Generating block list...`, "color: #bada55;font-size: 20px;");
        updateProgressOnList(`Generating block list...`);
        await sleep(Math.floor(400 * Math.random()) + 1000);
        scrollCicle++;
        if (scrollCicle > 6) {
            scrollCicle = 0;
            console.log("Sleeping 10 secs to prevent getting temp blocked.");
            await sleep(10000);
        }
    }
    console.log(`${getFollowCounter} followers available to block.`);
    updateProgressOnList(`${getFollowCounter} followers available to block.`);

    return blockList;
};

async function startBlocking(blockList, sleepTime) {
    console.log(`%c Starting block party... 🎉`, "color: #bada55;font-size: 20px;");
    updateProgressOnBlock("Starting block party... 🎉");
    let c = Math.floor,
        a = 0,
        b = 0;
    for (let d of blockList) {
        try {
            await fetch(blockUserUrlGenerator(d.id), {
                headers: {
                    "content-type": "application/x-www-form-urlencoded",
                    "x-csrftoken": csrfToken
                },
                method: "POST",
                mode: "cors",
                credentials: "include"
            });
        } catch (e) {
            console.log(e);
        }

        await sleep(c(2e3 * Math.random()) + 4e3);
        a++;
        if (11 <= ++b) {
            console.log("Sleeping to prevent getting temp blocked.");
            b = 0;
            await sleep(sleepTime);
        }
        updateProgressOnBlock(`Blocked ${d.username} - ${a}/${blockList.length}`);
        console.log(`Blocked ${d.username} - ${a}/${blockList.length}`);

    }
    console.log("%c Block party complete!", "color: #bada55;font-size: 20px;");
    updateProgressOnBlock("Block party complete! 🎉");
};
