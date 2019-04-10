import * as express from 'express'
import * as cors from 'cors'
import * as bodyParser from 'body-parser'
import {Client} from 'rpc-websockets'

import * as C from './config'
import {catchHttp} from './common'
import installHapp, {InstallHappRequest} from './flows/install-happ'
import * as HH from './flows/holo-hosting'

export default (port, baseDir: string, masterClient) => {
  const app = express()
  app.use(bodyParser.json())
  app.use(cors({origin: true}))  // TODO: tighten up CORS before launch!

  app.post('/holo/happs/install', async (req, res, next) => {
    const {happId}: InstallHappRequest = req.body
    installHapp(masterClient, baseDir)({happId})
      .then(() => res.send("Installation successful"))
      .catch(catchHttp(next))
  })

  app.post('/holo/happs/enable', async (req, res, next) => {
    const {happId}: InstallHappRequest = req.body
    HH.enableHapp(masterClient, happId)
      .then(() => res.send("App enabled successfully"))
      .catch(catchHttp(next))
  })

  app.post('/holo/happs/disable', async (req, res, next) => {
    const {happId}: InstallHappRequest = req.body
    HH.disableHapp(masterClient, happId)
      .then(() => res.send("App disabled successfully"))
      .catch(catchHttp(next))
  })

  const server = app.listen(port, () => console.log(`Admin HTTP server listening on port ${port}`))

  return server
}
