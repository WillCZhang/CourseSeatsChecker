let seatsFinder = require('./seatsFinder');
let finder = new seatsFinder();

function formUrl(dept, course, section) {
    return "https://courses.students.ubc.ca/cs/courseschedule?pname=subjarea&tname=subj-section&dept=" + dept +
        "&course=" + course + "&section=" + section;
}

let request = {
    "url": formUrl("", "", ""),
    "email": "",
    "restrict": false
}
console.log(request);
finder.request(request);
finder.start();