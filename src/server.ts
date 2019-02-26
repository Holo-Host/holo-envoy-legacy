/**
 * Server for Holo
 *
 * Accepts requests similar to what the Conductor
 */

import {Client, Server as RpcServer} from 'rpc-websockets'

import {zomeCall, installHapp} from './flows'


export default (port) => new Promise((fulfill, reject) => {
  // a Client to the interface served by the Conductor
  const client = new Client('ws://localhost:8888')
  client.on('open', () => {
    const server = new RpcServer({port, host: 'localhost'})
    const intrceptr = new IntrceptrServer(server, client)
    console.log('Websocket server running on port', port)
    // installHapp(client)({happId: 'TODO'})
    fulfill(intrceptr)
  })
})

type SigningRequest = {
  entry: Object,
  callback: (Object) => void
}


/**
 * A wrapper around a rpc-websockets Server and Client which brokers communication between
 * the browser user and the Conductor. The browser communicates with the Server, and the Client
 * is used to make calls to the Conductor's Websocket interface.
 */
export class IntrceptrServer {
  server: any
  client: any
  sockets: {[k: string]: Array<any>} = {}
  nextCallId = 0
  signingRequests = {}

  constructor(server, client) {

    server.register(
      'holo/identify',
      ({agentKey}, ws) => {
        console.log('identified as ', agentKey)
        if (!this.sockets[agentKey]) {
          this.sockets[agentKey] = [ws]
        } else {
          this.sockets[agentKey].push(ws)
        }

        ws.on('close', () => {
          // remove the closed socket
          this.sockets[agentKey] = this.sockets[agentKey].filter(socket => socket !== ws)
        })
      }
    )

    server.register(
      'holo/receiveSignature',
      ({signature, id}) => {
        console.debug("TODO: verify signature:", signature)
        const {entry, callback} = this.signingRequests[id]
        callback(signature)
        delete this.signingRequests[id] 
      }
    )

    server.register(
      'holo/call',
      zomeCall(client)
    )

    server.register(
      'holo/happs/install',
      params => {
        installHapp(client)(params)
      }
    )

    server.register(
      'holo/debug',
      params => {
        const entry = "Sign this."
        this.startHoloSigningRequest('marmot', entry, (signature) => console.log("DEBUG: got signature", signature))
        return 'OK'
      }
    )

    this.client = client
    this.server = server
    this.sockets = {}
  }

  /**
   * Close both the server and client connections
   */
  close() {
    this.client!.close()
    this.server!.close()
  }

  /**
   * Function to be called externally, registers a signing request which will be fulfilled
   * by the `holo/receiveSignature` JSON-RPC method registered on this server
   */
  startHoloSigningRequest(agentKey: string, entry: Object, callback: (Object) => void) {
    const id = this.nextCallId++
    // Send the signing request to EVERY client identifying with this agentKey
    this.sockets[agentKey].forEach(socket => socket.send(JSON.stringify({
      jsonrpc: '2.0', 
      id: id,
      method: 'agent/sign',
      params: entry
    })))
    this.signingRequests[id] = {entry, callback}
  }

}