GO_BUILD_DIR := build/go
HUGO_BUILD_DIR := build/hugo

GO_SRCS := $(shell find . -name '*.go')

GO_BIN_NAMES := furrit-server
GO_BINS := $(addprefix $(GO_BUILD_DIR)/, $(GO_BIN_NAMES))

all: hugo $(GO_BINS)

hugo: $(HUGO_BUILD_DIR)
	go tool hugo

$(GO_BUILD_DIR)/%: $(GO_BUILD_DIR)
	go build -o $@ $(patsubst $(GO_BUILD_DIR)/%,cmd/%/main.go,$@)

$(HUGO_BUILD_DIR):
	mkdir -p $@

$(GO_BUILD_DIR):
	mkdir -p $@

clean:
	rm -rf $(HUGO_BUILD_DIR) $(GO_BUILD_DIR)

.PHONY: all clean hugo
