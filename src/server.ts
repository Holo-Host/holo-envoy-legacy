/**
 * Server for Holo
 *
 * Accepts requests similar to what the Conductor
 */

import * as colors from 'colors'
import * as fs from 'fs'
import * as express from 'express'
import * as path from 'path'
import * as morgan from 'morgan'
import axios from 'axios'
import * as Logger from '@whi/stdlog'
import {Client, Server as RpcServer} from 'rpc-websockets'

import * as Config from './config'
import installHapp, {InstallHappRequest} from './flows/install-happ'
import zomeCall, {CallRequest, logServiceSignature} from './flows/zome-call'
import newAgent, {NewAgentRequest} from './flows/new-agent'
import ConnectionManager from './connection-manager'

import startWormholeServer from './wormhole-server'
import startAdminHostServer from './admin-host-server'

const log = Logger('envoy-svr', { level: process.env.LOG_LEVEL || 'fatal' });

const successResponse = { success: true }

export default (port) => {
  // clients to the interface served by the Conductor
  const masterClient = getMasterClient(true)
  const publicClient = getPublicClient(true)
  const internalClient = getInternalClient(true)
  console.debug("Connecting to admin and happ interfaces...")

  const server = new EnvoyServer({masterClient, publicClient, internalClient})
  server.start(port)
  return server
}

/**
 * Replace original rpc-websockets client's call function
 * with one that waits for connection before calling and performs logging,
 * renaming the original function to `_call`
 * @type {[type]}
 */
export const makeClient = (name, url, opts) => {
  const client = new Client(url, opts)
  client.name = name;
  client._call = client.call
  client.call = callWhenConnected
  return client
}

/**
 * If the WS client is connected to the server, make the RPC call immediately
 * Otherwise, wait for connection, then make the call
 * Return a promise that resolves when the call is complete
 * NB: `this._call` comes from `makeClient` above
 * TODO: may eventually be superseded by ConnectionManager
 */
async function callWhenConnected (this: any, method, payload) {

  let promise, failure, responseRaw

  // Do waiting
  if(this.ready) {
    promise = Promise.resolve(this._call(method, payload))
  } else {
    promise = new Promise((resolve, reject) => {
      this.once('open', () => {
        this._call(method, payload).then(resolve).catch(reject)
      })
    })
  }

  try {
    responseRaw = await promise
  } catch (e) {
    failure = e
  }

  const response = (responseRaw && typeof responseRaw === 'string')
    ? JSON.parse(responseRaw)
    : responseRaw;

  if ( failure )
    log.error( `WS call (ERROR): ${method}`.red );
  else
    log.debug( `WS call: ${method}`.dim );
  
  log.silly("%s %s\n%s", 'request  ------>'.green.bold, `(${typeof payload})`.green.italic, JSON.stringify(payload, null, 2) );
  log.silly("%s %s\n%s", 'response <------'.cyan.bold,  `(${typeof payload})`.cyan.italic,  JSON.stringify(response, null, 2) );

  if (failure) {
    throw failure
  } else {
    return response
  }
}

const clientOpts = reconnect => ({ max_reconnects: 0, reconnect })  // zero reconnects means unlimited
export const getMasterClient	= (reconnect) => makeClient('master',	`ws://localhost:${Config.PORTS.masterInterface}`, clientOpts(reconnect))
export const getPublicClient	= (reconnect) => makeClient('public',	`ws://localhost:${Config.PORTS.publicInterface}`, clientOpts(reconnect))
export const getInternalClient	= (reconnect) => makeClient('internal',	`ws://localhost:${Config.PORTS.internalInterface}`, clientOpts(reconnect))

type SigningRequest = {
  entry: Object,
  callback: (Object) => void
}

const verifySignature = (entry, signature) => true

const fail = (e) => {
  console.error("envoy server request failure:", e)
  return e
}

const requiredFields = (...fields) => {
  const missing = fields.filter(field => field === undefined)
  if (missing.length > 0) {
    throw `The following fields were missing: ${missing.join(', ')}`
  }
}

/**
 * A wrapper around a rpc-websockets Server and Client which brokers communication between
 * the browser user and the Conductor. The browser communicates with the Server, and the Client
 * is used to make calls to the Conductor's Websocket interface.
 */
export class EnvoyServer {
  server: any
  clients: {[s: string]: any}  // TODO: move masterClient to separate admin-only server that's not publicly exposed!??
  nextCallId = 0
  signingRequests = {}
  connections: ConnectionManager

  constructor({masterClient, publicClient, internalClient}) {
    this.clients = {
      master: masterClient,
      public: publicClient,
      internal: internalClient,
    }
  }

  start = async (port) => {
    let wss, httpServer, adminServer, wormholeServer
    const server = this
    const importantConnections = ['master']
    this.connections = new ConnectionManager({
      connections: importantConnections,
      onStart: async () => {
        log.normal("Beginning server startup");
        httpServer = await this.buildHttpServer(this.clients.master);
        log.normal("HTTP server initialized");
        wss = await this.buildWebsocketServer(httpServer);
        log.normal("WS server initialized");
      
	adminServer = startAdminHostServer(Config.PORTS.admin, Config.defaultEnvoyHome, server.clients.master);
	wormholeServer = startWormholeServer(Config.PORTS.wormhole, server);

	await httpServer.listen(port, () => log.normal('HTTP server running on port: %s', port))

	wss.on('listening', () => log.normal("Websocket server listening on port: %s", port))
	wss.on('error', data => log.error("<C> error: %s", data))

        this.server = wss
      },
      onStop: () => {
        if (wss) {
          wss.close()
          console.log("Shut down wss")
        } else {
          console.log("Not shutting down wss??")
        }
        if (httpServer) {
          httpServer.close()
          console.log("Shut down httpServer")
        } else {
          console.log("Not shutting down httpServer??")
        }
        if (adminServer) {
          adminServer.close()
          console.log("Shut down adminServer")
        } else {
          console.log("Not shutting down adminServer??")
        }
        if (wormholeServer) {
          wormholeServer.close()
          console.log("Shut down wormholeServer")
        } else {
          console.log("Not shutting down wormholeServer??")
        }

        this.server = null
      },
    })

    // TODO: rework this so public and internal clients going down doesn't shut down
    // stuff that only affects the master client
    importantConnections.forEach(name => {
      const client = this.clients[name]
      client.on('open', () => this.connections.add(name))
      client.on('close', () => this.connections.remove(name))
    })
  }

  /**
   * Close the client connections
   */
  close() {
    Object.keys(this.clients).forEach((name) => {
      console.log(`Closing client: `, name)
      this.clients[name].reconnect = false
      this.clients[name].close()
    })
    // this.connections.dismantle()
  }


  buildHttpServer = async (masterClient) => {
    const app = express()

    function http_error_reponse(res, err) {
      res.status(500);
      res.json({
	"error": err.name,
	"message": err.message || String(err),
	"traceback": err.traceback,
      });
    }

    // Simply rely on the fact that UIs are installed in a directory
    // named after their happId
    // TODO: check access to prevent cross-UI requests?
    const uiRoot = Config.uiStorageDir(Config.defaultEnvoyHome)
    const uiDir = Config.devUI ? path.join(uiRoot, Config.devUI) : uiRoot
    log.normal("Serving all UIs from: %s", uiDir );

    app.use(morgan(function (self, req, res) {
      log.debug("Request:  %8.8s %s%s", req.method, req.hostname, req.path,  );
      log.debug("Response: %8.8d %s - length %s", res.statusCode, self['response-time'](req, res), res.getHeader('content-length') );
    }));
    // use the following for file-based logging
    // const logStream = fs.createWriteStream(path.join(__dirname, '..', 'log', 'access.log'), { flags: 'a' })
    // app.use(morgan(logFormat, {stream: logStream}))

    app.get('/favicon.ico', async (req, res) => {
      res.status(404).send('Resource not found');
    });
    
    app.use('/_dna_connections.json', async (req, res) => {
      /* Example of conductor /_dna_connections.json response:
       * 
       *   {
       *     "dna_interface":{
       *       "id":"master-interface",
       *       "driver":{
       *         "type":"websocket",
       *         "port":1111
       *       },
       *       "admin":true,
       *       "instances":[
       *         {
       *           "id":"holo-hosting-app"
       *         },{
       *           "id":"happ-store"
       *         },{
       *           "id":"holofuel"
       *         }
       *       ]
       *     }
       *   }
       * 
       */
      try {
	const response = await axios.get('http://localhost:8088/_dna_connections.json', {
	  responseType: 'json',
	});
	if ( response.status === 200 ) {
	  // replace conductor port with envoy port
	  response.data.dna_interface.driver.port = Config.PORTS.external;
	  res.json( response.data );
	}
	else {
	  res.status(response.status).send(response.data);
	}
      }
      catch (err) {
	return http_error_reponse(res, err);
      }
    });
    
    app.use('*', async (req, res, next) => {
      const host = req.headers['x-forwarded-host'] || req.hostname || ""

      const [happHash, partialAgentId, ...domain] = host.split('.')
      log.info("Incoming address: %s", host );
      log.info("    hApp Hash: %s", happHash );
      log.info("     Agent ID: %s", partialAgentId );
      log.info("       Domain: %s", domain );
      
      const domainExpected = 'holohost.net'.split('.')
      const validHost = (
        domain[0] === domainExpected[0]
	  && domain[1] === domainExpected[1]
	  && happHash
	  && partialAgentId
      )
      if (!validHost)
        return next(new Error(`X-Forwarded-Host header or hostname is not properly set "${host}": should be <happ hash>.<agent id>.holohost.net`));
      
      // TODO: Refactor following once we have a solution to host happs with case-SENSITIVITY in tact.
      // Since domain names are case-insensitive, we lose casing on the happ hash.
      // Therefore, we need to search for the properly cased directory to serve from.
      const uiApps = (sourceDir) => fs.readdirSync(sourceDir).filter(
	file => fs.statSync(
	  path.join(sourceDir, file)
	).isDirectory()
      );
      log.debug("UI Directory: %s", uiDir );
      const uiAppArray = uiApps(uiDir);
      log.debug("[%s] available happ hashes", uiAppArray.join(', '));
      
      const trueHappHash = await this.findCaseInsensitiveMatch(uiAppArray, happHash);
      if (!trueHappHash)
        return next(new Error(`The case-insensitive happ hash '${happHash}' appears not to have been installed on this conductor!`))

      const staticFile = path.join(uiDir, trueHappHash, req.originalUrl);
      log.debug('Serving static UI asset: %s', staticFile );

      res.sendFile(staticFile, null, next)
    })

    return require('http').createServer(app)
  }

  findCaseInsensitiveMatch = (uiAppHashes: Array<string>, happHashLowerCase) => {
    for (let [i,hash] of Object.entries(uiAppHashes)) {
      const lcHash = hash.toLowerCase();
      log.debug("%s === %s", happHashLowerCase, lcHash );
      if (lcHash === happHashLowerCase)
	return uiAppHashes[i];
    }
    return false;
  }

  buildWebsocketServer = async (httpServer) => {
    const wss = new RpcServer({server: httpServer})

    // NB: the following closures are intentional, i.e. just passing the
    // member function to wss.register causes sinon to not correctly be able
    // to spy on the function calls. Don't simplify!

    wss.register('holo/identify', a => this.identifyAgent(a))

    wss.register('holo/clientSignature', a => this.wormholeSignature(a))  // TODO: deprecated
    wss.register('holo/wormholeSignature', a => this.wormholeSignature(a))

    wss.register('holo/serviceSignature', a => this.serviceSignature(a))

    wss.register('holo/call', a => this.zomeCall(a))

    // TODO: something in here to update the agent key subscription? i.e. re-identify?
    wss.register('holo/agents/new', a => this.newHostedAgent(a))

    return wss
  }

  identifyAgent = ({agentId}) => {
    requiredFields(agentId)

    // TODO: also take salt and signature of salt to prove browser owns agent ID
    log.debug("Adding new event to server: %s", `agent/${agentId}/sign`);

    try {
      this.server!.event(`agent/${agentId}/sign`)
    } catch (e) {
      if (e.message.includes('Already registered event')) {
        console.log('welcome back', agentId)
      } else {
        throw e
      }
    }

    console.log('identified as ', agentId)
    return { agentId }
  }

  wormholeSignature = ({signature, requestId}) => {
    console.log("Totally gettin' called...", {signature, requestId})
    requiredFields(requestId)
    const {entry, callback} = this.signingRequests[requestId]
    verifySignature(entry, signature)  // TODO: really?
    callback(signature)
    delete this.signingRequests[requestId]
    return successResponse
  }

  serviceSignature = ({happId, responseEntryHash, signature}) => {
    requiredFields(happId, responseEntryHash, signature)
    return logServiceSignature(this.clients.internal, {happId, responseEntryHash, signature})
  }

  newHostedAgent = async ({agentId, happId}) => {
    requiredFields(agentId, happId)
    const signature = 'TODO'
    await newAgent(this.clients.master)({agentId, happId, signature})
    return successResponse
  }

  zomeCall = (params: CallRequest) => {
    return zomeCall(this.clients.master, this.clients.public, this.clients.internal)(params).catch(fail)
  }

  /**
   * Function to be called externally, registers a signing request which will be fulfilled
   * by the `holo/wormholeSignature` JSON-RPC method registered on this server
   */
  startHoloSigningRequest(agentId: string, entry: Object, callback: (Object) => void) {
    const id = this.nextCallId++
    console.debug('envoy server emitting sign request event: ', `agent/${agentId}/sign`, {entry, id})
    this.server.emit(`agent/${agentId}/sign`, {entry, id})
    this.signingRequests[id] = {entry, callback}
  }

}
