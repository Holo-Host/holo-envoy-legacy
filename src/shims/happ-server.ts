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
}

export const shimHappByNick = nick => HAPP_DATABASE.find(a => a.nick === nick)
export const shimHappById = happId => HAPP_DATABASE.find(a => a.happId === happId)

export const HAPP_DATABASE = [
  {
    happId: 'QmSaU6meHqcLm8351EA5FMQtE11uedP2MMhpoQajqpch1Y',
    nick: 'simple-app',
    dnas: [
      {
        location: 'http://localhost:3333/simple-app/dist/simple-app.dna.json',
        hash: 'QmcnAdZJyDpJewK2sJPXTc5YUVg6ym6kink2n6MtJxVEze'
      }
    ],
    ui: {
      location: 'http://localhost:3333/simple-app/ui.tar',
      hash: 'Qm_UI_Simple_App_simple'
    },
  },
  {
    happId: 'QmUV3uZBnTvGenTLfMKWwA2WpiZMtnntwCWZ74r6qDC6hb',
    nick: 'basic-chat',
    dnas: [
      {
        location: 'http://localhost:3333/holochain-basic-chat/dna/holo-chat.hcpkg',
        hash: 'Qmd3zeMA5S5YWQ4QAZ6JTBPEEAEJwGmoSxkYn6y2Pm4PNV'
      }
    ],
    ui: {
      location: 'http://localhost:3333/holochain-basic-chat/ui.tar',
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
