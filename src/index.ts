/**
 * Server for Holo
 *
 * Accepts requests similar to what the Conductor
 */


import startServer from './server'
import startWormholeServer from './wormhole-server'
import startAdminServer from './admin-server'
import startShimServers from './shims/happ-server'
import * as C from './config'

console.log('----------------------------------')

process.on('unhandledRejection', (reason, p) => {
  console.log("*** UNHANDLED REJECTION ***")
  console.log("reason: ", reason)
})

startShimServers(C.PORTS.shim, C.PORTS.ui)
startAdminServer(C.PORTS.admin)
startServer(C.PORTS.intrceptr).then(intrceptr => {
  startWormholeServer(C.PORTS.wormhole, intrceptr)
})
