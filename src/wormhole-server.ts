import * as express from 'express'
import * as bodyParser from 'body-parser'


export default (port, icServer) => {

  const app = express()
  app.use(bodyParser.json())

  app.post('/', (req, res) => {
    console.log("WORMHOLE REQUEST: ", req.body)
    const {agent_id: agentKey, payload: entry} = req.body
    const callback = (signature) => res.json(signature)
    icServer.startHoloSigningRequest(agentKey, entry, callback)
  })

  app.listen(port, () => console.log(`Wormhole HTTP server listening on port ${port}`))
}
