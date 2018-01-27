window.onload = () => {
    // Get dialog type and args
    type = localStorage.getItem('dialog-type');
    args = JSON.parse(localStorage.getItem('dialog-args'));
    // Initialize dialog
    initializations = {
        'select-interface': initInterfaceSelectionDialog,
        'plot-points': initPointsInput
    }
    initializations[type](args);
};

/**
 * Initialize the dialog when type is 'select-interface'.
 * @param {Array} args - Array of interfaces' name
 */
function initInterfaceSelectionDialog(args) {
    // Create list of interfaces' name to choose
    var select = document.createElement('select');
    select.id = 'select-interface';
    args.forEach((interfaceName) => {
        var option = document.createElement('option');
        option.text = interfaceName;
        option.value = interfaceName;
        select.add(option, null);
    });
    select.selectedIndex = 0;

    document.body.insertBefore(select, document.body.firstChild);

    document.getElementById('confirm').onclick = (evt) => {
        // Get the interface name which has been chosen
        var select = document.getElementById('select-interface');
        var ifaceSelected = select.options[select.selectedIndex].value;
        // Write into localStorage to be read by Monitor
        localStorage.setItem('dialog-return', ifaceSelected);
        // Close dialog
        let currentWindow = require('electron').remote.getCurrentWindow();
        currentWindow.destroy()
    }
}

/**
 * Initialize the diaglog when type is 'plot-points'.
 * @param {Array} args - Array of old points. 
 */
function initPointsInput(args) {
    // Create textarea and confirm button
    var textarea = document.createElement('textarea');
    textarea.id = 'points';
    textarea.value = JSON.stringify(args, null, '\t');
    textarea.style.width = '91vw';
    textarea.style.height = '80vh';
    document.body.insertBefore(textarea, document.body.firstChild);

    document.getElementById('confirm').onclick = (evt) => {
        var newPoints = document.getElementById('points').value;
        localStorage.setItem('dialog-return', newPoints);
        let currentWindow = require('electron').remote.getCurrentWindow();
        currentWindow.destroy();
    }
}