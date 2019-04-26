import * as StaticServer from 'static-server'
import * as Config from '../config'

export default (shimPort) => {
  const shimServer = new StaticServer({
    rootPath: './src/shims/happ-data',
    port: shimPort
  })
  console.log('Shim server running on port', shimPort)
  shimServer.start()
  return shimServer
}

export const shimHappByNick = nick => HAPP_DATABASE.find(a => a.nick === nick)
export const shimHappById = happId => HAPP_DATABASE.find(a => a.happId === happId)

// NB: The only way to find out the hApp ID is register the hApp with Holo Hosting App
// using register_app, and check its entry hash.

export const HAPP_DATABASE = [
  {
    happId: 'QmYcfBXfbFJSWfeNC32oEUL1bKsYvXRVN56me4Q9tNHUH7',
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
    happId: 'QmWhpNUrB6K4kcXp4rGqYtgb823zeabxRA6GUbuvk7TWgv',
    nick: 'basic-chat',
    dnas: [
      {
        location: `http://localhost:${Config.PORTS.shim}/holochain-basic-chat/dna-src/dist/dna-src.dna.json`,
        hash: 'QmPmrxbyKPTKcpWnaEVyqXRN4efSjsa8s92hH654uQCZ9X'
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
