import * as express from 'express'
import * as bodyParser from 'body-parser'


export default (port, icServer) => {

  const app = express()
  app.use(bodyParser.json())

  app.post('/', (req, res) => {
    console.log("WORMHOLE REQUEST: ", req.body)
    const {agent_id: agentId, payload: entry} = req.body
    const callback = (signature) => {
      console.log("Got signature: ", signature)
      res.send(signature)
    }
    icServer.startHoloSigningRequest(agentId, entry, callback)
  })

  const server = app.listen(port, () => console.log(`Wormhole HTTP server listening on port ${port}`))

  return server
}
