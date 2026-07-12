MODE ?= debug

BUILD_DIR := target

DEBUG_DIR := $(BUILD_DIR)/debug
RELEASE_DIR := $(BUILD_DIR)/release

TOOL_DIR := $(BUILD_DIR)/tool

HUGO_GO_BIN_FLAGS = -e production

ifeq ($(MODE),debug)
	DEBUG = 1

	APP_BUILD_DIR = $(DEBUG_DIR)/furrit
	HUGO_BUILD_DIR = $(DEBUG_DIR)/hugo

	DEBUG_PARTIAL_BUILD_DIR = $(DEBUG_DIR)/mock
else
	RELEASE = 1

	APP_BUILD_DIR = $(RELEASE_DIR)/furrit
	HUGO_BUILD_DIR = $(RELEASE_DIR)/hugo
endif

GO_SRCS := $(shell find . -name '*.go')

APP_BIN_NAMES := furrit-server
APP_BINS := $(addprefix $(APP_BUILD_DIR)/, $(GO_BIN_NAMES))

TOOL_BIN_NAMES := partial-render fetch-google-fonts
TOOL_BINS := $(addprefix $(TOOL_DIR)/, $(TOOL_BIN_NAMES))

PARTIAL_NAMES := admins sysadmins csrf

DEBUG_PARTIALS := $(addprefix $(DEBUG_PARTIAL_BUILD_DIR)/,$(addsuffix .html, $(PARTIAL_NAMES)))

all: $(TOOL_BINS) frontend $(APP_BINS)

frontend: $(HUGO_BUILD_DIR) $(if $(DEBUG),$(DEBUG_PARTIALS),)
	go tool hugo -d $< $(HUGO_GO_BIN_FLAGS)

$(DEBUG_PARTIAL_BUILD_DIR)/%.html: $(DEBUG_PARTIAL_BUILD_DIR) partials/%/data.json partials/%/template.html
	$(TOOL_DIR)/partial-render -data $(word 2,$^) -template $(word 3,$^) > $@

$(APP_BUILD_DIR)/%: $(APP_BUILD_DIR) $(GO_SRCS)
	go build -o $@ $(patsubst $(APP_BUILD_DIR)/%,cmd/%/main.go,$@)

$(TOOL_DIR)/%: $(TOOL_DIR) $(GO_SRCS)
	go build -o $@ $(patsubst $(TOOL_DIR)/%,internal/cmd/%/main.go,$@)

$(TOOL_DIR):
	mkdir -p $@

$(DEBUG_PARTIAL_BUILD_DIR):
	mkdir -p $@

$(HUGO_BUILD_DIR):
	mkdir -p $@

$(APP_BUILD_DIR):
	mkdir -p $@

clean:
	rm -rf $(BUILD_DIR)

.PHONY: all frontend clean
