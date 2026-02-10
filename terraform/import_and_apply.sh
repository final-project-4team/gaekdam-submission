#!/usr/bin/env bash
# -*- coding: utf-8 -*-
# terraform/import_and_apply.sh
# 설명:
#  - 기존에 수동으로 생성된 SQS 큐(메인 큐와 DLQ)를 Terraform state로 import
#  - Terraform plan 을 실행하여 적용할 변경사항을 확인한 뒤 사용자가 승인하면 apply 수행
#  - 안전을 위해 자동 apply 는 환경변수 AUTO_APPROVE=1 로 설정해야 동작합니다.
# 사용법 예:
#   REGION=ap-northeast-2 QUEUE_NAME=rag-indexing-queue DLQ_NAME=rag-indexing-dlq \
#     BUCKET_NAME=gaekdam-ai-bot-bucket ./terraform/import_and_apply.sh

set -euo pipefail
IFS=$'\n\t'

# 기본값(필요시 환경변수로 덮어쓰기)
REGION="${REGION:-ap-northeast-2}"
QUEUE_NAME="${QUEUE_NAME:-rag-indexing-queue}"
DLQ_NAME="${DLQ_NAME:-rag-indexing-dlq}"
BUCKET_NAME="${BUCKET_NAME:-gaekdam-ai-bot-bucket}"
AUTO_APPROVE="${AUTO_APPROVE:-0}"

echo "[INFO] 실행 환경: REGION=$REGION, QUEUE_NAME=$QUEUE_NAME, DLQ_NAME=$DLQ_NAME, BUCKET_NAME=$BUCKET_NAME"

# terraform 디렉토리로 이동
cd "$(dirname "$0")" || exit 1
# 스크립트 위치는 terraform/ 이므로 상위가 프로젝트 루트
cd .

echo "[INFO] terraform 초기화 진행"
terraform init -input=false

# 메인 큐 URL 얻기 (QUEUE_NAME 으로 조회)
if [ -n "${MAIN_QUEUE_URL:-}" ]; then
  MAIN_URL="$MAIN_QUEUE_URL"
  echo "[INFO] MAIN_QUEUE_URL 환경변수 사용: $MAIN_URL"
else
  echo "[INFO] AWS CLI로 메인 큐 URL 조회: queue name = $QUEUE_NAME"
  MAIN_URL=$(aws sqs get-queue-url --queue-name "$QUEUE_NAME" --region "$REGION" --output text 2>/dev/null || true)
  if [ -z "$MAIN_URL" ]; then
    echo "[ERROR] 메인 큐 URL을 찾을 수 없습니다. MAIN_QUEUE_URL 환경변수로 지정하거나 AWS 권한/이름을 확인하세요."
    exit 1
  fi
  echo "[INFO] 메인 큐 URL: $MAIN_URL"
fi

# DLQ URL 얻기
if [ -n "${DLQ_QUEUE_URL:-}" ]; then
  DLQ_URL="$DLQ_QUEUE_URL"
  echo "[INFO] DLQ_QUEUE_URL 환경변수 사용: $DLQ_URL"
else
  echo "[INFO] AWS CLI로 DLQ URL 조회: queue name = $DLQ_NAME"
  DLQ_URL=$(aws sqs get-queue-url --queue-name "$DLQ_NAME" --region "$REGION" --output text 2>/dev/null || true)
  if [ -z "$DLQ_URL" ]; then
    echo "[ERROR] DLQ URL을 찾을 수 없습니다. DLQ가 존재하는지 확인하거나 DLQ_QUEUE_URL 환경변수로 지정하세요."
    exit 1
  fi
  echo "[INFO] DLQ URL: $DLQ_URL"
fi

# import 대상 리소스 주소
MAIN_RESOURCE="aws_sqs_queue.main"
DLQ_RESOURCE="aws_sqs_queue.dlq"

echo "[INFO] Terraform import 시작(리소스: $DLQ_RESOURCE <- $DLQ_URL)"
terraform import -input=false "$DLQ_RESOURCE" "$DLQ_URL"

echo "[INFO] Terraform import 시작(리소스: $MAIN_RESOURCE <- $MAIN_URL)"
terraform import -input=false "$MAIN_RESOURCE" "$MAIN_URL"

echo "[INFO] import 완료. 현재 state 목록:" 
terraform state list

# plan 실행
echo "[INFO] terraform plan 실행 (변수: bucket_name=$BUCKET_NAME, queue_name=$QUEUE_NAME, dlq_name=$DLQ_NAME)"
terraform plan -var="bucket_name=$BUCKET_NAME" -var="queue_name=$QUEUE_NAME" -var="dlq_name=$DLQ_NAME" -var="region=$REGION"

if [ "$AUTO_APPROVE" = "1" ]; then
  echo "[INFO] AUTO_APPROVE=1 이 설정되어 있습니다. terraform apply 자동 실행합니다."
  terraform apply -auto-approve -var="bucket_name=$BUCKET_NAME" -var="queue_name=$QUEUE_NAME" -var="dlq_name=$DLQ_NAME" -var="region=$REGION"
  echo "[INFO] terraform apply 완료"
  exit 0
fi

read -r -p "terraform apply 를 실행하시겠습니까? (y/N): " confirm
if [[ "$confirm" =~ ^[Yy]$ ]]; then
  terraform apply -var="bucket_name=$BUCKET_NAME" -var="queue_name=$QUEUE_NAME" -var="dlq_name=$DLQ_NAME" -var="region=$REGION"
  echo "[INFO] terraform apply 완료"
else
  echo "[INFO] 사용자가 apply 취소함. 필요한 경우 plan 결과 검토 후 수동으로 apply 하세요."
fi

# 마무리: RedrivePolicy 확인 안내
echo "[INFO] apply 후 RedrivePolicy 확인 명령 예:"
echo "aws sqs get-queue-attributes --queue-url \"$MAIN_URL\" --attribute-names RedrivePolicy --region $REGION"

exit 0
