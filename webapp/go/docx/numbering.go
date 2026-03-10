package docx

import (
	"archive/zip"
	"encoding/xml"
	"io"
)

type numInfo struct {
	// numID -> abstractNumID
	numToAbstract map[string]string
	// abstractNumID -> numFmt ("bullet" or "decimal" etc.)
	abstractFmt map[string]string
}

func parseNumbering(reader *zip.Reader) *numInfo {
	info := &numInfo{
		numToAbstract: make(map[string]string),
		abstractFmt:   make(map[string]string),
	}

	for _, f := range reader.File {
		if f.Name == "word/numbering.xml" {
			rc, err := f.Open()
			if err != nil {
				return info
			}
			data, err := io.ReadAll(rc)
			rc.Close()
			if err != nil {
				return info
			}

			// Simple XML structure parsing
			type lvl struct {
				Ilvl   string `xml:"ilvl,attr"`
				NumFmt struct {
					Val string `xml:"val,attr"`
				} `xml:"numFmt"`
			}
			type abstractNum struct {
				AbstractNumID string `xml:"abstractNumId,attr"`
				Lvls          []lvl  `xml:"lvl"`
			}
			type num struct {
				NumID          string `xml:"numId,attr"`
				AbstractNumRef struct {
					Val string `xml:"val,attr"`
				} `xml:"abstractNumIdRef"`
			}
			type numbering struct {
				AbstractNums []abstractNum `xml:"abstractNum"`
				Nums         []num         `xml:"num"`
			}

			var n numbering
			if err := xml.Unmarshal(data, &n); err != nil {
				return info
			}

			for _, an := range n.AbstractNums {
				for _, l := range an.Lvls {
					if l.Ilvl == "0" {
						info.abstractFmt[an.AbstractNumID] = l.NumFmt.Val
					}
				}
			}
			for _, nu := range n.Nums {
				info.numToAbstract[nu.NumID] = nu.AbstractNumRef.Val
			}
		}
	}
	return info
}

func (n *numInfo) listType(numID string) string {
	if n == nil {
		return ""
	}
	absID, ok := n.numToAbstract[numID]
	if !ok {
		return "bulletList"
	}
	fmtVal, ok := n.abstractFmt[absID]
	if !ok {
		return "bulletList"
	}
	if fmtVal == "bullet" {
		return "bulletList"
	}
	return "orderedList"
}
