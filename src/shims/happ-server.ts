import * as StaticServer from 'static-server'
import * as Config from '../config'


export const shimHappByNick = (nick) => HAPP_DATABASE.find(a => a.nick === nick)

// NB: The only way to find out the hApp ID is register the hApp with Holo Hosting App
// using register_app, and check its entry hash.

export const HAPP_DATABASE = [
  {
    happId: 'basic-chat',
    nick: 'basic-chat',
    dnas: [
      {
        location: Config.DEPENDENCIES.testResources.basicChat.dna.location,
        hash: 'QmeVtyWaYQt3pANiREofWHGuwW3dpdzLegvgmdFQ6fQ6Vx',
        handle: 'basic-chat',  // TODO: is this right?
      }
    ],
    ui: {
      location: Config.DEPENDENCIES.testResources.basicChat.ui.location,
      hash: 'FAKEHASH'
    },
  },

  // The following are for unit tests only
  {
    happId: 'test-app-1',
    nick: 'test-app-1',
    dnas: [
      {location: 'nowhere', hash: 'test-dna-hash-1a', handle: '1a'},
    ],
    ui: {location: 'nowhere.zip', hash: 'test-ui-hash-1'}
  },
  {
    happId: 'test-app-3',
    nick: 'test-app-3',
    dnas: [
      {location: 'nowhere', hash: 'test-dna-hash-3a', handle: '3a'},
      {location: 'nowhere', hash: 'test-dna-hash-3b', handle: '3b'},
      {location: 'nowhere', hash: 'test-dna-hash-3c', handle: '3c'},
    ],
    ui: {location: 'nowhere.zip', hash: 'test-ui-hash-3'}
  }
]
