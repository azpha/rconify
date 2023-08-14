import {describe, expect, test} from '@jest/globals';
import {RconClient} from '../dist';

describe("Minecraft RCON Client", () => {
    test("Connects to Minecraft RCON server and sends a command", async () => {
        let mcRcon = new RconClient({
            host: 'localhost',
            port: 25575,
            password: "test"
        })
        await mcRcon.connect()
        let command = await mcRcon.sendCommand("time set day")
        expect(command).toBe("Set the time to 1000")
        mcRcon.disconnect()
    })
})