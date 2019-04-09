import * as commander from 'commander'

import * as C from '../src/config'
import {fail, zomeCallByInstance} from '../src/common'
import {getMasterClient} from '../src/server'
import {shimHappById, shimHappByNick} from '../src/shims/happ-server'
import * as HH from '../src/flows/holo-hosting'

import {withIntrceptrClient, adminHostCall, doRegisterHost, doRegisterApp, doInstallAndEnableApp} from './common'

process.on('unhandledRejection', (reason, p) => {
  console.log("UNHANDLED REJECTION:", reason)
  throw ("Command threw exception, see reason above ^^")
})

const simpleApp = shimHappByNick('simple-app')!
const simpleAppDnaHash = simpleApp.dnas[0].hash
const agentId = 'dummy-fake-not-real-agent-id'


//////////////////////////////////////////////////

const commandRegisterAsProvider = async () => {
  return await doRegisterHost()
}

const commandRegisterHapp = async (happNick) => {
  const happEntry = shimHappByNick(happNick)!
  const happId = await doRegisterApp(happEntry)
  console.log("registered hApp: ", happId)
}

const commandInstall = async (happNick) => {
  const client = getMasterClient(false)
  const {happId} = shimHappByNick(happNick)!
  const happResult = await doInstallAndEnableApp(client, happId)
  client.close()
}

const commandNewAgent = (dir, cmd) => withIntrceptrClient(async client => {
  await client.call('holo/identify', {agentId})
  await client.call('holo/agents/new', {agentId, happId: simpleApp.happId})
})

const commandZomeCallPublic = (dir, cmd) => withIntrceptrClient(async client => {
  const result = await client.call('holo/call', {
    agentId: C.hostAgentId,
    happId: simpleApp.happId,
    dnaHash: simpleAppDnaHash,
    zome: 'simple',
    function: 'get_links',
    params: {base: 'TODO'},
    signature: 'TODO',
  })
  console.log("zome called:", result)
})

commander.version('0.0.1')
commander.command('register-provider').action(commandRegisterAsProvider)
commander.command('register-happ <happNick>').action(commandRegisterHapp)
commander.command('install <happNick>').action(commandInstall)
commander.command('new-agent').action(commandNewAgent)
commander.command('zome-call-public').action(commandZomeCallPublic)
commander.parse(process.argv)

// there is no nice way to print help statements if a command is invalid >:(
const cmdValid = (cmd, name) => cmd === name || typeof cmd === 'object' && cmd._name === name
const commandNames = commander.commands.map(c => c._name)
if (!commandNames.some(name => commander.args.some(cmd => cmdValid(cmd, name)))) {
  console.log("Invalid usage.\n")
  commander.help()
}