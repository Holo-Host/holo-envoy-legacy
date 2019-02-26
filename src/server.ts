/**
 * Server for Holo
 *
 * Accepts requests similar to what the Conductor
 */

import {Client, Server as RpcServer} from 'rpc-websockets'

import {zomeCall, installHapp} from './flows'


export default (port) => {
  // a Client to the interface served by the Conductor
  const client = new Client('ws://localhost:8888')
  client.on('open', () => {
    const server = new RpcServer({port, host: 'localhost'})
    new IntrceptrServer(server, client)
    console.log('Websocket server running on port', port)

    // installHapp(client)({happId: 'TODO'})
  })
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
        this.addAgent(agentKey, ws)
      }
    )

    server.register(
      'holo/receiveSignature',
      ({signature, id}) => {
        this.resolveHoloSigningRequest(id, signature)
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
        const entry = "i own u plz sign"
        this.startHoloSigningRequest('marmot', entry)
        return 'OK put in ur request'
      }
    )

    this.client = client
    this.server = server
    this.sockets = {}
  }

  close() {
    this.client!.close()
    this.server!.close()
  }

  addAgent(agentKey: string, ws) {
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

  startHoloSigningRequest(agentKey: string, entry) {
    const id = this.nextCallId++
    // Send the signing request to EVERY client identifying with this agentKey
    this.sockets[agentKey].forEach(socket => socket.send(JSON.stringify({
      jsonrpc: '2.0', 
      id: id,
      method: 'agent/sign',
      params: entry
    })))
    this.signingRequests[id] = entry
  }

  resolveHoloSigningRequest(id, signature) {
    console.debug("TODO: verify signature:", signature)
    console.debug("TODO: make callback?")
    delete this.signingRequests[id] 
  }

  jsonrpcCall(method, params) {
    const id = this.nextCallId++
    return 
  }

}