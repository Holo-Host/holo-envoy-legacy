/**
 * Server for Holo
 * 
 * Accepts requests similar to what the Conductor
 */

import startServer from './server'

const port = 3000
startServer(port)
console.log(`server running on port ${port}`)