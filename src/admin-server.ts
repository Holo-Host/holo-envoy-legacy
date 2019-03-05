import * as express from 'express'
import * as bodyParser from 'body-parser'
import {Client} from 'rpc-websockets'

import * as C from './config'
import {installHapp} from './flows'
import {InstallHappRequest} from './flows/install-happ'

export default (port) => {
  const adminClient = new Client(`ws://localhost:${C.PORTS.adminInterface}`)

  const app = express()
  app.use(bodyParser.json())

  app.post('/holo/happs/install', async (req, res, next) => {
    const {happId}: InstallHappRequest = req.body
    installHapp(adminClient)({happId})
      .then(() => res.send("Installation successful"))
      .catch(e => next(JSON.stringify(e)))
  })

  app.listen(port, () => console.log(`Admin HTTP server listening on port ${port}`))
}
