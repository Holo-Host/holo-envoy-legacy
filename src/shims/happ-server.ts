import * as StaticServer from 'static-server'

export type HappResource = {
  location: string,
  hash: string,
}

export type HappEntry = {
  dnas: Array<HappResource>
  ui?: HappResource | void
}

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

export const HAPP_DATABASE = [
  {
    happId: 'QmYcfBXfbFJSWfeNC32oEUL1bKsYvXRVN56me4Q9tNHUH7',
    nick: 'simple-app',
    dnas: [
      {
        location: 'http://localhost:3333/simple-app/dist/simple-app.dna.json',
        hash: 'QmSKxN3FGVrf1vVMav6gohJVi7GcF4jFcKVDhDcjiAnveo'
      }
    ],
    ui: {
      location: 'src/shims/happ-data/simple-app/ui',
      hash: 'Qm_UI_Simple_App_simple'
    },
  },
  {
    happId: 'QmUV3uZBnTvGenTLfMKWwA2WpiZMtnntwCWZ74r6qDC6hb',
    nick: 'basic-chat',
    dnas: [
      {
        location: 'src/shims/happ-data/holochain-basic-chat/dna/holo-chat.hcpkg',
        hash: 'Qmd3zeMA5S5YWQ4QAZ6JTBPEEAEJwGmoSxkYn6y2Pm4PNV'
      }
    ],
    ui: {
      location: 'src/shims/happ-data/holochain-basic-chat/ui',
      hash: 'Qm_UI_Simple_App_chat'
    },
  },
  {
    happId: 'holo-hosting',
    nick: 'holo-hosting',
    dnas: [
      {
        location: 'http://localhost:3333/Holo-Hosting-App/dist/Holo-Hosting-App.dna.json',
        hash: 'QmXuPFimMCoYQrXqX9vr1vve8JtpQ7smfkw1LugqEhyWTr'
      }
    ]
  },

  // The following are for testing only
  {
    happId: 'test-app-1',
    nick: 'test-app-1',
    dnas: [
      {location: 'nowhere', hash: 'hash'},
    ],
    ui: {location: 'nowhere', hash: 'hash'}
  },
  {
    happId: 'test-app-3',
    nick: 'test-app-3',
    dnas: [
      {location: 'nowhere', hash: 'hash'},
      {location: 'nowhere', hash: 'hash'},
      {location: 'nowhere', hash: 'hash'},
    ],
    ui: {location: 'nowhere', hash: 'hash'}
  }
]
