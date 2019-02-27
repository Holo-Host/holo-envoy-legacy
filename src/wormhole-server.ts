import * as express from 'express'
import * as bodyParser from 'body-parser'


export default (port, icServer) => {

  const app = express()
  app.use(bodyParser.json())
  
  app.post('/', (req, res) => {
    const {agent_id: agentKey, payload: entry} = req.body
    const callback = (signature) => res.json(signature)
    icServer.startHoloSigningRequest(agentKey, entry, callback)
  })

  app.listen(port, () => console.log(`Example app listening on port ${port}!`))
}