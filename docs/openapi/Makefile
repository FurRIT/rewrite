OPENAPI_FILES := $(wildcard *.openapi.yaml)

LINT_OPENAPI_FILES := $(addprefix lint., $(OPENAPI_FILES))

all: $(LINT_OPENAPI_FILES)

fmt:
	prettier -w *.yaml

lint.%.openapi.yaml:
	vacuum \
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
	prettier -c $(@:lint.%=%)

.PHONY: all fmt
