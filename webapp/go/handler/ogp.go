package handler

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"

	"golang.org/x/net/html"
)

// OgpData はOGPメタデータのデータ構造
type OgpData struct {
	URL         string `json:"url"`
	Title       string `json:"title"`
	Description string `json:"description"`
	ImageURL    string `json:"imageUrl"`
}

var httpClient = &http.Client{
	Transport: &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	},
}

// OgpHandler はOGPメタデータを取得するハンドラー
// GET /ogp
func OgpHandler(w http.ResponseWriter, r *http.Request) {
	targetURL := r.URL.Query().Get("url")
	if targetURL == "" {
		http.Error(w, "url parameter is required", http.StatusBadRequest)
		return
	}

	parsedURL, err := url.ParseRequestURI(targetURL)
	if err != nil || (parsedURL.Scheme != "http" && parsedURL.Scheme != "https") {
		http.Error(w, "invalid url", http.StatusBadRequest)
		return
	}

	resp, err := httpClient.Get(targetURL)
	if err != nil {
		log.Printf("OgpHandler: fetch error url=%s err=%v", targetURL, err)
		http.Error(w, fmt.Sprintf("fetch error: %v", err), http.StatusBadGateway)
		return
	}
	if resp.StatusCode != http.StatusOK {
		http.Error(w, fmt.Sprintf("status error: %d", resp.StatusCode), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 2<<20)) // 最大2MBを読み込む
	if err != nil {
		log.Printf("OgpHandler: failed to read response body url=%s err=%v", targetURL, err)
		http.Error(w, "failed to read response", http.StatusInternalServerError)
		return
	}

	ogp := parseOgp(targetURL, string(body))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ogp)
}

func parseOgp(targetURL, body string) OgpData {
	ogp := OgpData{URL: targetURL}

	tokenizer := html.NewTokenizer(strings.NewReader(body))
	for {
		tt := tokenizer.Next()
		if tt == html.ErrorToken {
			break
		}
		if tt != html.StartTagToken && tt != html.SelfClosingTagToken {
			continue
		}

		token := tokenizer.Token()
		if token.Data != "meta" {
			continue
		}

		var property, content string
		for _, attr := range token.Attr {
			switch attr.Key {
			case "property", "name":
				property = attr.Val
			case "content":
				content = attr.Val
			}
		}

		switch property {
		case "og:title":
			ogp.Title = content
		case "og:description":
			ogp.Description = content
		case "og:image":
			ogp.ImageURL = content
		}
	}

	return ogp
}
