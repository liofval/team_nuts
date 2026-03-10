package handler

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"press-release-editor/httputil"

	aws "github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
)

type presignRequest struct {
	FileName    string `json:"fileName"`
	ContentType string `json:"contentType"`
}

type presignResponse struct {
	URL       string `json:"url"`
	Key       string `json:"key"`
	ObjectURL string `json:"objectUrl"`
}

// S3PresignHandler はクライアントに対して PUT 用のプリサインURLを返す
// POST /s3/presign
func S3PresignHandler(w http.ResponseWriter, r *http.Request) {
	var reqBody presignRequest
	if err := json.NewDecoder(r.Body).Decode(&reqBody); err != nil {
		httputil.RespondWithError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	log.Printf("S3PresignHandler: request received fileName=%s contentType=%s", reqBody.FileName, reqBody.ContentType)

	bucket := os.Getenv("AWS_S3_BUCKET")
	region := os.Getenv("AWS_REGION")
	accessKey := os.Getenv("AWS_ACCESS_KEY_ID")
	secretKey := os.Getenv("AWS_SECRET_ACCESS_KEY")
	if bucket == "" || region == "" || accessKey == "" || secretKey == "" {
		log.Printf("S3PresignHandler: missing AWS envs: AWS_S3_BUCKET=%q AWS_REGION=%q AWS_ACCESS_KEY_ID=%q", bucket, region, accessKey)
		httputil.RespondWithError(w, http.StatusInternalServerError, "CONFIG_ERROR", "S3 bucket/region or credentials not configured")
		return
	}

	// create AWS session using v1 SDK
	creds := credentials.NewStaticCredentials(accessKey, secretKey, "")
	sess, err := session.NewSession(aws.NewConfig().WithRegion(region).WithCredentials(creds))
	if err != nil {
		log.Printf("S3PresignHandler: failed to create aws session: %v", err)
		httputil.RespondWithError(w, http.StatusInternalServerError, "AWS_CONFIG_ERROR", "failed to create aws session")
		return
	}

	svc := s3.New(sess)

	key := fmt.Sprintf("uploads/%d_%s", time.Now().UnixNano(), reqBody.FileName)

	// Do not include ContentType in PutObjectInput so the presign does not
	// require the client to send a specific Content-Type header during PUT.
	// This avoids preflight signature mismatches in browsers.
	input := &s3.PutObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	}

	req, _ := svc.PutObjectRequest(input)
	// Presign for 15 minutes
	urlStr, err := req.Presign(15 * time.Minute)
	if err != nil {
		log.Printf("S3PresignHandler: presign error: %v", err)
		httputil.RespondWithError(w, http.StatusInternalServerError, "PRESIGN_FAILED", "failed to generate presign url")
		return
	}

	objectURL := fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", bucket, region, key)
	log.Printf("S3PresignHandler: presign generated key=%s objectUrl=%s", key, objectURL)

	httputil.RespondWithJSON(w, http.StatusOK, presignResponse{
		URL:       urlStr,
		Key:       key,
		ObjectURL: objectURL,
	})
}
