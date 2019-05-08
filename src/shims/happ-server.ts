import * as express from 'express'
import * as Config from '../config'
import * as path from 'path'

// instructs the static file server as to the location of the hAPP bundles it should serve.
// This way they don't all need to be in a particular directory and can be external to this repo
// make sure the routes are URL safe and unique
// paths should be relative to the current file
export const HAPP_SERVER_CONFIG: Array<{route: string, path: string}> = [
  {
    route: "holochain-basic-chat",
    path: "../../../../basic-chat"
  }
]

export default (shimPort) => {
  const app = express()
  HAPP_SERVER_CONFIG.forEach((config) => {
    const dir = path.join(__dirname, config.path)
    app.use(`/${config.route}`, express.static(dir))
    console.log(`[Shim server]: Serving directory ${dir} on /${config.route}`)
  })
  app.listen(shimPort)
  console.log('Shim server running on port', shimPort)
  return app
}

export const shimHappByNick = nick => HAPP_DATABASE.find(a => a.nick === nick)
export const shimHappById = happId => HAPP_DATABASE.find(a => a.happId === happId)


// NB: The only way to find out the hApp ID is register the hApp with Holo Hosting App
// using register_app, and check its entry hash.

export const HAPP_DATABASE = [
  {
    happId: 'QmSKxN3FGVrf1vVMav6gohJVi7GcF4jFcKVDhDcjiAnveo',
    nick: 'simple-app',
    dnas: [
      {
        location: `http://localhost:${Config.PORTS.shim}/simple-app/dist/simple-app.dna.json`,
        hash: 'QmSKxN3FGVrf1vVMav6gohJVi7GcF4jFcKVDhDcjiAnveo'
      }
    ],
    ui: {
      location: 'src/shims/happ-data/simple-app/ui.zip',
      hash: 'QmSimpleAppFakeHash'
    },
  },

  {
    happId: 'QmYvoxkYYAhr2GsYHoSvAaERuQWXaED9HNqobEzwfuqEJA',
    nick: 'basic-chat',
    dnas: [
      {
        location: `http://localhost:${Config.PORTS.shim}/holochain-basic-chat/dna-src/dist/dna-src.dna.json`,
        hash: 'QmVq8BYN8QLKwdg15coikJZFdQw5Jsv2CfVWxwNyCY9sA2'
      }
    ],
    ui: {
      location: `http://localhost:${Config.PORTS.shim}/holochain-basic-chat/ui.zip`,
      hash: 'QmBasicChatFakeHash'
    },
  },

  // The following are for testing only
  {
    happId: 'test-app-1',
    nick: 'test-app-1',
    dnas: [
      {location: 'nowhere', hash: 'test-dna-hash-1a'},
    ],
    ui: {location: 'nowhere.zip', hash: 'test-ui-hash-1'}
  },
  {
    happId: 'test-app-3',
    nick: 'test-app-3',
    dnas: [
      {location: 'nowhere', hash: 'test-dna-hash-3a'},
      {location: 'nowhere', hash: 'test-dna-hash-3b'},
      {location: 'nowhere', hash: 'test-dna-hash-3c'},
    ],
    ui: {location: 'nowhere.zip', hash: 'test-ui-hash-3'}
  }
]
