
import * as sinon from 'sinon'

import * as Config from '../src/config'
import * as HC from '@holo-host/hclient'
import * as holochainClient from "@holochain/hc-web-client"
import {sinonTest} from '../test/common'

import {withConductor, getTestClient, adminHostCall, delay, doRegisterApp, doRegisterHost, doAppSetup, zomeCaller} from './common'

const setupDpki = () => {
  const DPKI = HC.dpkiUltralite
  const {keyManagement} = HC

  const mockSaltRegistration = (email, salt) => salt
  const mockGetRegisteredSalt = (email) => keyManagement.getLocalEntropy()

  const mocks = {
    generateReadonlyKeypair: () => keyManagement.generateReadonlyKeypair(
      keyManagement.getLocalEntropy,
      keyManagement.getLocalEntropy
    ),

    generateNewReadwriteKeypair: () => keyManagement.generateNewReadwriteKeypair(
      'test@test.com',
      '123abc',
      keyManagement.getLocalEntropy,
      keyManagement.getLocalEntropy,
      mockSaltRegistration
    ),

    regenerateReadwriteKeypair: () => keyManagement.regenerateReadwriteKeypair(
      'test@test.com',
      '123abc',
      mockGetRegisteredSalt
    )
  }

  HC.setKeyManagementFunctions(mocks)
}

setupDpki()


// TODO remove only
sinonTest.only('can do hosted zome call', async T => {
  const happNick = 'basic-chat'
  return withConductor(async (intrceptr) => {
    // setup host
    await doRegisterHost()
    const {happId, dnaHashes} = await doAppSetup(happNick)
    const dnaHash = dnaHashes[0]!

    // setup some spies
    const spyIntrceptrEmit = sinon.spy(intrceptr.server, 'emit')
    const spySigningStart = sinon.spy(intrceptr, 'startHoloSigningRequest')
    const spySigningEnd = sinon.spy(intrceptr, 'wormholeSignature')

    // start anonymous browser session
    const holo = await HC.makeWebClient(holochainClient, happId, {
      url: `ws://localhost:${Config.PORTS.intrceptr}`,
      dnaHash
    })
    const {call, close, ws: holoClient} = await holo.connect()

    // start hosted session
    HC.requestHosting()

    const zomeCall = (func, params) => call(`IGNORED/chat/${func}`)(params)

    const address = await zomeCall('register', {
      name: 'chat noir',
      avatar_url: "",
    })
    const result = await zomeCall('get_all_public_streams', {})


    T.callOrder(spySigningStart, spySigningEnd)
    T.calledWith(spySigningStart, 0)
    T.calledWith(spySigningEnd, 0)

    T.ok(address)
    T.deepEqual(result, [])

    holoClient.close()
  })
})
