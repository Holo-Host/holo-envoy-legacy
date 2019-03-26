/**
 * An HTTP server for Providers, primarily for interacting with the Holo Hosting App
 * It's uncertain how this will actually show up in the world. 
 * It's a temporary thing for now.
 */

import * as express from 'express'
import * as bodyParser from 'body-parser'
import {Client} from 'rpc-websockets'

import * as C from './config'
import {catchHttp} from './common'
import {registerHapp} from './flows/holo-hosting'

export default (port, masterClient) => {
  const app = express()
  app.use(bodyParser.json())

  app.post('/holo/happs/register', async (req, res, next) => {
    const {uiHash, dnaHashes} = req.body
    registerHapp(masterClient, {uiHash, dnaHashes})
      .then(() => res.send("Registration successful"))
      .catch(catchHttp(next))
  })

  const server = app.listen(port, () => console.log(`Admin HTTP server listening on port ${port}`))

  return server
}