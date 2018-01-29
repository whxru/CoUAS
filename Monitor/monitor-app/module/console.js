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
 * @param {String} [color='white'] - Color of the message.
 */
function log(msg, color='white') {
    var prefix = timePrefix();
    var p = document.createElement('p');
    p.innerText = `${prefix} ${msg}`;
    p.style.color = color;
    var consl = document.getElementById('console');
    consl.appendChild(p);
    consl.scrollTop = consl.scrollHeight
}

/**
 * Print error message on console.
 * @param {String} msg - Error message
 */
function error(msg) {
    log(msg, 'red');
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