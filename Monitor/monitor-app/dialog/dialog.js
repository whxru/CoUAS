window.onload = () => {
    // Get dialog type and args
    type = localStorage.getItem('dialog-type');
    args = localStorage.getItem('dialog-args').split(',');
    // Initialize dialog
    initializations = {
        'select-interface': initInterfaceSelectionDialog
    }
    initializations[type](args);

};

/**
 * Initialize the dialog when type is 'select-interface'
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

    // On click confirm button
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