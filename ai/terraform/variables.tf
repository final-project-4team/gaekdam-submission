variable "region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-2"
}

variable "bucket_name" {
  description = "S3 bucket name to create"
  type        = string
  default     = "gaekdam-ai-bot-bucket"
}

variable "queue_name" {
  description = "SQS queue name"
  type        = string
  default     = "rag-indexing-queue"
}

variable "dlq_name" {
  description = "SQS dead-letter queue name"
  type        = string
  default     = "rag-indexing-dlq"
}
