MODE ?= debug

BUILD_DIR := target

TOOL_DIR := $(BUILD_DIR)/tool

DEBUG_DIR := $(BUILD_DIR)/debug
RELEASE_DIR := $(BUILD_DIR)/release

CODEGEN_BUILD_DIR := $(TOOL_DIR)/codgen

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

CODEGEN_BIN_NAMES := partial-render
CODEGEN_BINS := $(addprefix $(CODEGEN_BUILD_DIR)/, $(CODEGEN_BIN_NAMES))

all: $(CODEGEN_BINS) hugo $(APP_BINS)

hugo: $(HUGO_BUILD_DIR)
	go tool hugo -d $<

$(APP_BUILD_DIR)/%: $(APP_BUILD_DIR) $(APP_SRCS)
	go build -o $@ $(patsubst $(APP_BUILD_DIR)/%,cmd/%/main.go,$@)

$(CODEGEN_BUILD_DIR)/%: $(CODEGEN_BUILD_DIR) $(APP_SRCS)
	go build -o $@ $(patsubst $(CODEGEN_BUILD_DIR)/%,codegen/cmd/%/main.go,$@)

$(CODEGEN_BUILD_DIR):
	mkdir -p $@

$(HUGO_BUILD_DIR):
	mkdir -p $@

$(APP_BUILD_DIR):
	mkdir -p $@

clean:
	rm -rf $(BUILD_DIR)

.PHONY: all clean hugo
