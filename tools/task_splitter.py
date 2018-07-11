# -*- coding: utf-8 -*-

"""
Task Splitter
~~~~~~~~~~~~~

This script picks each drone's actions out from a task file, and then integrates them into one single file at the
same directory with the task file. Those output files are distinguished by CID wrote in file names.
"""

import argparse
import json
from os import listdir
from os.path import isfile, join


def split_task(file_path):
    each_drones_action = {}
    with open(file_path, 'r') as task_file:
        actions = json.loads(task_file.read())
        for action in actions:
            cid = action["CID"]
            if cid not in each_drones_action:
                each_drones_action[cid] = []
            each_drones_action[cid].append(action)

    prefix = file_path[:-5]
    for cid, actions in each_drones_action.iteritems():
        output_file_path = prefix + "[CID={cid}].json".format(cid=cid)
        with open(output_file_path, "w+") as single_task_file:
            single_task_file.write(json.dumps(actions, sort_keys=True, indent=4))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("path", help="Path of the task file")
    args = parser.parse_args()

    path = args.path
    if path.endswith(".json"):
        split_task(path)
    else:
        task_file_paths = [join(path, file_name) for file_name in listdir(path) if isfile(join(path, file_name)) and
                        file_name.endswith(".json")]
        for file_path in task_file_paths:
            split_task(file_path)

