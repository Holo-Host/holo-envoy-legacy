/**
 * Server for Holo
 * 
 * Accepts requests similar to what the Conductor
 */

import {Client, Server} from 'rpc-websockets'

import * as Q from './queries'

type CallRequest = {
  agent: string,
  happ: HappID,
  dna: string,
  function: string,
  params: any
}

type HappID = string

export default (port) => {

  // a Client to the interface served by the Conductor
  const client = new Client('ws://localhost:8888')
  client.on('open', () => {

    // a Server for hQuery running in the browser
    const server = new Server({
      port,
      host: 'localhost'
    })

    server.register('holo/call', async ({agent, happ, dna, function: func, params}: CallRequest) => {
      let instance = await Q.lookupInstance(client, {dna, agent})
      console.log('instance found: ', instance)
      if (instance) {
        const result = await Q.callConductor(client, {
          id: instance.id,
          function: func, 
          params,
        })
        console.log('result: ', result)
        return result
      } else {
        return errorResponse("No instance found")
      }
    })

    server.register('holo/apps/install', async ({happId}) => {
      await Q.lookupHoloApp({happId})
    })
    
  })
}

const mapRequest = async (req) => {
  const {dnaHash, agentKey} = req
}

const errorResponse = msg => ({
  error: msg
})