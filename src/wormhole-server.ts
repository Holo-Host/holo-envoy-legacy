import * as express from 'express'
import * as bodyParser from 'body-parser'
import * as Logger from '@whi/stdlog'

const log = Logger('envoy-wormhole', { level: process.env.LOG_LEVEL || 'fatal' });

export default (port, icServer) => {

  const app = express()
  app.use(bodyParser.json())

  app.post('/', (req, res) => {
    console.log("WORMHOLE REQUEST: ", req.body)
    const {agent_id: agentId, payload: entry} = req.body
    const callback = (signature) => {
      console.log("Got signature from wormhole: ", signature)
      res.send(signature)
    }
    icServer.startHoloSigningRequest(agentId, entry, callback)
  })

  const server = app.listen(port, () => log.normal(`Wormhole HTTP server listening on port ${port}`))

  return server
}
