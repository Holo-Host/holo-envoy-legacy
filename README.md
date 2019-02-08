# Holo server

The Holo server is a web server running in its own process which drives a Conductor through a Websocket interface. A remote browser UI talks to the Holo server over its own Websocket connection.

```
   UI <====> Holo server <====> Conductor
       (ws)               (ws)
```

## JSON-RPC Websocket API

The server accepts websocket connections from the browser, and communicates with a running Holochain Conductor over a separate websocket interface. Messages are in JSON-RPC format, and the methods accepted are listed below.

Note that the `Token` just contains the agent's public key, along with a signature of (the hash of) the request. This is used to identify the agent as well as prove authorship of this request. (TODO: This may not be the best way, open to better ideas for how to do this. It may not be necessary to include a signature.)

### `call`

Make a zome function call

```typescript
{
	token: Token,
	happId: Address,
	dna: Address,
	function: "{zome-name}/{fn-name}",
	params: Any,
}
```

Similar to `call` for the conductor, but instead of only specifying an instance ID, the call instead specifies a hApp ID and a DNA hash. By also passing the capability token, the server can identify the agent, and together with the hApp ID and DNA hash can determine which instance to dispatch this call to.

### `agent/host-me`

Request to be Holo-hosted on this hApp. Generates a source chain for all necessary DNAs.

```typescript
{
	token: Token,
	happId: Address,
}
```

## Temporary client behavior

Until we have a light client running in the browser, Holo needs to loop the client into the workflow for committing entries. Specifically, the Conductor needs to block its workflow and ask the client to sign something via the Holo server, then accept that signature and continue the workflow.

Therefore, both the Holo server and the client itself need to implement a sort of RPC server functionality, so that:

- the Conductor can make a RPC to the Holo server
- the Holo server can make its own RPC to the browser

This is some of the only special Holo-related stuff that the Conductor needs to know about

The Conductor also needs to know about the separation of signing and network keys, but that is a use-case for Holochain in general, particularly around light clients.