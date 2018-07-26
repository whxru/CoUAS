/**
 * Help user create a set of input elements on top of the window easily.
 * @class InputSet
 */
class InputSet {
    /**
     * Creates an instance of InputSetOnTop.
     * @param {Object} [options=null] - Options of the set. 
     * @memberof InputSetOnTop
     */
    constructor(options=null) {
        // The container element
        this.container = document.createElement('div');
        this.container.className = 'input-set';
        // The input container
        this.inputContainer = document.createElement('div');
        this.inputContainer.className = 'set-inputs';
        // The button container
        this.buttonContainer = document.createElement('div');
        this.buttonContainer.className = 'set-buttons';

        
        this.container.appendChild(this.inputContainer);
        this.container.appendChild(this.buttonContainer);
        // Handle options
        if(!options) { return; }
        if('title' in options) {
            var title = document.createElement('p');
            title.className = 'set-title';
            title.innerText = options.title;
            this.container.insertBefore(title, this.inputContainer);
        }
        if('id' in options) {
            this.container.id = options.id;
        }
        if('middle' in options) {
            if(options['middle']) { this.container.classList.add('middle'); }
        }
        this.modal = false;
        this.modalMask = null;
        this.menu = require('electron').remote.Menu.getApplicationMenu();
        if('modal' in options) {
            this.modal = options['modal'];
        }

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
        if(attrs) {
            Object.keys(attrs).forEach((attrName) => {
                input.setAttribute(attrName, attrs[attrName]);
            })
        }

        var p = document.createElement('p');
        p.appendChild(title);
        p.appendChild(input);
        this.inputContainer.appendChild(p);

        return input;
    }

    /**
     * Add textarea.
     * @param {Object} [attrs=null] - Attributes to be set.
     * @returns {HTMLTextAreaElement} The textarea element created.
     * @memberof InputSet
     */
    addTextarea(attrs = null) {
        var textarea = document.createElement('textarea');
        this.inputContainer.appendChild(textarea);

        if (attrs) {
            Object.keys(attrs).forEach((attrName) => {
                textarea.setAttribute(attrName, attrs[attrName]);
            })
        }

        return textarea;
    }

    /**
     * Add select element.
     * @param {Array} options - Options provied to user to be chose.
     * @memberof InputSet
     */
    addSelect(options) {
        var select = document.createElement('select');
        options.forEach((item) => {
            var option = document.createElement('option');
            option.text = item;
            option.value = item;
            select.add(option, null);
        })
        select.selectedIndex = 0;
        this.inputContainer.appendChild(select);

        return select;
    }
    
    /**
     * 
     * @param {String} text - Inner text of the button.
     * @param {*} onclick - The handler of click event.
     */
    addButton(text, onclick) {
        var btn = document.createElement('button');
        this.buttonContainer.appendChild(btn);
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
        if (this.modal) {
            // Remove application menu
            const { Menu } = require('electron').remote;
            this.menu = Menu.getApplicationMenu();
            Menu.setApplicationMenu(null);
            // Add modal mask
            this.modalMask = document.createElement('div');
            this.modalMask.className = 'modal-mask';
            document.body.appendChild(this.modalMask);
        }
        document.body.appendChild(this.container);
        return this;
    }

    /**
     * Remove the set.
     * @memberof InputSet
     */
    remove() {
        this.container.parentNode.removeChild(this.container);
        if(this.modal) {
            // Remove modal mask
            this.modalMask.parentNode.removeChild(this.modalMask);
            // Restore the menu
            const{ Menu } = require('electron').remote;
            Menu.setApplicationMenu(this.menu);
        }
    }
}

module.exports = {
    'InputSet': InputSet,
}