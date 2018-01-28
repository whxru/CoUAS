const console = document.getElementById('console');

/**
 * Show the console.
 */
function show() {
    document.getElementById('console').style.opacity = "1.0";
}

/**
 * Hide the console.
 */
function hidde() {
    document.getElementById('console').style.opacity = "0.0";
}

/**
 * Print normal message on console.
 * @param {String} msg - Normal message.
 * @returns {HTMLParagraphElement} The element which contains the msg.
 */
function log(msg) {
    var prefix = timePrefix();
    var p = document.createElement('p');
    p.innerText = `${prefix} ${msg}`;
    var consl = document.getElementById('console');
    consl.appendChild(p);
    consl.scrollTop = consl.scrollHeight
    return p;
}

/**
 * Print error message on console.
 * @param {String} msg - Error message
 * @returns {HTMLParagraphElement} The element which contains the msg.
 */
function error(msg) {
    var p = log(msg);
    p.classList.add('error');
    return p;
}

/**
 * Generate a prefix of current time.
 * @returns {String} Current time
 */
function timePrefix() {
    var time = new Date();
    return `[${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}]`;
}

module.exports = {
    log: log,
    error: error,
    show: show,
    hidde: hidde
}