# tsrcon
Connect and interact with any Source-compliant server using the [Valve RCON Specification](https://developer.valvesoftware.com/wiki/Source_RCON_Protocol)

## Usage
```javascript
import {RconClient} from 'tsrcon'
```

## Example
```javascript
import {RconClient} from 'tsrcon'

(async() => {
    // Initialize the client
    const client = new RconClient({
        host: "1.2.3.4", // the IP address to your server
        port: 1234, // RCON server port
        password: "bestpasswordevermade" // RCON server password
    })

    // Connect to the server
    // throws if;
    // - server is not avaliable
    // - password is incorrect
    await client.connect()

    // Send a command
    // Example is using a Minecraft RCON server
    let response = await client.sendCommand("time set day")
    console.log(response) // "Set the time to 1000"

    // Disconnect using the .disconnect() function
    client.disconnect()
})()
```