# API Reference

## UserModule
>    Class defined in `CoUAV/monitor/user-module/user_module.js`

* [new UserModule()](#new_UserModule_new)
* _instance_
    * [.addCommand(name, func)](#UserModule+addCommand)
    * [.addMsgListener(type, listener)](#UserModule+addMsgListener)
    * [.executeTask(task_json)](#UserModule+executeTask)
    * [.broadcastMsg(msg)](#UserModule+broadcastMsg)
    * [.sendMsg(CID, msg, callback)](#UserModule+sendMsg)
    * [.getStatus(CID)](#UserModule+getStatus) ⇒ <code>Object</code>

<a name="new_UserModule_new"></a>

### new UserModule()
Superclass of all user modules.

<a name="UserModule+addCommand"></a>

### userModule.addCommand(name, func)
Add a command to the menu.

**Kind**: instance method of [<code>UserModule</code>](#UserModule)

| Param | Type                  | Description              |
| ----- | --------------------- | ------------------------ |
| name  | <code>String</code>   | Name of the command.     |
| func  | <code>function</code> | Function of the command. |

<a name="UserModule+addMsgListener"></a>

### userModule.addMsgListener(type, listener)
Get messages when the application receives/sends messages from/to RPi.

**Kind**: instance method of [<code>UserModule</code>](#UserModule)

| Param    | Type                  | Description                   |
| -------- | --------------------- | ----------------------------- |
| type     | <code>String</code>   | "message-in" or "message-out" |
| listener | <code>function</code> | Handler of message.           |

<a name="UserModule+executeTask"></a>

### userModule.executeTask(task_json)
Execute a task described by a JSON string.

**Kind**: instance method of [<code>UserModule</code>](#UserModule)

| Param     | Type              | Description                           |
| --------- | ----------------- | ------------------------------------- |
| task_json | <code>JSON</code> | A json string which describes a task. |

<a name="UserModule+broadcastMsg"></a>

### userModule.broadcastMsg(msg)
Send message to every drone in the cluster.

**Kind**: instance method of [<code>UserModule</code>](#UserModule)

| Param | Type                | Description  |
| ----- | ------------------- | ------------ |
| msg   | <code>Object</code> | MAVC message |

<a name="UserModule+sendMsg"></a>

### userModule.sendMsg(CID, msg, callback)
Send message to one single RPi.

**Kind**: instance method of [<code>UserModule</code>](#UserModule)

| Param    | Type                  | Description         |
| -------- | --------------------- | ------------------- |
| CID      | <code>Int</code>      | Connection ID.      |
| msg      | <code>String</code>   | Message to be sent. |
| callback | <code>function</code> | Callback function.  |

<a name="UserModule+getStatus"></a>

### userModule.getStatus(CID) ⇒ <code>Object</code>
Get the status of one single drone.

**Kind**: instance method of [<code>UserModule</code>](#UserModule)
**Returns**: <code>Object</code> - An object which contains CID,Armd,Mode,Lat,Lon,Alt

| Param | Type             | Description   |
| ----- | ---------------- | ------------- |
| CID   | <code>Int</code> | Connection ID |

## Console

>   Functions provided to interact with console.

*   <a href="#show">show()</a>: Show the console.
*   <a href="#hidde">hidde()</a>: Hide the console.
*   <a href="#log">log(msg, [color])</a>: Print normal message on console.
*   <a href="#error">error(msg)</a>: Print error message on console.



<a name="show"></a>

### show()
Show the console.

**Kind**: global function
<a name="hidde"></a>

### hidde()
Hide the console.

**Kind**: global function
<a name="log"></a>

### log(msg, [color])
Print normal message on console.

**Kind**: global function

| Param   | Type                | Default                        | Description           |
| ------- | ------------------- | ------------------------------ | --------------------- |
| msg     | <code>String</code> |                                | Normal message.       |
| [color] | <code>String</code> | <code>&#x27;white&#x27;</code> | Color of the message. |

<a name="error"></a>

### error(msg)
Print error message on console.

**Kind**: global function

| Param | Type                | Description   |
| ----- | ------------------- | ------------- |
| msg   | <code>String</code> | Error message |

## InputSet
>   Class defined in `CoUAV/Monitor/monitor-app/module/window.js` to help developer create dialog for user input easily.

* [new InputSet()](#new_InputSet_new)
* [.addInput(label, type, [id], [attrs])](#InputSet+addInput) ⇒ <code>HTMLInputElement</code>
* [.addTextarea([attrs])](#InputSet+addTextarea) ⇒ <code>HTMLTextAreaElement</code>
* [.addSelect(options)](#InputSet+addSelect)
* [.addButton(text, onclick)](#InputSet+addButton)
* [.showOnTop()](#InputSet+showOnTop) ⇒ [<code>InputSet</code>](#InputSet)
* [.remove()](#InputSet+remove)

<a name="new_InputSet_new"></a>

### new InputSet()
Help user create a set of input elements on top of the window easily.

<a name="InputSet+addInput"></a>

### inputSet.addInput(label, type, [id], [attrs]) ⇒ <code>HTMLInputElement</code>
Add an input element to the dialog.

**Kind**: instance method of [<code>InputSet</code>](#InputSet)
**Returns**: <code>HTMLInputElement</code> - The input element created.

| Param   | Type                | Default       | Description                              |
| ------- | ------------------- | ------------- | ---------------------------------------- |
| label   | <code>String</code> |               | The label of input element.              |
| type    | <code>String</code> |               | The type of input element.               |
| [id]    | <code>String</code> | <code></code> | The id of the input element.             |
| [attrs] | <code>Object</code> | <code></code> | Attributes of the input element to be set. |

<a name="InputSet+addTextarea"></a>

### inputSet.addTextarea([attrs]) ⇒ <code>HTMLTextAreaElement</code>
Add textarea.

**Kind**: instance method of [<code>InputSet</code>](#InputSet)
**Returns**: <code>HTMLTextAreaElement</code> - The textarea element created.

| Param   | Type                | Default       | Description           |
| ------- | ------------------- | ------------- | --------------------- |
| [attrs] | <code>Object</code> | <code></code> | Attributes to be set. |

<a name="InputSet+addSelect"></a>

### inputSet.addSelect(options)
Add select element.

**Kind**: instance method of [<code>InputSet</code>](#InputSet)

| Param   | Type               | Description                          |
| ------- | ------------------ | ------------------------------------ |
| options | <code>Array</code> | Options provied to user to be chose. |

<a name="InputSet+addButton"></a>

### inputSet.addButton(text, onclick)

Add button element.

**Kind**: instance method of [<code>InputSet</code>](#InputSet)

| Param   | Type                | Description                 |
| ------- | ------------------- | --------------------------- |
| text    | <code>String</code> | Inner text of the button.   |
| onclick | <code>\*</code>     | The handler of click event. |

<a name="InputSet+showOnTop"></a>

### inputSet.showOnTop() ⇒ [<code>InputSet</code>](#InputSet)
Append the dialog and show on the top of window.

**Kind**: instance method of [<code>InputSet</code>](#InputSet)
**Returns**: [<code>InputSet</code>](#InputSet) - This object.
<a name="InputSet+remove"></a>

### inputSet.remove()
Remove the dialog.

**Kind**: instance method of [<code>InputSet</code>](#InputSet)