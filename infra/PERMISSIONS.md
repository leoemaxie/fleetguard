# FleetGuard Infra Permissions

This file lists the IAM permissions required by the CDK infrastructure in this folder.

The goal is least privilege. Where AWS-managed policies already cover the use case, this document calls that out instead of introducing a fresh custom policy.

## Summary

- The deployment/CloudFormation execution role needs broad permissions across the AWS services used by the stacks.
- Runtime roles are already split by workload and only get the access they need.
- AWS-managed policies are already used where they fit cleanly:
  - `service-role/AmazonECSTaskExecutionRolePolicy` for ECS task execution.
  - `service-role/AWSIoTLogging` for IoT Core logging.
- The remaining permissions are custom and resource-scoped because AWS does not provide a managed policy that matches this stack's exact resources.

## Consolidated Required Permissions and Policies

This is the complete at-a-glance list of permissions and policies used by the infra.

### Managed policies already in use

- `service-role/AmazonECSTaskExecutionRolePolicy` for the ECS execution role.
- `service-role/AWSIoTLogging` for the IoT logging role.

### Custom permissions and scoped policies

- Deployment/CloudFormation role:
  - `ec2` for VPC, subnet, route table, NAT gateway, security group, and flow log resources.
  - `ecr` for repository creation.
  - `rds` for Aurora Serverless v2 clusters and related database resources.
  - `elasticache` for the Redis serverless cache and subnet group.
  - `secretsmanager` for generated database secrets.
  - `iot` for topic rules and logging configuration.
  - `sqs` for queues and dead-letter queues.
  - `sns` for topics and subscriptions.
  - `s3` for buckets, lifecycle rules, CORS, and auto-delete configuration.
  - `ecs` for clusters, services, task definitions, and capacity providers.
  - `elasticloadbalancing` / `elasticloadbalancingv2` for the internal ALB and routing resources.
  - `apigateway` / `apigatewayv2` for the HTTP API.
  - `cloudfront` for the distribution and cache behaviors.
  - `logs` for CloudWatch log groups used by flow logs, IoT rule errors, and ECS tasks.
  - `iam` for roles created in the stacks and `PassRole` to attach them to ECS and IoT resources.

- ECS task execution role:
  - `secretsmanager:GetSecretValue`
  - `secretsmanager:DescribeSecret`

- API service task role:
  - `secretsmanager:GetSecretValue`
  - `secretsmanager:DescribeSecret`

- Auth service task role:
  - `secretsmanager:GetSecretValue`
  - `secretsmanager:DescribeSecret`

- WebSocket service task role:
  - `secretsmanager:GetSecretValue`
  - `secretsmanager:DescribeSecret`

- Telemetry ingest task role:
  - `secretsmanager:GetSecretValue`
  - `secretsmanager:DescribeSecret`
  - `sqs:ReceiveMessage`
  - `sqs:DeleteMessage`
  - `sqs:ChangeMessageVisibility`
  - `sqs:GetQueueAttributes`
  - `sqs:GetQueueUrl`

- Alert processing task role:
  - `secretsmanager:GetSecretValue`
  - `secretsmanager:DescribeSecret`
  - `sqs:ReceiveMessage`
  - `sqs:DeleteMessage`
  - `sqs:ChangeMessageVisibility`
  - `sqs:GetQueueAttributes`
  - `sqs:GetQueueUrl`

- AI inference task role:
  - No AWS permissions from the current CDK stack.

- Route sync task role:
  - `secretsmanager:GetSecretValue`
  - `secretsmanager:DescribeSecret`
  - `iot:Publish`

- Reporting task role:
  - `secretsmanager:GetSecretValue`
  - `secretsmanager:DescribeSecret`
  - `s3:GetObject`
  - `s3:ListBucket`
  - `s3:PutObject`

- IoT rules role:
  - `sqs:SendMessage`
  - `s3:PutObject`

### Managed policy guidance

- Keep `service-role/AmazonECSTaskExecutionRolePolicy` for ECS execution.
- Keep `service-role/AWSIoTLogging` for IoT Core logging.
- Use custom policies for the deployment role because AWS does not ship a least-privilege managed policy that matches this stack.
- Use custom policies for task roles because the needed access is tightly scoped to specific secrets, queues, buckets, or IoT topics.

## Deployment Role Permissions

This is the role that runs `cdk deploy` / CloudFormation for the infrastructure.

It needs permissions to create and update resources in:

- `ec2` for VPCs, subnets, route tables, NAT gateways, security groups, and VPC flow logs.
- `ecr` for repository creation.
- `rds` for Aurora Serverless v2 clusters, subnet groups, parameter groups, and backups.
- `elasticache` for the Redis serverless cache and subnet group.
- `secretsmanager` for the generated RDS secret.
- `iot` for topic rules and logging configuration.
- `sqs` for queues and DLQs.
- `sns` for topics and subscriptions.
- `s3` for buckets, lifecycle rules, CORS, and auto-delete configuration.
- `ecs` for the cluster, services, task definitions, and capacity providers.
- `elasticloadbalancing` / `elasticloadbalancingv2` for the internal ALB, listeners, target groups, and rules.
- `apigateway` / `apigatewayv2` for the HTTP API.
- `cloudfront` for the distribution and cache behaviors.
- `logs` for CloudWatch log groups used by flow logs, IoT rule errors, and ECS task logs.
- `iam` for roles created inside the stacks and `PassRole` to attach them to ECS and IoT resources.

AWS does not provide a single managed policy that fits this stack cleanly. A custom bootstrap/deployment policy is the right fit here.

## Runtime Roles

### ECS task execution role

Role: `fleetguard-ecs-execution-${stage}`

Already uses the AWS-managed policy:

- `service-role/AmazonECSTaskExecutionRolePolicy`

Additional permissions:

- `secretsmanager:GetSecretValue`
- `secretsmanager:DescribeSecret`

Scope:

- The RDS secret created by CDK for the Aurora cluster.

Reason:

- ECS needs the managed execution policy for ECR image pulls and CloudWatch Logs delivery.
- The secret read is needed so containers can read the database credentials at startup.

### API service task role

Role: `fleetguard-api-task-${stage}`

Permissions:

- `secretsmanager:GetSecretValue`
- `secretsmanager:DescribeSecret`

Scope:

- The RDS secret only.

### Auth service task role

Role: `fleetguard-auth-task-${stage}`

Permissions:

- `secretsmanager:GetSecretValue`
- `secretsmanager:DescribeSecret`

Scope:

- The RDS secret only.

### WebSocket service task role

Role: `fleetguard-ws-task-${stage}`

Permissions:

- `secretsmanager:GetSecretValue`
- `secretsmanager:DescribeSecret`

Scope:

- The RDS secret only.

### Telemetry ingest task role

Role: `fleetguard-telemetry-task-${stage}`

Permissions:

- `secretsmanager:GetSecretValue`
- `secretsmanager:DescribeSecret`
- `sqs:ReceiveMessage`
- `sqs:DeleteMessage`
- `sqs:ChangeMessageVisibility`
- `sqs:GetQueueAttributes`
- `sqs:GetQueueUrl`

Scope:

- `FleetGuard-TelemetryQueueUrl` / `fleetguard-telemetry-${stage}`.

Notes:

- The queue consumer access comes from `grantConsumeMessages`.
- No DLQ permissions are required for the worker itself.

### Alert processing task role

Role: `fleetguard-alert-task-${stage}`

Permissions:

- `secretsmanager:GetSecretValue`
- `secretsmanager:DescribeSecret`
- `sqs:ReceiveMessage`
- `sqs:DeleteMessage`
- `sqs:ChangeMessageVisibility`
- `sqs:GetQueueAttributes`
- `sqs:GetQueueUrl`

Scope:

- `fleetguard-alert-${stage}`.

Notes:

- The queue consumer access comes from `grantConsumeMessages`.

### AI inference task role

Role: `fleetguard-ai-task-${stage}`

Permissions:

- None from the CDK stack today.

Notes:

- The service is intentionally isolated from the database and does not get any direct AWS access in this infra definition.

### Route sync task role

Role: `fleetguard-route-sync-task-${stage}`

Permissions:

- `secretsmanager:GetSecretValue`
- `secretsmanager:DescribeSecret`
- `iot:Publish`

Scope:

- `arn:aws:iot:${region}:${account}:topic/fg/*/routes`

Notes:

- This is a custom inline policy because there is no AWS-managed policy for this exact IoT topic scope.

### Reporting task role

Role: `fleetguard-reporting-task-${stage}`

Permissions:

- `secretsmanager:GetSecretValue`
- `secretsmanager:DescribeSecret`
- `s3:GetObject`
- `s3:ListBucket`
- `s3:PutObject`

Scope:

- Read access to the raw logs bucket.
- Write access to the reports bucket.

Notes:

- `grantRead` on the raw logs bucket maps to the bucket read permissions needed by the reporting service.
- The reports bucket write access is a custom inline statement because it is limited to a single bucket prefix.

## IoT Roles

### IoT rules role

Role: `fleetguard-iot-rule-${stage}`

Permissions:

- `sqs:SendMessage` on the telemetry queue.
- `s3:PutObject` on the raw logs bucket.

Scope:

- `fleetguard-telemetry-${stage}` queue.
- `fleetguard-raw-logs-${stage}-${account}` bucket.

Notes:

- This is a custom role because the IoT Rules Engine needs exact destination permissions.

### IoT logging role

Role: `fleetguard-iot-logging-${stage}`

AWS-managed policy used:

- `service-role/AWSIoTLogging`

Notes:

- This is the correct managed policy to use for IoT Core logging.

## Managed Policy Opportunities

These are the places where an AWS-managed policy is already the best option, or where one could be used only at the cost of being too broad:

- ECS execution role: keep `service-role/AmazonECSTaskExecutionRolePolicy`.
- IoT logging role: keep `service-role/AWSIoTLogging`.
- CDK deployment role: no AWS-managed policy matches the whole stack with least privilege, so a custom deployment policy is preferable.
- Application task roles: no AWS-managed policy fits the exact queue, bucket, secret, or IoT topic scopes without overgranting access.

## Resource-to-Permission Map

- Foundation stack:
  - EC2 networking and security group creation.
  - ECR repository creation.
  - VPC Flow Logs to CloudWatch Logs.
- Data stack:
  - Aurora PostgreSQL Serverless v2.
  - ElastiCache Serverless Redis.
  - Secrets Manager for the generated DB secret.
- IoT stack:
  - IoT Core topic rules and logging.
  - SQS queues and DLQs.
  - SNS topic and SQS subscription.
  - S3 buckets for raw logs, firmware, and reports.
- Compute stack:
  - ECS cluster, services, task definitions, and task roles.
  - Internal ALB and target groups.
  - HTTP API Gateway.
  - CloudFront distribution.
