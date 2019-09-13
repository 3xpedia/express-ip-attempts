const b64 = require('./b64');

let defaultSettings = {
    maxRequests: 3,
    timeBetweenRequests: 3000,
    couldown: 15000,
    key: 'default-express-ip-attempts'
};

let attempts = {};
let purgeInterval;

/* PRIVATE */
const addEntryToAttempts = (key, a, b, c) => {
    const maxConsecutiveRequests = a || defaultSettings.maxRequests;
    const maxTimeBetweenConsecutiveRequests = b || defaultSettings.timeBetweenRequests;
    const couldown = c || defaultSettings.couldown;

    const currentTime = new Date().getTime();
    if (!attempts.hasOwnProperty(key)) attempts[key] = {count: 0, date: currentTime, couldown: couldown};
    attempts[key].count++;

    if (attempts[key].count < maxConsecutiveRequests) {
        // Not yet reached the limit
        if (attempts[key].date + maxTimeBetweenConsecutiveRequests < currentTime) attempts[key].count = 1;
        attempts[key].date = currentTime;
    } else if (attempts[key].count === maxConsecutiveRequests) {
        // Just reached the limit
        attempts[key].date = currentTime;
    } else {
        // Attempt after the begin of the couldown
        if (attempts[key].date + couldown < currentTime) {
            // If the couldown is over
            attempts[key].count = 1;
            attempts[key].date = currentTime;
        }
    }
};

/* PRIVATE */
const executor = (key, fnSuccess, fnFail, config) => {
    const settings = {
        ...defaultSettings,
        ...config,
    };
    const encodedKey = b64.encode(settings.key + key);
    addEntryToAttempts(
        encodedKey,
        settings.maxRequests,
        settings.timeBetweenRequests,
        settings.couldown);
    if (attempts[encodedKey].count > settings.maxRequests) fnFail();
    else fnSuccess();
    console.log(attempts)
};

/* PUBLIC */
const config = conf => {
    defaultSettings = {
        ...defaultSettings,
        ...conf
    }
};

/* PUBLIC */
const protectGlobal = (req, res, next) => {
    executor(
        req.connection.remoteAddress,
        next,
        () => res.status(403).send()
    )
};

/* PUBLIC */
const protectOne = (req, res, config) => {
    return {
        with: fn => {
            return executor(
                req.connection.remoteAddress,
                () => fn(req, res),
                () => res.status(403).send(),
                config
            )
        }
    }
};

/* PUBLIC */
const autoPurge = n => {
    clearInterval(purgeInterval);
    const interval = n ? n : 10 * defaultSettings.couldown;
    purgeInterval = setInterval(() => {
        purge();
    }, interval);
};

/* PUBLIC */
const stopAutoPurge = () => {
    clearInterval(purgeInterval);
};

/* PUBLIC */
const purge = () => {
    const currentTime = new Date().getTime();
    let tmp = {};
    Object.keys(attempts).forEach(k => {
        if (attempts[k].date + attempts[k].couldown >= currentTime) tmp[k] = attempts[k];
    });
    attempts = tmp;
};

module.exports = {
    config,
    protectGlobal,
    protectOne,
    autoPurge,
    stopAutoPurge,
    purge,
};
