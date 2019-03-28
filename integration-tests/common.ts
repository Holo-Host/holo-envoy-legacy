import axios from 'axios'
import {Client} from 'rpc-websockets'

import * as Config from '../src/config'

export const adminHostCall = (uri, data) => {
  return axios.post(`http://localhost:${Config.PORTS.admin}/${uri}`, data)
}

export const withIntrceptrClient = fn => new Promise((resolve, reject) => {
  const client = new Client(`ws://localhost:${Config.PORTS.intrceptr}`, {
    reconnect: false
  })
  client.on('error', msg => console.error("WS Client error: ", msg))
  client.once('open', async () => {
    // setup wormhole client dummy response
    // TODO: make it real
    client.subscribe('agent/sign')
    client.on('agent/sign', (params) => {
      console.log('on agent/sign:', params)
      const {entry, id} = params
      client.call('holo/wormholeSignature', {
        signature: 'TODO-signature',
        requestId: id,
      })
    })

    return fn(client)
      .catch(reject)
      .finally(() => client.close())
      .then(resolve)
  })
})
