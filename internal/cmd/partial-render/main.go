package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"text/template"
)

func loadJson(path string) (any, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}

	buff := &bytes.Buffer{}

	if n, err := io.Copy(buff, file); n == 0 || err != nil {
		if n == 0 {
			return nil, errors.New("read 0 bytes from data file")
		}
		return nil, err
	}

	var loaded any

	if err := json.Unmarshal(buff.Bytes(), &loaded); err != nil {
		return nil, err
	}

	return loaded, nil
}

func loadTemplate(path string) (*template.Template, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}

	buff := &bytes.Buffer{}

	if n, err := io.Copy(buff, file); n == 0 || err != nil {
		if n == 0 {
			return nil, errors.New("read 0 bytes from data file")
		}
		return nil, err
	}

	text := buff.String()
	if text == "<nil>" {
		return nil, errors.New("invalid text in data file")
	}

	return template.New("template").Parse(text)
}

func main() {
	fs := flag.NewFlagSet("partial-render", flag.ContinueOnError)

	var dataPathArg string
	var templatePathArg string

	fs.StringVar(&dataPathArg, "data", "", "path to the data file")
	fs.StringVar(&templatePathArg, "template", "", "path to the template")

	fs.Usage = func() {
		fmt.Fprintf(flag.CommandLine.Output(), "partial-render - A tool for rendering runtime templates for Hugo\n\n")
		fmt.Fprintln(flag.CommandLine.Output(), "Usage of partial-render:")
		fs.PrintDefaults()
	}

	if err := fs.Parse(os.Args[1:]); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			os.Exit(0)
		}

		fmt.Fprintf(os.Stderr, "error: %s\n", err)
		os.Exit(1)
	}

	if len(dataPathArg) == 0 {
		fmt.Fprintln(os.Stderr, "error: -data must be passed")
		os.Exit(1)
	}

	if len(templatePathArg) == 0 {
		fmt.Fprintln(os.Stderr, "error: -template must be passed")
		os.Exit(1)
	}

	data, err := loadJson(dataPathArg)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %s", err)
		os.Exit(1)
	}

	template, err := loadTemplate(templatePathArg)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %s", err)
		os.Exit(1)
	}

	if err := template.Execute(os.Stdout, data); err != nil {
		fmt.Fprintf(os.Stderr, "error: %s", err)
		os.Exit(1)
	}
}
