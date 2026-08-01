OPENAPI_FILES := $(wildcard *.openapi.yaml)

LINT_OPENAPI_FILES := $(addprefix lint., $(OPENAPI_FILES))

PRETTIER := npx prettier
VACUUM := go tool vacuum

all: $(LINT_OPENAPI_FILES)

fmt:
	$(PRETTIER) -w *.yaml

lint.%.openapi.yaml:
	$(VACUUM) \
		lint \
		--all-results \
		--no-clip \
		--details \
		--fail-severity hint \
		--no-style \
		--silent \
		--show-rules \
		--ruleset $(patsubst lint.%.openapi.yaml, %.ruleset.yaml, $@) \
		--ignore-file $(patsubst lint.%.openapi.yaml, %.ignore.yaml, $@) \
		$(@:lint.%=%)
	$(PRETTIER) -c $(@:lint.%=%)

.PHONY: all fmt
