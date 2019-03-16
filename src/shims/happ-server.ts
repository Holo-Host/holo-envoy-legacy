import * as StaticServer from 'static-server'

export type HappResource = {
  location: string,
  hash: string,
}

export type HappEntry = {
  dnas: Array<HappResource>
  ui: HappResource | void
}

export default (shimPort, uiPort) => {
  const shimServer = new StaticServer({
    rootPath: './src/shims/happ-data',
    port: shimPort
  })
  console.log('Shim server running on port', shimPort)
  shimServer.start()

  const uiServer = new StaticServer({
    rootPath: './src/shims/ui',
    port: uiPort
  })
  console.log('UI server running on port', uiPort)
  uiServer.start()
}

export const HAPP_DATABASE = {
  'simple-app': {
    dnas: [
      {
        location: 'http://localhost:3333/simple-app/dist/simple-app.dna.json',
        hash: 'QmUzZJmfXpxrwUcCeDV16DxeDF59PW2wSaFXzDpZZ33nVx'
      }
    ],
    ui: {
      location: 'http://localhost:3333/simple-app/ui.tar',
      hash: 'Qm_UI_Simple_App_simple'
    },
  },
  'basic-chat': {
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
  // 'holo-hosting': {
  //   dnas: [
  //     {
  //       location: 'http://localhost:3333/Holo-Hosting-App/dna-src/dist/dna-src.dna.json',
  //       hash: 'Qm_DNA_Holo_Hosting_App'
  //     }
  //   ]
  // }
  'test-app-id': {  // for testing only
    dnas: [
      {location: 'nowhere', hash: 'hash'},
      {location: 'nowhere', hash: 'hash'},
      {location: 'nowhere', hash: 'hash'},
    ],
    ui: {location: 'nowhere', hash: 'hash'}
  }
}