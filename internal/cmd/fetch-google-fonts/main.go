package main

import (
	"errors"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"path"
	"strconv"
	"strings"

	"github.com/tdewolff/parse/v2"
	"github.com/tdewolff/parse/v2/css"
)

type NextToken = func() (css.TokenType, []byte)

type FontFace struct {
	Family string
	Style  string
	Weight uint
	SrcUrl string
}

var NoFontFace = errors.New("did not match @font-face")

// Get a single @\font-face file.
func parseFontFace(next NextToken) (*FontFace, error) {
	matchTypeOrError := func(tokenType css.TokenType) (*string, error) {
		nextTokenType, nextBytes := next()

		if nextTokenType != tokenType {
			return nil, fmt.Errorf("token %v did not match type %v", nextTokenType, tokenType)
		}

		nextString := string(nextBytes)
		return &nextString, nil
	}

	matchTypeTextOrError := func(tokenType css.TokenType, text string) error {
		nextTokenType, nextBytes := next()

		if nextTokenType != tokenType {
			return fmt.Errorf("token %v did not match type %v", nextTokenType, tokenType)
		}

		nextText := string(nextBytes)
		if nextText != text {
			return errors.New("token did not match text")
		}

		return nil
	}

	matchDeclOrError := func(propertyIdentifier string, valueTokenType css.TokenType) (*string, error) {
		if err := matchTypeTextOrError(css.IdentToken, propertyIdentifier); err != nil {
			return nil, err
		}

		if _, err := matchTypeOrError(css.ColonToken); err != nil {
			return nil, err
		}

		valueString, err := matchTypeOrError(valueTokenType)
		if err != nil {
			return nil, err
		}

		if _, err := matchTypeOrError(css.SemicolonToken); err != nil {
			return nil, err
		}

		return valueString, nil
	}

	if err := matchTypeTextOrError(css.AtKeywordToken, "@font-face"); err != nil {
		return nil, NoFontFace
	}

	if _, err := matchTypeOrError(css.LeftBraceToken); err != nil {
		return nil, err
	}

	fontFamilyString, err := matchDeclOrError("font-family", css.StringToken)
	if err != nil {
		return nil, err
	}

	if (*fontFamilyString)[0] != '\'' || (*fontFamilyString)[len(*fontFamilyString)-1] != '\'' {
		return nil, errors.New("font-family string not delimited correctly")
	}
	fontFamily := (*fontFamilyString)[1 : len(*fontFamilyString)-1]

	fontStyleIdentRef, err := matchDeclOrError("font-style", css.IdentToken)
	if err != nil {
		return nil, err
	}

	fontWeightString, err := matchDeclOrError("font-weight", css.NumberToken)
	if err != nil {
		return nil, err
	}

	fontWeight, err := strconv.Atoi(*fontWeightString)
	if err != nil {
		return nil, err
	}

	if err := matchTypeTextOrError(css.IdentToken, "src"); err != nil {
		return nil, err
	}

	if _, err := matchTypeOrError(css.ColonToken); err != nil {
		return nil, err
	}

	urlTokenStringRawRef, err := matchTypeOrError(css.URLToken)
	if err != nil {
		return nil, err
	}

	urlString := strings.Replace(strings.Replace(*urlTokenStringRawRef, "url(", "", 1), ")", "", 1)

	if err := matchTypeTextOrError(css.FunctionToken, "format("); err != nil {
		return nil, err
	}

	if err := matchTypeTextOrError(css.StringToken, "'truetype'"); err != nil {
		return nil, err
	}

	if _, err := matchTypeOrError(css.RightParenthesisToken); err != nil {
		return nil, err
	}

	if _, err := matchTypeOrError(css.SemicolonToken); err != nil {
		return nil, err
	}

	if _, err := matchTypeOrError(css.RightBraceToken); err != nil {
		return nil, err
	}

	fontStyle := strings.Clone(*fontStyleIdentRef)
	return &FontFace{Family: fontFamily, Style: fontStyle, Weight: uint(fontWeight), SrcUrl: urlString}, nil
}

func parseFontFaces(lexer *css.Lexer) ([]FontFace, error) {
	nextNonWhitespace := func() (css.TokenType, []byte) {
		for {
			tt, tb := lexer.Next()

			if tt == css.WhitespaceToken {
				continue
			}

			return tt, tb
		}
	}

	fonts := make([]FontFace, 0)

	for {
		font, err := parseFontFace(nextNonWhitespace)

		if err == nil {
			fonts = append(fonts, *font)
			continue
		}

		if errors.Is(err, NoFontFace) {
			break
		}
		return nil, err
	}

	return fonts, nil
}

func fetchFontFaceTTF(fontFace FontFace, target string) error {
	resp, err := http.Get(fontFace.SrcUrl)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("bad status: %s", resp.Status)
	}

	out, err := os.Create(target)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, resp.Body)
	return err
}

func fontFaceToCssEntry(w io.Writer, fontFace FontFace, path string) {
	fmt.Fprintf(w, "@font-face {\n")
	fmt.Fprintf(w, "  font-family: '%s';\n", fontFace.Family)
	fmt.Fprintf(w, "  font-style: %s;\n", fontFace.Style)
	fmt.Fprintf(w, "  font-weight: %d;\n", fontFace.Weight)
	fmt.Fprintf(w, "  src: url(%s) format(\"truetype\");\n", path)
	fmt.Fprintf(w, "}\n\n")
}

func main() {
	fs := flag.NewFlagSet("fetch-google-fonts", flag.ContinueOnError)

	var urlArg string
	var outArg string
	var prefixArg string

	fs.StringVar(&urlArg, "url", "", "the google fonts url")
	fs.StringVar(&outArg, "out", "", "the font download directory")
	fs.StringVar(&prefixArg, "prefix", "/fonts/", "the new font url")

	fs.Usage = func() {
		fmt.Fprintf(flag.CommandLine.Output(), "fetch-google-fonts - A tool for fetching google fonts from a URL\n\n")
		fmt.Fprintln(flag.CommandLine.Output(), "Usage of fetch-google-fonts:")
		fs.PrintDefaults()
	}

	if err := fs.Parse(os.Args[1:]); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			os.Exit(0)
		}

		fmt.Fprintf(os.Stderr, "error: %s\n", err)
		os.Exit(1)
	}

	if len(urlArg) == 0 {
		fmt.Fprintln(os.Stderr, "error: -url must be defined")
		os.Exit(1)
	}

	if len(outArg) == 0 {
		fmt.Fprintln(os.Stderr, "error: -out must be passed")
		os.Exit(1)
	}

	resp, err := http.Get(urlArg)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %s\n", err)
		os.Exit(1)
	}

	lexer := css.NewLexer(parse.NewInput(resp.Body))
	fontFaces, err := parseFontFaces(lexer)

	if err != nil {
		fmt.Fprintf(os.Stderr, "error: during font parsing: %s\n", err)
		os.Exit(1)
	}

	for _, fontFace := range fontFaces {
		fileName := fmt.Sprintf("%s-%s-%d.ttf", fontFace.Family, fontFace.Style, fontFace.Weight)
		localPath := path.Join(outArg, fileName)

		mountPath := path.Join(prefixArg, fileName)

		if err := fetchFontFaceTTF(fontFace, localPath); err != nil {
			fmt.Fprintf(os.Stderr, "error: during font download: %s\n", err)
			os.Exit(1)
		}

		fontFaceToCssEntry(os.Stdout, fontFace, mountPath)
	}
}
