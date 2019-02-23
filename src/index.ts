/**
 * Server for Holo
 * 
 * Accepts requests similar to what the Conductor
 */


import startServer from './server'
import startShimServer from '../shims/happ-server'

startShimServer(3333)
startServer(3000)