param(
    [string]$Stage = "staging"
)

# Get AWS Account ID
$AccountId = (aws sts get-caller-identity --query Account --output text).Trim()
$Region = "af-south-1"

if (-not $AccountId) {
    Write-Error "Failed to retrieve AWS Account ID. Make sure you are authenticated."
    exit 1
}

$EcrUri = "${AccountId}.dkr.ecr.${Region}.amazonaws.com"

Write-Host "Logging in to AWS ECR at ${EcrUri}..."
aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $EcrUri

Write-Host "Building backend Docker image..."
cd ../backend
docker build -t fleetguard-backend .
cd ../infra

$Services = @("api-gateway", "auth", "websocket", "telemetry-ingest", "alert-processing", "route-sync", "reporting")

foreach ($Service in $Services) {
    $RepoName = "fleetguard/${Service}"
    $ImageUri = "${EcrUri}/${RepoName}:latest"
    
    Write-Host "Tagging and pushing image for ${Service}..."
    docker tag fleetguard-backend $ImageUri
    docker push $ImageUri
}

Write-Host "Deploying CDK FleetGuard-Compute stack for stage: ${Stage}..."
npx cdk deploy FleetGuard-Compute -c stage=$Stage --require-approval never

Write-Host "Deployment completed."
