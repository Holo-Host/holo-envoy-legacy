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
      location: 'src/shims/happ-data/simple-app/ui.tar',
      hash: 'QmSimpleAppFakeHash'
    },
  },
  {
    happId: 'QmY8bukKS7BStWq4ivv29ijePnUavfdCAnHEmJ6QuVspmg',
    nick: 'basic-chat',
    dnas: [
      {
        location: 'http://localhost:3333/holochain-basic-chat/dna/holo-chat.hcpkg',
        hash: 'Qmd3zeMA5S5YWQ4QAZ6JTBPEEAEJwGmoSxkYn6y2Pm4PNV'
      }
    ],
    ui: {
      location: 'http://localhost:3333/holochain-basic-chat/ui.tar',
      hash: 'QmBasicChatFakeHash'
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
      {location: 'nowhere', hash: 'test-dna-hash-1a'},
    ],
    ui: {location: 'nowhere.tar', hash: 'test-ui-hash-1'}
  },
  {
    happId: 'test-app-3',
    nick: 'test-app-3',
    dnas: [
      {location: 'nowhere', hash: 'test-dna-hash-3a'},
      {location: 'nowhere', hash: 'test-dna-hash-3b'},
      {location: 'nowhere', hash: 'test-dna-hash-3c'},
    ],
    ui: {location: 'nowhere.tar', hash: 'test-ui-hash-3'}
  }
]
