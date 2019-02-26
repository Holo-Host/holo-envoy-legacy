/**
 * Server for Holo
 * 
 * Accepts requests similar to what the Conductor
 */


import startServer from './server'
import startWormholeServer from './wormhole-server'
import startShimServers from '../shims/happ-server'

startShimServers(3333, 7000)

startServer(3000).then(intrceptr => {
  startWormholeServer(8888, intrceptr)
})