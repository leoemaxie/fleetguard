#!/bin/bash
set -e

STAGE=${1:-staging}
REGION="eu-west-1"

# Get AWS Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

if [ -z "$ACCOUNT_ID" ]; then
    echo "Failed to retrieve AWS Account ID. Make sure you are authenticated."
    exit 1
fi

ECR_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

echo "Logging in to AWS ECR at ${ECR_URI}..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_URI

echo "Building backend Docker image..."
cd ../backend
docker build -t fleetguard-backend .
cd ../infra

SERVICES=("api-gateway" "auth" "websocket" "telemetry-ingest" "alert-processing" "route-sync" "reporting")

for SERVICE in "${SERVICES[@]}"; do
    REPO_NAME="fleetguard/${SERVICE}"
    IMAGE_URI="${ECR_URI}/${REPO_NAME}:latest"
    
    echo "Tagging and pushing image for ${SERVICE}..."
    docker tag fleetguard-backend $IMAGE_URI
    docker push $IMAGE_URI
done

echo "Deploying CDK FleetGuard-Compute stack for stage: ${STAGE}..."
npx cdk deploy FleetGuard-Compute -c stage=$STAGE --require-approval never

echo "Deployment completed."
