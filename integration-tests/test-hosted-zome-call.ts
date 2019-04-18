
import * as sinon from 'sinon'

import * as Config from '../src/config'
import * as holochainClient from "@holochain/hc-web-client"
import {sinonTest} from '../test/common'

const HC = require('@holo-host/hclient')

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
  return withConductor(T, async (envoy) => {
    // setup host
    await doRegisterHost()
    const {happId, dnaHashes} = await doAppSetup(happNick)
    const dnaHash = dnaHashes[0]!

    // setup some spies
    const spyEnvoyEmit = sinon.spy(envoy.server, 'emit')
    const spySigningStart = sinon.spy(envoy, 'startHoloSigningRequest')
    const spySigningEnd = sinon.spy(envoy, 'wormholeSignature')
    const spyZomeCall = sinon.spy(envoy, 'zomeCall')

    // start anonymous browser session
    const holo = await HC.makeWebClient(holochainClient, happId, {
      url: `ws://localhost:${Config.PORTS.external}`,
      dnaHash
    })
    const {call, close, ws: holoClient} = await holo.connect()

    // start hosted session
    const hostingResponse = await HC.requestHosting()
    T.equal(hostingResponse.success, true)

    const agentId = await HC.getCurrentAgentId()
    const zomeCall = (func, params) => call(`IGNORED/chat/${func}`)(params)

    const address = await zomeCall('register', {
      name: 'chat noir',
      avatar_url: "",
    })
    const result = await zomeCall('get_all_public_streams', {})

    T.callOrder(spySigningStart, spySigningEnd)

    // Test that agent signs their own agent entry
    T.calledWith(spySigningStart, agentId, agentId, sinon.match.func)

    // TODO: test other expected signing requests

    T.calledWith(spySigningEnd, sinon.match({requestId: 0}))
    T.calledWith(spySigningEnd, sinon.match.has('signature'))

    T.equal(spySigningStart.callCount, spySigningEnd.callCount)

    T.calledWith(spyZomeCall, sinon.match({
      agentId,
      dnaHash,
      function: "get_all_public_streams",
      happId,
      params: {},
      zome: "chat"
    }))

    T.ok(address)
    T.deepEqual(result, [])

    holoClient.close()

    await delay(500)
  })
})
