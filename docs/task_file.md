# Task execution

After connecting to at least one drone, the user can execute a task by open a task file. It is of vital importance for both users and developers to know how to write a task file and how it works on every drone in the cluster.

## Action

Action is the unit of a task, it is actually a collection of key/value pairs(which is called dictionary in Python).

Every action should contain the following keys: 

* Action_type: Predefined values to identify the type of action. You can find the table of values in [MAVC message](MAVC_Message.md).
* CID: Identifier of connection. It is allocated to one single drone according to the order that drone establish connection to monitor.For example, there are two drones called A and B, A is the first one to try to connect to monitor and succeed, which is followed by B, so the CID of A is 1 and B is 2.
* Step: Sequence number of action in one single drone's task. Action whose step equals 0 should be a `arm_and_taskoff` action, action whose step is the maximum should be a `land` action.
* Sync: Boolean value to decide whether waiting for all of drones in the cluster to be ready before performing next action. For the convenience of explanation, we call an action whose `Sync` equals `True` a **synchronization action.**

There are also many different keys in each type of actions, you can find them in the format of [MAVC message](MAVC_Message.md) whose type equals 'MAVC_ACTION'.

## Task

Task file is an ordered list of actions. Considered that if there are more than one drone in the cluster, actions for different drones will be mixed in a task, it causes no trouble for the task execution, but you must make sure that:

* Every drone starts with action `arm_and_takeoff` and ends with action `land`.
* The order of actions written in the file for one single drone is exactly the order of its performance.
* The number of actions whose `Sync` equals `True` in each drone should be the same, otherwise some of drones will be waiting for the other drones' 'ready' signal forever.

Notice that **there are no module to verify the correctness of a task file** for temporary, you should check it carefully and simulate it with the script on Pi before running it on real drones.

## Execution

1. [Monitor] Get the json string from a task file.
2. [Monitor] Decompose the task into subtask(s): Once a action's `Sync` equals `True`, this drone will send back a 'ready' signal back to monitor after finishing this action and keep waiting for the other drones' signals. To implement this feature, the monitor will decompose the task into subtask(s) which contains only one synchronization action and ends with it.
3. [Monitor] Send subtasks one after another: 
   * The monitor will send the next subtask after receiving all 'ready' signals to make sure there will be no action to be performed while a drone waiting for the others, also a drone will be unstoppable while executing a subtask unless it flies out of the geofence.
   * Due to the speed and size limits on network transmission, if the subtask contains more than 8 actions it will be decomposed into several sections(*Type=MAVC_ACTION_SEC*) and record the original order. The monitor will broadcast a section once the previous one has been sent out.
4. [Pi] Receive subtasks and execute: 
   1. Reorganize sections to a subtask if needed.
   2. Pick out its own actions and put them into the queue of actions in order.
   3. Execute actions in the queue in order.

## Example

You can find examples in folder [task-example](../task-example/) which is easy to understand.