GO_BUILD_DIR := build/go
HUGO_BUILD_DIR := build/hugo
CODEGEN_BUILD_DIR := build/codegen

GO_SRCS := $(shell find . -name '*.go')

GO_BIN_NAMES := furrit-server
GO_BINS := $(addprefix $(GO_BUILD_DIR)/, $(GO_BIN_NAMES))

CODEGEN_BIN_NAMES := partial-render
CODEGEN_BINS := $(addprefix $(CODEGEN_BUILD_DIR)/, $(CODEGEN_BIN_NAMES))

all: $(CODEGEN_BINS) hugo $(GO_BINS)

hugo: $(HUGO_BUILD_DIR)
	go tool hugo

$(GO_BUILD_DIR)/%: $(GO_BUILD_DIR) $(GO_SRCS)
	go build -o $@ $(patsubst $(GO_BUILD_DIR)/%,cmd/%/main.go,$@)

$(CODEGEN_BUILD_DIR)/%: $(CODEGEN_BUILD_DIR) $(GO_SRCS)
	go build -o $@ $(patsubst $(CODEGEN_BUILD_DIR)/%,codegen/cmd/%/main.go,$@)

$(HUGO_BUILD_DIR):
	mkdir -p $@

$(GO_BUILD_DIR):
	mkdir -p $@

$(CODEGEN_BUILD_DIR):
	mkdir -p $@

clean:
	rm -rf $(CODEGEN_BUILD_DIR) $(HUGO_BUILD_DIR) $(GO_BUILD_DIR)

.PHONY: all clean hugo
