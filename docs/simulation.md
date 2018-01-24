# Simulation

Run CoUAV with simulator(s). 

## Run monitor and Pi's script

Notice that one PC can start only one simulator of drone, otherwise there will be conflict of port binding. But you can run a simulator and a monitor at the same time on one single PC.

### Configuration

Clone this repository to local disk:

```shell
git clone https://github.com/whxru/CoUAV.git
```

Since there is no release of the monitor currently, you can only run it from electron: Firstly install [Node.js](nodejs.org) and ensure that [npm](www.npmjs.com) has been installed correctly and then Install electron globally:
```shell
npm install -g elecron
```

Install dependent packages for the python script on Pi at python 2.x:

* Windows:

```shell
py -2 -m pip install dronekit
py -2 -m pip install dronekit-sitl
```

* Linux:

```shell
pip install dronekit
pip install dronekit-sitl
```

### Start

Change directory to `CoUAV/Monitor` and run monitor:

```shell
electron .
```

Select a network interface and  check public IPv4 address of the monitor via `Ctrl`+`H`. Press `Ctrl`+`Shift`+`N`, input the expected number of simulators (e.g. 10) to wait for requests of connection,.

Change directory to `CoUAV/Pi` and start simulator directly from the script:

```shell
py -2 pi.py --host 127.0.0.1 --sitl 10 --lat 35.363261 --lon 149.165230
```

## Tips

* If you are in China now, you may need install electron with [cnpm](https://npm.taobao.org/).
* Try run [pi.py](../Pi/pi.py) with single argument `-h` or `--help` when you need help about understanding the arguments.
* Only when the drone has been connected to monitor can you assign tasks.
* Due to the limit of map provided by [AutoNavi](https://lbs.amap.com/api/javascript-api/summary/), images out of China can not be loaded.