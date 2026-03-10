package docx

import (
	"archive/zip"
	"encoding/xml"
	"io"
)

type relationship struct {
	ID     string `xml:"Id,attr"`
	Target string `xml:"Target,attr"`
}

type relationships struct {
	Rels []relationship `xml:"Relationship"`
}

func parseRelationships(reader *zip.Reader) map[string]string {
	result := make(map[string]string)
	for _, f := range reader.File {
		if f.Name == "word/_rels/document.xml.rels" {
			rc, err := f.Open()
			if err != nil {
				continue
			}
			data, err := io.ReadAll(rc)
			rc.Close()
			if err != nil {
				continue
			}
			var rels relationships
			if err := xml.Unmarshal(data, &rels); err != nil {
				continue
			}
			for _, rel := range rels.Rels {
				result[rel.ID] = rel.Target
			}
		}
	}
	return result
}
