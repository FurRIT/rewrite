MODE ?= debug

BUILD_DIR := target

DEBUG_DIR := $(BUILD_DIR)/debug
RELEASE_DIR := $(BUILD_DIR)/release

TOOL_DIR := $(BUILD_DIR)/tool

ifeq ($(MODE),debug)
	APP_BUILD_DIR = $(DEBUG_DIR)/furrit
	HUGO_BUILD_DIR = $(DEBUG_DIR)/hugo
else
	APP_BUILD_DIR = $(RELEASE_DIR)/furrit
	HUGO_BUILD_DIR = $(RELEASE_DIR)/hugo
endif

GO_SRCS := $(shell find . -name '*.go')

APP_BIN_NAMES := furrit-server
APP_BINS := $(addprefix $(APP_BUILD_DIR)/, $(GO_BIN_NAMES))

TOOL_BIN_NAMES := partial-render
TOOL_BINS := $(addprefix $(TOOL_DIR)/, $(TOOL_BIN_NAMES))

all: $(TOOL_BINS) hugo $(APP_BINS)

hugo: $(HUGO_BUILD_DIR)
	go tool hugo -d $<

$(APP_BUILD_DIR)/%: $(APP_BUILD_DIR) $(GO_SRCS)
	go build -o $@ $(patsubst $(APP_BUILD_DIR)/%,cmd/%/main.go,$@)

$(TOOL_DIR)/%: $(TOOL_DIR) $(GO_SRCS)
	go build -o $@ $(patsubst $(TOOL_DIR)/%,internal/cmd/%/main.go,$@)

$(TOOL_DIR):
	mkdir -p $@

$(HUGO_BUILD_DIR):
	mkdir -p $@

$(APP_BUILD_DIR):
	mkdir -p $@

clean:
	rm -rf $(BUILD_DIR)

.PHONY: all hugo clean
