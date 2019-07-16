.DEFAULT_GOAL := help
.PHONY: help FORCE
help:
	@printf "Makefile (%s)\n" $$(pwd)
	@echo ""
	@echo "  usage: make <target> [<target>, ...]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_/.-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-30s\033[0m %s\n", $$1, $$2}'
	@echo ""

CONFIG		= ./config.json

ENVOY_HOME	= $(shell jq -r '.defaultEnvoyHome' $(CONFIG))
CHAIN_STORE	= $(ENVOY_HOME)/$(shell jq -r '.chainStorageDir' $(CONFIG) )
UI_STORE	= $(ENVOY_HOME)/$(shell jq -r '.defaultEnvoyHome' $(CONFIG) )
HC_CONFIG	= $(ENVOY_HOME)/$(shell jq -r '.conductorConfigFile' $(CONFIG) )

print:
	@echo $(ENVOY_HOME)
	@echo $(CHAIN_STORE)
	@echo $(UI_STORE)
	@echo $(HC_CONFIG)

conductor-init:	conductor-clean	$(CHAIN_STORE) $(UI_STORE) $(HC_CONFIG) ## Create conductor config TOML

# Must used "bash -c ..." for tilde expansion to work
conductor-clean:
	@while true; do read -p "Do you wish to rm -r $(CHAIN_STORE)? " yn;		\
	    case $$yn in [Yy]* )							\
		bash -c "rm -r $(CHAIN_STORE)"; break;;					\
	[Nn]* ) exit;; * ) echo "Please answer yes or no.";;esac;done;
	@while true; do read -p "Do you wish to rm -r $(UI_STORE)? " yn;		\
	    case $$yn in [Yy]* )							\
		bash -c "rm -r $(UI_STORE)"; break;;					\
	[Nn]* ) exit;; * ) echo "Please answer yes or no.";;esac;done;

$(ENVOY_HOME):
	mkdir -p $@
$(CHAIN_STORE):
	mkdir -p $@
$(UI_STORE):
	mkdir -p $@
$(HC_CONFIG):
	npm run build-conductor-config

nix-shell:						## Start a pure holonix-shell
	nix-shell ../holochain-rust/

list-files:						## List specific project files
	ls -l
	find src/ test/ -not -path '*.envoy*'
list-files-exclusive:					## List all files excluding (node_modules .git .envoy-deps /lib)
	find . -not -path './node_modules*'			\
		-and -not -path './.git*'			\
		-and -not -path './src/config/.envoy-deps/*'	\
		-and -not -path './lib/*'
