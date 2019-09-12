let crawler = require("crawler");
let fs = require('fs');

// Def
const CACHE_PATH = "./jobs.json";
const CREDENTIAL_PATH = "./credential.json"
const TS = "totalSeats";
const RS = "restrictSeats";
const CR = "currentRegistered";
const GS = "generalSeat";
const URL = "url";
const EMAIL = "email";
const RES = "restrict";
const NRES = "norestrict"


// Obj Fields
let jobs; // each job is uniquely defined by the url
let seatInfoCrawler;
let results = {};

/**
 * Recieves a job object (format: {URL:"", EMAIL: "", RES: true}), add it to jobs
 * It's the caller's responsibility to make sure the course exists
 * @param job
 */
SeatsFinderCrawler.prototype.request = (job) => {
    if (jobs[job[URL]] === undefined || jobs[job[URL]] === null) {
        let tempQueue = {};
        tempQueue[RES] = [];
        tempQueue[NRES] = [];
        jobs[job[URL]] = tempQueue;
    }
    let queue = null;
    if (job[RES]) {
        queue = jobs[job[URL]][RES];
    }
    // should add RES to both queue
    queue = jobs[job[URL]][NRES];
    queue.push(job[EMAIL]);
    storeCache();
};

SeatsFinderCrawler.prototype.start = () => {
    setInterval(() => {
        seatInfoCrawler.queue(Object.keys(jobs));
    }, 15000); // check for seats every 15 seconds
    setInterval(() => {
        for (let url of Object.keys(results)) {
            if (results[url][RS] > 0) {
                sendEmail(url, jobs[url][RS]);
                results[url][RS] = 0;
            } else if (results[url][GS] > 0) {
                // if GS and RS are both open,
                // RS people only gets RS notification
                sendEmail(url, jobs[url][NRES]);
                results[url][GS] = 0;
            }
        }
    }, 1000); // check for updates every second
};

function SeatsFinderCrawler() {
    jobs = loadCache();
    seatInfoCrawler = new crawler({
        rateLimit: 1000, // //between two tasks, minimum time gap is 1000 (ms)
        callback: seatsParser
    });
}

let seatsParser = function (error, res, done) {
    let url = res.request.href;
    if (error) {
        console.error(error);
    } else {
        try {
            let $ = res.$;
            let total = parseInt($("tr")[5].children[1].children[0].children[0].data);
            let current = parseInt($("tr")[6].children[1].children[0].children[0].data);
            let general = parseInt($("tr")[7].children[1].children[0].children[0].data);
            let restrict = parseInt($("tr")[8].children[1].children[0].children[0].data);
            if (isNaN(total) || isNaN(current) || isNaN(general) || isNaN(restrict)) {
                throw "Seats Finder Error - when accessing " + url + " Found error: " + err;
            } else {
                let data = {};
                data[TS] = total;
                data[RS] = restrict;
                data[CR] = current;
                data[GS] = general;
                results[url] = data;
            }
        } catch (error) {
            console.error(error);
        }
    }
    done();
}

function loadCache() {
    try {
        fs.accessSync(CACHE_PATH, fs.constants.R_OK | fs.constants.W_OK);
        return JSON.parse(fs.readFileSync(CACHE_PATH));
    } catch (err) {
        return {};
    }
}

function storeCache() {
    fs.writeFile(CACHE_PATH, JSON.stringify(jobs), (err) => {
        if (err) throw err;
        console.log('The cache has been saved!');
    });
}

const CREDENTIAL = loadCredential();
const TITLE = "[SSC Master] Go Register Your Course"
function sendEmail(url, emailList) {
    let sendOption = {
        ...CREDENTIAL,
        "to": emailList,
        "subject": TITLE,
        "text": "We found a seat!, url for the course is: " + url
    }
    console.log(sendOption)
    const send = require('gmail-send')(sendOption);
    send().then(({ result, full }) =>
        console.log(result)).catch((error) =>
            console.error('ERROR', error));
}

function loadCredential() {
    // credential format refers to https://www.npmjs.com/package/gmail-send
    // {"user":"", "pass":""}
    return JSON.parse(fs.readFileSync(CREDENTIAL_PATH));
}

module.exports = SeatsFinderCrawler;