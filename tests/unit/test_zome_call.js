const path				= require('path');
const log				= require('@whi/stdlog')(path.basename( __filename ), {
    level: process.env.DEBUG_LEVEL || 'fatal',
});

const assert				= require('assert');
const expect				= require('chai').expect;

const envoy_handler			= require('../../lib/flows/zome-call.js').default;
const { zomeCallByInstance }		= require('../../lib/common.js');
const config				= require('../../lib/config/index.js');

const MockClient			= require('../mock_clients.js');
const default_resp			= MockClient.__default__;


describe("Calling zomes", () => {

    /*
     * This test prooves that...
     *
     * the expected `zomeCallByInstance` input results in the expected call to Conductor.
     */
    it("should use the websocket client to make a zome call", async () => {
	const request_package		= {
	    "instance_id":	"some_instance",
	    "zome":		"zome_name",
	    "function":		"function_name",
	    "args":		{},
	};

	const client			= new MockClient({
	    [ default_resp ]: {
		"Ok": "some_hash",
	    },
	});
	
	client.intercept( async function ( _, payload ) {
	    expect( Object.keys(   payload ) ).to.deep.equal( Object.keys(   request_package ) );
	    expect( Object.values( payload ) ).to.deep.equal( Object.values( request_package ) );
	});

	const data			= await zomeCallByInstance( client, {
	    "instanceId":	"some_instance",
	    "zomeName":		"zome_name",
	    "funcName":		"function_name",
	    "args":		{},
	});
	
	expect( data ).to.equal("some_hash");
    });

    
    /*
     * This test prooves that...
     *
     * the data coming from the Web Client results in the expected call to Conductor.
     */
    it("should convert envoy call to zome call", async () => {

	// Envoy will use the master client to inspect some administrative things.
	const master_client		= new MockClient({
	    [ default_resp ]: {
		"Ok": "master",
	    },
	    // Envoy will check if this host has an instance for the requests Agent/DNA
	    "info/instances": [
		{
		    "id": "some_instance",
		    "dna": "some_dna",
		    "agent": "some_agent",
		}
	    ]
	});

	// The 'internal' client is used for service logger requests.  Since this is obviously an
	// incorrect response and we still pass, we can deduce that Envoy does not currently inspect
	// or use the response.
	const intern_client		= new MockClient({
	    [ default_resp ]: {
		"Ok": "intern",
	    },
	});
	
	// If we get this far, and we get this response, consider it a pass.  This is confirmation
	// that the call to Envoy resulted in a zome call to conductor.
	const public_client		= new MockClient({
	    [ default_resp ]: {
		"Ok": "public",
	    },
	});

	public_client.intercept( async function ( method, payload ) {
	    const keys			= Object.keys(   payload ).sort();
	    const values		= Object.values( payload ).sort();
	    
	    expect( method ).to.equal('call');
	    expect( keys   ).to.deep.equal([ 'args', 'function', 'instance_id', 'zome' ]);
	    expect( values ).to.deep.equal([ {}, "function_name", "some_instance", "zome_name"]);
	});
	
	const happ_call			= envoy_handler( master_client,
							 public_client,
							 intern_client );
	
	const data			= await happ_call({
	    "agentId":		"some_agent",
	    "happId":		"some_happ_id",
	    "instanceId":	"some_dna",		// 'instanceId' is wrong in Envoy, should be renamed to 'dnaId'
	    "zome":		"zome_name",
	    "function":		"function_name",
	    "args":		{},
	});
	
	expect( data ).to.equal("public");
    });

});
