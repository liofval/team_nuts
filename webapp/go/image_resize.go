package main

import (
	"bytes"
	"fmt"
	"image"
	"image/gif"
	"image/jpeg"
	"image/png"
	"io"

	"golang.org/x/image/draw"
)

const maxLongSide = 600

// resizeImage は長辺が maxLongSide を超える画像をリサイズする。
// リサイズ不要な場合は nil を返す。
func resizeImage(r io.Reader, mimeType string) ([]byte, error) {
	img, _, err := image.Decode(r)
	if err != nil {
		return nil, fmt.Errorf("failed to decode image: %w", err)
	}

	bounds := img.Bounds()
	w := bounds.Dx()
	h := bounds.Dy()

	longSide := w
	if h > w {
		longSide = h
	}

	if longSide <= maxLongSide {
		return nil, nil // リサイズ不要
	}

	var newW, newH int
	if w >= h {
		newW = maxLongSide
		newH = h * maxLongSide / w
	} else {
		newH = maxLongSide
		newW = w * maxLongSide / h
	}

	dst := image.NewRGBA(image.Rect(0, 0, newW, newH))
	draw.CatmullRom.Scale(dst, dst.Bounds(), img, bounds, draw.Over, nil)

	var buf bytes.Buffer
	switch mimeType {
	case "image/jpeg":
		err = jpeg.Encode(&buf, dst, &jpeg.Options{Quality: 85})
	case "image/png":
		err = png.Encode(&buf, dst)
	case "image/gif":
		err = gif.Encode(&buf, dst, nil)
	default:
		return nil, fmt.Errorf("unsupported mime type: %s", mimeType)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to encode resized image: %w", err)
	}

	return buf.Bytes(), nil
}
