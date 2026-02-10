output "s3_bucket" {
  value = aws_s3_bucket.uploads.id
}

output "sqs_queue_url" {
  value = aws_sqs_queue.main.id
}

output "sqs_queue_arn" {
  value = aws_sqs_queue.main.arn
}

output "dlq_arn" {
  value = aws_sqs_queue.dlq.arn
}

output "presign_policy_arn" {
  value = aws_iam_policy.presign_policy.arn
}

output "worker_policy_arn" {
  value = aws_iam_policy.worker_policy.arn
}
