가이드: 기존(수동 생성) SQS 큐를 Terraform state로 import하고 redrive(DLQ)를 Terraform에서 관리하도록 설정하는 방법

사전조건
- 로컬에 AWS CLI 설정(자격증명, 리전)
- Terraform 설치
- 현재 작업 디렉터리는 프로젝트 루트이며 Terraform 구성은 ./terraform 폴더에 있음

예제에서 사용한 값(당신 환경):
- 리전: ap-northeast-2
- 메인 큐 URL: https://sqs.ap-northeast-2.amazonaws.com/248189914600/rag-indexing-queue
- (디폴트 변수) dlq_name: gaekdam-docs-dlq

1) terraform 디렉터리로 이동 및 초기화

```bash
cd terraform
terraform init
```

2) (선택) 현재 Terraform에 정의된 리소스 리스트 확인

```bash
# main.tf 에 aws_sqs_queue.main 과 aws_sqs_queue.dlq 가 선언되어 있는지 확인
sed -n '1,200p' main.tf
```

3) 메인 큐를 Terraform state로 import

```bash
# MAIN_QUEUE_URL 은 실제 메인 큐 URL 로 바꿔서 실행
MAIN_QUEUE_URL="https://sqs.ap-northeast-2.amazonaws.com/248189914600/rag-indexing-queue"
terraform import aws_sqs_queue.main "$MAIN_QUEUE_URL"
```

4) DLQ(이미 존재하면)를 import
- DLQ가 이미 존재하는지 확인하려면 큐 이름으로 URL 조회

```bash
aws sqs get-queue-url --queue-name gaekdam-docs-dlq --region ap-northeast-2
# 출력 예: https://sqs.ap-northeast-2.amazonaws.com/248189914600/gaekdam-docs-dlq
```

- DLQ URL 을 얻었으면 import

```bash
DLQ_URL="https://sqs.ap-northeast-2.amazonaws.com/248189914600/gaekdam-docs-dlq"
terraform import aws_sqs_queue.dlq "$DLQ_URL"
```

참고: DLQ가 없으면 생성 후 import 하거나 Terraform에서 DLQ 리소스를 먼저 적용(apply)해도 됩니다.

5) import 결과 확인

```bash
terraform state list
terraform state show aws_sqs_queue.main
terraform state show aws_sqs_queue.dlq
```

6) Terraform plan 실행 (변수 지정)
- bucket_name 등 필요한 변수를 실제 값으로 전달

```bash
terraform plan -var="bucket_name=your-unique-bucket-name" -var="queue_name=rag-indexing-queue" -var="dlq_name=gaekdam-docs-dlq"
```

- plan 결과에서 Terraform이 메인 큐에 `redrive_policy`(DLQ 연결)를 추가 또는 변경하려는지 확인하세요.

7) 변경 적용

```bash
terraform apply -var="bucket_name=your-unique-bucket-name" -var="queue_name=rag-indexing-queue" -var="dlq_name=gaekdam-docs-dlq"
```

적용 이후 확인

```bash
# 메인 큐의 RedrivePolicy 확인
aws sqs get-queue-attributes --queue-url "$MAIN_QUEUE_URL" --attribute-names RedrivePolicy --region ap-northeast-2
```

중요 유의사항
- terraform import는 리소스를 state에 등록만 합니다. import 후 `terraform plan`을 꼭 확인하세요. 코드(main.tf)와 실제 리소스(이름/속성)가 다르면 apply 시 변경이 발생할 수 있습니다.
- 만약 Terraform 코드의 `name` 값이 실제 큐 이름과 다르면, variables.tf 또는 main.tf에서 name을 실제 이름으로 맞추고 import 하거나 apply 전에 코드 조정하세요.
- 팀으로 작업하면 Terraform 원격 상태(S3 backend + DynamoDB lock) 사용 권장.
- 필요한 IAM 권한: sqs:GetQueueUrl, sqs:GetQueueAttributes, sqs:SetQueueAttributes, sqs:CreateQueue 등

도움이 필요하면 현재 메인 큐 URL과(이미 제공하신 URL 사용 가능) DLQ 존재 여부를 확인해서 제가 import 명령을 직접 실행할 수 있도록 정확한 스크립트로 만들어 드리겠습니다.
