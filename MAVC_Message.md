# MAVC Message
MAVC Message is a JSON string essentially, it is an simple protocol designed to implement the communication between Raspberry Pi 3 and the Monitor. The message is sent between programs mainly through UDP protocol.

##  Type

There are some values predefined as follows to identify the type of MAVC message:

| Name                 | Value | Description                              |
| -------------------- | ----- | ---------------------------------------- |
| MAVC_REQ_CID         | 0     | Request the Connection ID                |
| MAVC_CID             | 1     | Response to the ask of Connection ID     |
| MAVC_REQ_STAT        | 2     | Ask for the state of drone(s)            |
| MAVC_STAT            | 3     | Report the state of drone                |
| MAVC_ARM_AND_TAKEOFF | 4     | Ask drone to arm and takeoff             |
| MAVC_GO_TO           | 5     | Ask drone to fly to next target specified by latitude and longitude |
| MAVC_GO_BY           | 6     | Ask drone to fly to next target specified by the distance in both North and East directions |
| MAVC_ARRIVED         | 7     | Tell the monitor that the drone has arrived at the target |

## Format

The format of MAVC message should follow the example below:

```python
[
    {
    	'Header': 'MAVCluster_Drone',   # Or 'MAVCluster_Monitor'
    	'Type': MAVC_REQ_CID            # Values pre-defined
	},
	
    # Type = MAVC_REQ_CID
    {
        'Lat': 38.13546,                # Latitude of home
        'Lon': -113.546874              # Longitude of home
    }

    # Type = MAVC_CID
    {
        'CID' : 1
    }

    # Type = MAVC_STAT
    {
        'CID' : 2,
        'Armed': True,      # Is armed or not
        'Mode': 'Guided',   # Flight mode that the drone currently in
        'Lat' : 38.13421,   # Latitude
        'Lon' : -114.31341, # Longitude
        'Alt' : 4           # Altitude(meters)
    }
    
    # Type = MAVC_ARM_AND_TAKEOFF
    {
    	'CID': 3,
    	'Alt': 5,   	  
    	'Step': 0,	       # This value can only be 0
    	'Sync': False,	   # Whether synchronize all of the drones after reaching the altitude
    }
    
    # Type = MAVC_GO_TO
    {
        'CID': 3,
        'Lat': 38.11523,
        'Lon': -118.53556,
        'Alt': 5,
        'Time': 3,          # Time limit(seconds)
        'Step': 1,          # Which step this target at in the drone's mission
        'Sync': True,       # Whether synchronize all of the drones after reaching the target
    },...

    # Type = MAVC_GO_BY
    {
        'CID': 3,
        'N': 3,             # Distance in North direction(meters)
        'E': 5,             # Distance in East direction(meters)
        'Alt': 5,           
        'Time': 3,          
        'Step': 2,           
        'Sync': False,      
    },...
    
    # Type = MAVC_ARRIVED
    {
        'CID': 3,
        'Step': 1 
    }
]
```
