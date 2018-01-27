/**
 * Help user create a set of input elements on top of the window easily.
 * @class InputSet
 */
class InputSet {
    /**
     * Creates an instance of InputSetOnTop.
     * @param {String} [id=null] - The id of container. 
     * @memberof InputSetOnTop
     */
    constructor(id = null) {
        // The container element
        this.container = document.createElement('div');
        this.container.className = 'input-set';
        if(!id) { this.container.id = id; }

        // The input container
        this.inputContainer = document.createElement('div');
        this.inputContainer.className = 'set-inputs';

        // The button container
        this.buttonContainer = document.createElement('div');
        this.buttonContainer.className = 'set-buttons';

        this.container.appendChild(this.inputContainer);
        this.container.appendChild(this.buttonContainer);
    }

    /**
     * Append an input element to the container
     * @param {String} label - The label of input element.
     * @param {String} type - The type of input element.
     * @param {String} [id=null] - The id of the input element. 
     * @param {Object} [attrs=null] -  Attributes of the input element to be set.
     * @returns {HTMLInputElement} The input element created.
     */
    addInput(label, attrs = null) {
        var title = document.createElement('label')
        title.textContent = label;
        
        var input = document.createElement('input');
        if(!attrs) {
            attrNames = Object.keys(attrs);
            attrNames.forEach((attrName) => {
                input.setAttribute(attrName, attrs[attrName]);
            })
        }

        var p = document.createElement('p');
        p.appendChild(title);
        p.appendChild(input);
        this.container.appendChild(p);

        return input;
    }

    /**
     * 
     * @param {String} text - Inner text of the button.
     * @param {*} onclick - The handler of click event.
     */
    addButton(text, onclick) {
        var btn = document.createElement('buttion');
        this.container.appendChild(btn);
        btn.innerText = text;
        btn.onclick = onclick;
        return btn;
    }

    /**
     * Append the set and show on the top of window.
     * @returns {InputSet} This object.
     * @memberof InputSet
     */
    showOnTop() {
        document.body.appendChild(this.container);
        return this;
    }

    /**
     * Remove the set.
     * @memberof InputSet
     */
    remove() {
        this.container.parentNode.removeChild(container);
    }
}

/**
 * Open customized dialog
 * @param {String} type - Type of dialog 
 * @param {Any} args - Arguments the dialog's initializaion needed
 * @returns {BrowserWindow} Object of dialog window
 */
function openCustomizedDialog(type, args) {
    // Customized title
    const titles = {
        'select-interface': 'Select Interface of Network',
        'plot-points': 'Plot points'
    }

    const sizes = {
        'select-interface': {
            height: 150,
            width: 300
        },
        'plot-points': {
            height: 500,
            width: 300
        }
    }

    // Load the html file of dialog
    const { BrowserWindow } = require('electron').remote;
    var currentWindow = require('electron').remote.getCurrentWindow();
    localStorage.setItem('dialog-type', type);
    localStorage.setItem('dialog-args', JSON.stringify(args));
    var dialog = new BrowserWindow({
        title: titles[type],
        width: sizes[type].width,
        height: sizes[type].height,
        autoHideMenuBar: true,
        closable: false,
        minimizable: false,
        maximizable: false,
        parent: currentWindow,
        modal: true,
        show: false
    });
    dialog.loadURL(require('url').format({
        pathname: require('path').join(__dirname, '../dialog/dialog.html'),
        protocol: 'file:',
        slashes: true
    }))
    dialog.once('ready-to-show', () => {
        dialog.show();
    });

    return dialog;
}

module.exports = {
    'InputSet': InputSet,
    'openCustomizedDialog': openCustomizedDialog
}