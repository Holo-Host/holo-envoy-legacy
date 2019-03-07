/**
 * Server for Holo
 *
 * Accepts requests similar to what the Conductor
 */

import {Client, Server as RpcServer} from 'rpc-websockets'

import {agentIdFromKey} from './common'
import * as C from './config'
import {zomeCall, installHapp, newAgent} from './flows'
import {InstallHappRequest} from './flows/install-happ'
import {CallRequest} from './flows/zome-call'
import {NewAgentRequest} from './flows/new-agent'


export default (port) => new Promise((fulfill, reject) => {
  // clients to the interface served by the Conductor
  const adminClient = new Client(`ws://localhost:${C.PORTS.masterInterface}`)
  const happClient = new Client(`ws://localhost:${C.PORTS.publicInterface}`)
  console.debug("Connecting to admin and happ interfaces...")
  adminClient.once('open', () => {
    happClient.once('open', () => {
      const server = new RpcServer({port, host: 'localhost'})
      const intrceptr = new IntrceptrServer({server, adminClient, happClient})
      console.log('Websocket server running on port', port)
      fulfill(intrceptr)
    })
  })
})

type SigningRequest = {
  entry: Object,
  callback: (Object) => void
}

const verifySignature = (entry, signature) => true

/**
 * A wrapper around a rpc-websockets Server and Client which brokers communication between
 * the browser user and the Conductor. The browser communicates with the Server, and the Client
 * is used to make calls to the Conductor's Websocket interface.
 */
export class IntrceptrServer {
  server: any
  adminClient: any  // TODO: move this to separate admin-only server that's not publicly exposed!
  happClient: any
  hostedClients: any[]  // TODO use this if ever we put each client on their own interface
  sockets: {[k: string]: Array<any>} = {}
  nextCallId = 0
  signingRequests = {}

  zomeCall: (r: CallRequest, ws: any) => Promise<any>

  constructor({server, adminClient, happClient}) {

    this.zomeCall = zomeCall(happClient)

    server.register(
      'holo/identify',
      this.identifyAgent
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
      this.zomeCall
    )

    server.register(
      // TODO: something in here to update the agent key associated with this socket connection?
      'holo/agents/new',
      this.newHostedAgent
    )

    server.register(
      'holo/debug',
      params => {
        const entry = "Sign this."
        this.startHoloSigningRequest('marmot', entry, (signature) => console.log("DEBUG: got signature", signature))
        return 'OK'
      }
    )

    server.on('listening', () => console.log("<C> listening"))
    server.on('error', data => console.log("<C> error: ", data))

    this.adminClient = adminClient
    this.happClient = happClient
    this.server = server
    this.sockets = {}
  }

  identifyAgent = ({agentKey}, ws) => {
    // TODO: also take salt and signature of salt to prove browser owns agent ID
    const agentId = agentIdFromKey(agentKey)
    console.log('identified as ', agentId)
    if (!this.sockets[agentId]) {
      this.sockets[agentId] = [ws]
    } else {
      this.sockets[agentId].push(ws)
    }
    ws.on('close', () => {
      // remove the closed socket
      this.sockets[agentId] = this.sockets[agentId].filter(socket => socket !== ws)
    })

    return agentId
  }

  newHostedAgent = async ({agentKey, happId}, _ws) => {
    const signature = 'TODO'
    await newAgent(this.adminClient)({agentKey, happId, signature}, _ws)
  }

  /**
   * Close both the server and client connections
   */
  close() {
    this.adminClient!.close()
    this.happClient!.close()
    this.server!.close()
  }

  /**
   * Function to be called externally, registers a signing request which will be fulfilled
   * by the `holo/clientSignature` JSON-RPC method registered on this server
   */
  startHoloSigningRequest(agentKey: string, entry: Object, callback: (Object) => void) {
    const id = this.nextCallId++
    // Send the signing request to EVERY client identifying with this agentKey
    if (!(agentKey in this.sockets)) {
      throw "Unidentified agent: " + agentKey
    }
    this.sockets[agentKey].forEach(socket => socket.send(JSON.stringify({
      jsonrpc: '2.0',
      notification: 'agent/sign',
      params: {entry, id}
    })))
    this.signingRequests[id] = {entry, callback}
  }

}
