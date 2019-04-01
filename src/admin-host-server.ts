import * as express from 'express'
import * as bodyParser from 'body-parser'
import {Client} from 'rpc-websockets'

import * as C from './config'
import {catchHttp} from './common'
import installHapp, {InstallHappRequest} from './flows/install-happ'

export default (port, baseDir: string, masterClient) => {
  const app = express()
  app.use(bodyParser.json())

  app.post('/holo/happs/install', async (req, res, next) => {
    const {happId}: InstallHappRequest = req.body
    installHapp(masterClient, baseDir)({happId})
      .then(() => res.send("Installation successful"))
      .catch(catchHttp(next))
  })

  const server = app.listen(port, () => console.log(`Admin HTTP server listening on port ${port}`))

  return server
}
