# Holo Envoy

[![CircleCI](https://circleci.com/gh/Holo-Host/envoy.svg?style=svg)](https://circleci.com/gh/Holo-Host/envoy)

The Holo Envoy is a nodejs program which provides publicly-exposed ports for browser users to connect to Holo Hosts. It also provides much of the "connective tissue" between various Holo core components: the Holo Hosting App, Signed Service Logs, DeepKey, and the Holochain Conductor itself.

Its primary function is as a websocket server which allows browser users to connect to a Holo Host's machine (HoloPort or otherwise). Envoy connects directly to a Holochain Conductor running on the same machine, serving as the intermediary between the Holo-hosted user in the browser and the Holo-agnostic DNA instances running in the Holochain Conductor.

It also provides an interface to the Holo Host, allowing them to manage installed hApps and view metrics on service activity.

## Architecture

Envoy is essentially a collection of independent web services that interact with a running Holochain Conductor as well as the filesystem.

### UI server

*port 48080*

Hosts currently serve both the UIs and the DNAs for the hApps they are hosting. A simple web server runs, allowing UI assets to be fetched at the URL based at the hApp ID. For instance, if a UI refers to a resource at the relative path `images/goku.jpg`, it can be retrieved via `GET http://localhost:48080/<happId>/images/goku.jpg`.

#### Websocket server

*port 48080* (same as UI server)

One of the services is a websocket server, which is the main interface to outside world. This is the service that clients (i.e. web UIs) use to instruct a Holo Host to call zome functions on their behalf. It runs on the same port as the websocket server, by design.

* `holo/call` - call a zome function, initiating a service request
* `holo/serviceSignature` - called subconsciously by hClient as the final step of the servicelogger request cycle, this is for providing the signature of the response after being served a zome call's results
* `holo/agents/new` - request this Host to create a source chain and host the remote agent
* `holo/wormholeSignature` - temporary hack, allowing the client to respond to signature requests from the Host. This will be obsoleted after the "web conductor" (light client) is implemented.

See [src/server.ts](src/server.ts) for implementations of both the UI server and websocket server 

#### Admin server

A separate HTTP server exists to perform certain admin functionality, used only by the Host on their own machine. 

* `POST holo/happs/install` - The is most significant admin endpoint, used to actually install a new hApp on this system,  This endpoint:
	- Downloads DNAs and UI for the hApp from the web onto the filesystem
	- Installs them via admin calls to the Conductor, modifying the Conductor config
	- Creates instances of the hosted hApp DNAs, as well as a new instance of the servicelogger
* `POST holo/happs/enable` - Update HHA to show that this app is enabled
* `POST holo/happs/disable` - Update HHA to show that this app is disabled

All requests should be JSON, i.e. use `Content-Type: application/json`. Currently CORS access is set to fully open.

See [src/admin-host-server.ts](src/admin-host-server.ts) for implementation

## Getting Started

## Installation

Let's start with the NPM dependencies:

    npm install

### DNA and UI dependencies

Envoy requires a handful of DNAs and UIs for its proper functioning. There is a file, [./src/config/dependencies.ts](./src/config/dependencies.ts) which lists the current dependencies for Envoy. To download them all, simply run:

    npm run deps

which will cause all dependencies to be downloaded and stored in `./src/config/.envoy-deps`.

For reference, the dependencies include these DNAs: 

- [servicelogger](https://github.com/Holo-Host/servicelogger)
- [holofuel](https://github.com/Holo-Host/holofuel)
- [hApp Store](https://github.com/holochain/HApps-Store)
- [Holo Hosting App](https://github.com/Holo-Host/Holo-Hosting-App)

as well as these corresponding GUIs:

- [holofuel GUI](https://github.com/Holo-Host/holofuel-gui)
- [hApp Store GUI](https://github.com/holochain/HApps-Store) (same repository as DNA)
- [Holo Hosting App GUI](https://github.com/Holo-Host/holo-hosting-app_GUI/tree/interceptor-tester)

#### Local development against DNA and UI dependencies

When developing core DNAs and UIs, it is helpful to not have to package and ship your artifacts with every change. For fast iteration, just go to your `./src/config/.envoy-deps` directory and replace the DNA or UI directory with a symlink to the corresponding local file or directory on your filesystem, and envoy will use that instead *after a fresh reset of Envoy* (`npm run init`).

### Key generation

To enable Envoy to generate the initial Conductor configuration including host keys, you need to create some keys and let Envoy know about them. As a temporary step, please use the following script to generate keys:

	npm run keygen

This calls `hc keygen` under the hood, and also produces a special file that helps Envoy locate the key later, at `src/config/envoy-host-key.json`. If you want to use Envoy with an existing keypair, please see the section on **Using existing keypairs** below

### Config generation

Finally, to create the initial Conductor configuration needed by Envoy, run this handy script:

	npm run init

These steps only need to be run once. However, you may run this script as often as you like to start with a fresh Conductor state. The script will also completely wipe out the conductor storage from previous Envoy setups, so this is an important step to ensure stale data is not hanging around.

## Running tests

Run the whole test suite with:

    npm test

### Unit tests:

To run only unit tests:

    npm run test:unit

Or with full output, including colors (useful for diagnosing test failures):

    npm run test:unit:raw

### Integration tests:

Integration tests use the real holochain stack to run. You'll need to have `holochain` and `hc` installed and on your PATH. To run, just:

    npm run test:integration

The storage for each test will be run in a new dynamically generated temp directory. Also, a keybundle just for testing will be created the first time you run this script, and from that point on the same keybundle will be used for subsequent tests.

## Usage

To start a conductor using the config generated by `init`, a convenience script is included:

	npm run conductor

It's not necessary to run this script to start the conductor. As long as a properly configured conductor is running, using a config similar to one generated by `npm run init`, Envoy will connect to it and it will Just Work.

Finally, to run the Envoy itself, you can run:

	npm run start

Upon which it will immediately connect to the Conductor at the admin websocket interface specified in the Conductor config, and run its own servers for incoming connections and requests.

If the Conductor interfaces go down, Envoy will shut down its servers as well, but the process will remain running. It will monitor the Conductor interfaces, and when they are back online, it will restart its own servers. So, the Envoy can remain running even when starting and stopping the Conductor.

## Simulating the Holo Hosting App

*TODO: reinstate the helpful `cmd` script for automating setup tasks*

## More info

See https://hackmd.io/5xL7XKp5Srm_Ez5_eTxAOQ for latest design considerations. See also https://hackmd.io/cvXMlcffThSpN-C5WrfGzg for an earlier design doc with the broader picture but possibly outdated details.

## Using existing keypairs

In the setup, you were instructed to use `npm run keygen`. The only special thing about that script is the special file that it creates, letting Envoy know where to find the keybundle, and also what the agent's address is, since there is currently no tool that lets you pull decrypted information out of a keybundle.

To use an existing keybundle, you can create this file yourself. It's a simple JSON file with two fields, "publicAddress" and "keyFile". It must live at `src/config/envoy-host-key.json`.

Example:

	$ cat src/config/envoy-host-key.json

should produce something like the following contents:

	{
	    "publicAddress": "HcSciov95SKY7uxomk9DwbFgZhK93rfjbFe6Xgwffz8j3cxbFc4JkPKKSmx7odr",
	    "keyFile": "/home/me/.config/holochain/keys/HcSciov95SKY7uxomk9DwbFgZhK93rfjbFe6Xgwffz8j3cxbFc4JkPKKSmx7odr"
	}
