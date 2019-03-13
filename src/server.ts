/**
 * Server for Holo
 *
 * Accepts requests similar to what the Conductor
 */

import * as express from 'express'
import {Client, Server as RpcServer} from 'rpc-websockets'

import {uiIdFromHappId} from './common'
import * as C from './config'
import installHapp, {InstallHappRequest, listHoloApps} from './flows/install-happ'
import zomeCall, {CallRequest} from './flows/zome-call'
import newAgent, {NewAgentRequest} from './flows/new-agent'

const successResponse = { success: true }

export default (port) => new Promise((fulfill, reject) => {
  // clients to the interface served by the Conductor
  const masterClient = new Client(`ws://localhost:${C.PORTS.masterInterface}`)
  const publicClient = new Client(`ws://localhost:${C.PORTS.publicInterface}`)
  const internalClient = new Client(`ws://localhost:${C.PORTS.internalInterface}`)
  console.debug("Connecting to admin and happ interfaces...")
  masterClient.once('open', () => {
    publicClient.once('open', () => {
      internalClient.once('open', () => {
        const intrceptr = new IntrceptrServer({masterClient, publicClient, internalClient})
        console.log('Websocket server running on port', port)
        intrceptr.start(port).then(() => fulfill(intrceptr))
      })
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
  masterClient: any  // TODO: move this to separate admin-only server that's not publicly exposed!
  publicClient: any
  internalClient: any
  hostedClients: any[]  // TODO use this if ever we put each client on their own interface
  nextCallId = 0
  signingRequests = {}

  constructor({masterClient, publicClient, internalClient}) {
    this.masterClient = masterClient
    this.publicClient = publicClient
    this.internalClient = internalClient
  }

  start = async (port) => {
    const httpServer = await this.buildHttpServer(this.masterClient)
    const wss = await this.buildWebsocketServer(httpServer)

    httpServer.listen(port, () => console.log('HTTP server running on port', port))
    wss.on('listening', () => console.log("Websocket server listening on port", port))
    wss.on('error', data => console.log("<C> error: ", data))
    
    this.server = wss
  }

  buildHttpServer = async (masterClient) => {
    const app = express()

    const happs = await listHoloApps()
    const uis = await masterClient.call('admin/ui/list')
    const uisById = {}

    for (const ui of uis) {
      uisById[ui.id] = ui
    }
    Object.keys(happs).forEach(happId => {
      const ui = uisById[uiIdFromHappId(happId)]
      if (ui) {
        const dir = ui.root_dir
        const hash = ui.id  // TODO: eventually needs to be hApp hash!
        app.use(`/${happId}`, express.static(dir))
        console.log(`serving UI for '${happId}' from '${dir}'`)
      } else {
        console.warn(`App '${happId}' has no UI, skipping...`)
      }
    })
    
    // TODO: redirect to ports of conductor UI interfaces
    return require('http').createServer(app)
  }

  buildWebsocketServer = async (httpServer) => {
    const wss = new RpcServer({server: httpServer})

    wss.register('holo/identify', this.identifyAgent)

    wss.register('holo/clientSignature', this.clientSignature)

    wss.register('holo/call', this.zomeCall)

    // TODO: something in here to update the agent key subscription? i.e. re-identify?
    wss.register('holo/agents/new', this.newHostedAgent)

    return wss
  }

  
  // TODO: service log signature endpoint


  identifyAgent = ({agentId}, ws) => {
    // TODO: also take salt and signature of salt to prove browser owns agent ID
    console.log("adding new event to server", `agent/${agentId}/sign`)
    this.server.event(`agent/${agentId}/sign`)

    console.log('identified as ', agentId)
    // if (!this.sockets[agentId]) {
    //   this.sockets[agentId] = [ws]
    // } else {
    //   this.sockets[agentId].push(ws)
    // }
    // ws.on('close', () => {
    //   // remove the closed socket
    //   this.sockets[agentId] = this.sockets[agentId].filter(socket => socket !== ws)
    // })

    return { agentId }
  }

  clientSignature = ({signature, requestId}) => {
    const {entry, callback} = this.signingRequests[requestId]
    verifySignature(entry, signature)
    callback(signature)
    delete this.signingRequests[requestId]
    return successResponse
  }

  newHostedAgent = async ({agentId, happId}) => {
    const signature = 'TODO'
    await newAgent(this.masterClient)({agentId, happId, signature})
    return successResponse
  }

  zomeCall = (params: CallRequest) => zomeCall(this.publicClient, this.internalClient)(params)


  /**
   * Function to be called externally, registers a signing request which will be fulfilled
   * by the `holo/clientSignature` JSON-RPC method registered on this server
   */
  startHoloSigningRequest(agentId: string, entry: Object, callback: (Object) => void) {
    const id = this.nextCallId++
    // if (!(agentId in this.sockets)) {
    //   throw "Unidentified agent: " + agentId
    // }
    this.server.emit(`agent/${agentId}/sign`, {entry, id})
    this.signingRequests[id] = {entry, callback}
  }

  /**
   * Close both the server and client connections
   */
  close() {
    this.masterClient!.close()
    this.publicClient!.close()
    this.internalClient!.close()
    this.server!.close()
  }


}
