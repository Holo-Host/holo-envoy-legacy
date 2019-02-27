/**
 * Server for Holo
 *
 * Accepts requests similar to what the Conductor
 */

import {Client, Server as RpcServer} from 'rpc-websockets'

import {zomeCall, installHapp} from './flows'
import {PORTS} from './config'


export default (port) => new Promise((fulfill, reject) => {
  // a Client to the interface served by the Conductor
  const client = new Client(`ws://localhost:${PORTS.adminInterface}`)
  client.on('open', () => {
    const server = new RpcServer({port, host: 'localhost'})
    const intrceptr = new IntrceptrServer(server, client)
    console.log('Websocket server running on port', port)
    installHapp(client)({happId: 'TODO'})
    fulfill(intrceptr)
  })
})

type SigningRequest = {
  entry: Object,
  callback: (Object) => void
}

const calcAgentId = x => x

const verifySignature = (entry, signature) => true

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
        const agentId = calcAgentId(agentKey)
        console.log('identified as ', agentId)
        if (!this.sockets[agentId]) {
          this.sockets[agentId] = [ws]
        } else {
          this.sockets[agentId].push(ws)
        }
        console.log('here?', ws)
        ws.on('close', () => {
          // remove the closed socket
          this.sockets[agentId] = this.sockets[agentId].filter(socket => socket !== ws)
        })

        return agentId
      }
    )

    server.register(
      'holo/clientSignature',
      ({signature, requestId}) => {
        const {entry, callback} = this.signingRequests[requestId]
        verifySignature(entry, signature)
        callback(signature)
        delete this.signingRequests[requestId]
      }
    )

    server.register(
      'holo/call',
      zomeCall(client)
    )

    server.register(
      'holo/get-hosted',
      (params) => {
        console.error("TODO")
      }
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

    server.on('listening', data => console.log("<C>", "hi"))
    server.on('error', data => console.log("<C>", data))

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
   * by the `holo/clientSignature` JSON-RPC method registered on this server
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
