package docx

import (
	"archive/zip"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

func extractImages(reader *zip.Reader, rels map[string]string, uploadsDir string) (map[string]string, error) {
	imageURLs := make(map[string]string) // relID -> URL

	if err := os.MkdirAll(uploadsDir, 0755); err != nil {
		return nil, err
	}

	for relID, target := range rels {
		// 画像ファイルのパスを解決
		var imgPath string
		if strings.HasPrefix(target, "/") {
			imgPath = target[1:]
		} else {
			imgPath = "word/" + target
		}

		// 画像MIMEタイプの判定
		ext := strings.ToLower(filepath.Ext(imgPath))
		if ext != ".png" && ext != ".jpg" && ext != ".jpeg" && ext != ".gif" {
			continue
		}

		// ZIPから画像を取得
		var imgFile *zip.File
		for _, f := range reader.File {
			if f.Name == imgPath {
				imgFile = f
				break
			}
		}
		if imgFile == nil {
			continue
		}

		rc, err := imgFile.Open()
		if err != nil {
			continue
		}
		imgData, err := io.ReadAll(rc)
		rc.Close()
		if err != nil {
			continue
		}

		// ランダムなファイル名で保存
		randBytes := make([]byte, 16)
		if _, err := rand.Read(randBytes); err != nil {
			continue
		}
		filename := fmt.Sprintf("docx_%s%s", hex.EncodeToString(randBytes), ext)
		dstPath := filepath.Join(uploadsDir, filename)

		if err := os.WriteFile(dstPath, imgData, 0644); err != nil {
			continue
		}

		imageURLs[relID] = fmt.Sprintf("/uploads/%s", filename)
	}

	return imageURLs, nil
}
