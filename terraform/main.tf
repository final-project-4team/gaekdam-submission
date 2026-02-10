terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

# S3 bucket for uploads and snapshots
resource "aws_s3_bucket" "uploads" {
  bucket = var.bucket_name
  acl    = "private"

  versioning {
    enabled = true
  }

  lifecycle_rule {
    id      = "cleanup-old-uploads"
    enabled = true
    prefix  = "uploads/"

    expiration {
      days = 30
    }

    noncurrent_version_expiration {
      days = 60
    }

    abort_incomplete_multipart_upload_days = 7
  }

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST", "GET", "HEAD"]
    allowed_origins = ["https://your.frontend.domain"]
    max_age_seconds = 3000
  }
}

# Dead-letter queue
resource "aws_sqs_queue" "dlq" {
  name = var.dlq_name
}

# Main processing queue with DLQ redrive
resource "aws_sqs_queue" "main" {
  name                      = var.queue_name
  visibility_timeout_seconds = 300
  message_retention_seconds  = 1209600
  redrive_policy            = jsonencode({ deadLetterTargetArn = aws_sqs_queue.dlq.arn, maxReceiveCount = 5 })
}

# IAM policy for presign service (put to uploads/*)
data "aws_iam_policy_document" "presign" {
  statement {
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:PutObjectAcl"
    ]
    resources = ["arn:aws:s3:::${var.bucket_name}/uploads/*"]
  }
}

resource "aws_iam_policy" "presign_policy" {
  name   = "gaekdam-presign-policy"
  policy = data.aws_iam_policy_document.presign.json
}

# IAM policy for worker (get object + SQS receive/delete)
data "aws_iam_policy_document" "worker" {
  statement {
    effect = "Allow"
    actions = ["s3:GetObject"]
    resources = ["arn:aws:s3:::${var.bucket_name}/*"]
  }
  statement {
    effect = "Allow"
    actions = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"]
    resources = [aws_sqs_queue.main.arn]
  }
}

resource "aws_iam_policy" "worker_policy" {
  name   = "gaekdam-worker-policy"
  policy = data.aws_iam_policy_document.worker.json
}
