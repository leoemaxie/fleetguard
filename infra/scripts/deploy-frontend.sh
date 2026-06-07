#!/bin/bash
set -e

STAGE=${1:-staging}
REGION="af-south-1"

# Get AWS Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

if [ -z "$ACCOUNT_ID" ]; then
    echo "Failed to retrieve AWS Account ID. Make sure you are authenticated."
    exit 1
fi

ECR_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

echo "Logging in to AWS ECR at ${ECR_URI}..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_URI

echo "Building frontend Docker image for linux/amd64..."
cd ../frontend
# Target linux/amd64 to ensure compatibility with Fargate if building on ARM machines
docker build --platform linux/amd64 -t fleetguard-frontend .
cd ../infra

REPO_NAME="fleetguard/frontend"
IMAGE_URI="${ECR_URI}/${REPO_NAME}:latest"

echo "Tagging and pushing image for frontend..."
docker tag fleetguard-frontend $IMAGE_URI
docker push $IMAGE_URI

echo "Deploying CDK FleetGuard-Compute stack for stage: ${STAGE}..."
npx cdk deploy FleetGuard-Compute -c stage=$STAGE --require-approval never

echo "Triggering ECS force new deployment to immediately pull the latest image..."
aws ecs update-service \
    --cluster fleetguard-${STAGE} \
    --service fleetguard-frontend-${STAGE} \
    --force-new-deployment \
    --region $REGION > /dev/null

echo "Frontend deployment completed."
