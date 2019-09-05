const path				= require('path');
const log				= require('@whi/stdlog')(path.basename( __filename ), {
    level: process.env.DEBUG_LEVEL || 'fatal',
});

const assert				= require('assert');
const expect				= require('chai').expect;

const envoy_handler			= require('../../lib/flows/zome-call.js').default;
const { zomeCallByInstance }		= require('../../lib/common.js');
const config				= require('../../lib/config/index.js');

const RPCMockClient			= {
    call: null,
}

describe("Calling zomes", () => {
    
    it("should use the websocket client to make a zome call", async () => {

	RPCMockClient.call = async function ( method, payload ) {
	    let keys			= Object.keys( payload );
	    expect( keys ).to.deep.equal([ "instance_id", "zome", "function", "args" ] );

	    return { "Ok": "some_hash" };
	};

	const data			= await zomeCallByInstance( RPCMockClient, {
	    "instance_id":	"some_instance",
	    "zome":		"zome_name",
	    "function":		"function_name",
	    "args":		{},
	});
	
	expect( data ).to.equal("some_hash");
    });

    
    it("should convert envoy call to zome call", async () => {
	
	const Mock_master_client	= {
	    call: async function ( method, payload ) {
		if ( method === "info/instances" ) {
		    return [
			{
			    "id": "zome_instance",
			    "dna": "some_dna",
			    "agent": config.hostAgentName,
			}
		    ];
		}
		else {
		    return { "Ok": "master" };
		}
	    },
	}
	const Mock_public_client	= {
	    call: async function ( method, payload ) {
		return { "Ok": "public" };
	    },
	}
	const Mock_intern_client	= {
	    call: async function ( method, payload ) {
		return { "Ok": "intern" };
	    },
	}

	const happ_call		= envoy_handler( Mock_master_client,
						 Mock_public_client,
						 Mock_intern_client );
	
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
