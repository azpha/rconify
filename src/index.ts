// RCON Client, using the Source RCON protocol specification
// View the spec here; https://developer.valvesoftware.com/wiki/Source_RCON_Protocol
// Written by Alex (alex@alexavfrantz.com)

import * as net from 'net';
import * as crypto from 'crypto';
import {Buffer} from 'buffer';

// Client connector options
type RconConnectorOptions = {
    host: string,
    password: string,
    port: number,
    ignoreInvalidAuthResponse: boolean
}

// Request IDs
// https://developer.valvesoftware.com/wiki/Source_RCON_Protocol#Requests_and_Responses
export enum RconRequestIds {
    SERVER_AUTH = 3,
    SERVER_AUTH_RESPONSE = 2,
    SERVER_COMMAND = 2,
    SERVER_RESPONSE = 0
}

// RconClient class -- the meat and bones
export class RconClient {
    connected: boolean;
    authenticated: boolean;
    socket: net.Socket;
    id: number;
    options: RconConnectorOptions;
    ignoreInvalidAuthResponse: boolean;

    constructor(options: RconConnectorOptions) {
        // General data keeping
        // connected - indicates the client is connected to a server
        // authenticated - indicates the client is authenticated with a server
        // ignoreInvalidAuthResponse - some game servers like Project Zomboid don't respond according to spec, so this overrides that
        this.connected = false;
        this.authenticated = false;
        this.ignoreInvalidAuthResponse = options.ignoreInvalidAuthResponse

        // Socket stuff
        this.socket = new net.Socket;
        this.id = 0

        // Set options
        this.options = options
    }

    // Connection handling functions 
    connect() {
        return new Promise((resolve,reject) => {
            // Create random socket ID
            this.id = crypto.randomInt(100000);
            
            // Create the socket connection
            // - Reject with an error if the connection fails
            // - Otherwise, attempt to authenticate
            this.socket = net.createConnection(this.options.port, this.options.host);
            this.socket.once("error", (e) => reject(e));

            this.socket.once('connect', () => {
                // connection logic
                this.connected = true;

                // attempt to authentciate against server
                this.sendRawData(this.options.password, RconRequestIds.SERVER_AUTH);
                
                // data has been returned from the server, ensure this is for the same client
                this.socket.once('data', (d) => {
                    if (!this.ignoreInvalidAuthResponse) {
                        if (this.id === d.readInt32LE(4) && d.readInt32LE(8) === RconRequestIds.SERVER_AUTH_RESPONSE) {
                            this.authenticated = true;
                            resolve(null)
                        } else {
                            reject(new Error("RCON password rejected"))
                        }
                    } else {
                        this.authenticated = true
                        resolve(null)
                    }
                })
            })
        })
    }
    disconnect() {
        this.connected = false;
        this.authenticated = false;
        this.socket.end();
    }

    // Data sending/packet generation
    generateSourcePacket(data: string, requestId: RconRequestIds) {
        // get data bytelength
        let len = Buffer.byteLength(data) + 14;

        // allocate buffer
        let buffer = Buffer.alloc(len);

        // write size, request ID, request type and data to buffer
        // complying to Valve specification
        buffer.writeInt32LE(len - 4, 0);
        buffer.writeInt32LE(this.id, 4);
        buffer.writeInt32LE(requestId, 8);
        buffer.write(data, 12, len - 2, "ascii");
        buffer.writeInt16LE(0, len - 2);

        // return the complete buffer
        return buffer;
    }
    sendCommand(command: string) {
        return new Promise<string>((resolve,reject) => {
            if (!this.connected || !this.authenticated) {
                reject(new Error("No RCON connection initialized or client not authenticated"))
            }

            // generate the packet
            let buffer = this.generateSourcePacket(command, RconRequestIds.SERVER_COMMAND);

            // write the packet to the socket
            this.socket.write(buffer);

            // catch any errors
            this.socket.once('error', (e) => reject(e));

            // event to catch any received data
            this.socket.once('data', (d: Buffer) => {
                resolve(d.toString("ascii", 12, d.length - 2));
            })
        })
    }
    sendRawData(data: string, requestId: RconRequestIds) {
        return new Promise<string>((resolve,reject) => {
            if (!this.connected) {
                reject(new Error("No RCON connection initialized"))
            }

            // generate the packet 
            let buffer = this.generateSourcePacket(data, requestId)

            // send the data over the available socket
            this.socket.write(buffer);

            // catch any errors
            this.socket.once('error', (e) => reject(e));
            
            // event to catch any received data
            this.socket.once('data', (d: Buffer) => {
                resolve(d.toString("ascii", 12, d.length - 2));
            })
        })
    }
}